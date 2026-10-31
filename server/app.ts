import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import * as engine from '../src/core/engine.ts';
import { withActor, withIdSeed } from '../src/core/runtime.ts';
import type { SaberCommerceState } from '../src/core/types.ts';
import { createInitialSeedState } from '../src/core/seed.ts';
import { csrfHeader, hashPassword, requireAuth, requireRole, sessionLoader, setSessionCookie, signSession, verifyPassword, COOKIE, type AuthUser } from './auth.ts';
import type { Config } from './config.ts';
import type { Db, Query } from './db.ts';
import { ACTIONS, Forbidden, assertSaneNumbers, type ActionCtx } from './permissions.ts';

const wrap = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler => (req, res, next) => { fn(req, res).catch(next); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MIN_PASSWORD = 10;
const MAX_FILE = 3 * 1024 * 1024;

class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly code = 'error') { super(message); }
}

/** Real content check by magic bytes (the declared MIME type alone proves nothing). */
function sniffMime(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (b.length > 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
}

const loginSchema = z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(200) });
const stepSchema = z.object({ fn: z.string().min(1).max(80), input: z.record(z.string(), z.any()).default({}), seed: z.string().regex(/^[a-z0-9]{4,24}$/).optional() });
const actionSchema = z.object({ steps: z.array(stepSchema).min(1).max(5), idempotencyKey: z.string().min(8).max(100) });
const userCreateSchema = z.object({
  username: z.string().regex(/^[a-z0-9._-]{3,40}$/i), fullName: z.string().min(2).max(120),
  role: z.enum(['agent', 'retailer']), entityId: z.string().min(1).max(80), password: z.string().min(MIN_PASSWORD).max(200),
});
const userPatchSchema = z.object({ active: z.boolean().optional(), password: z.string().min(MIN_PASSWORD).max(200).optional(), fullName: z.string().min(2).max(120).optional() });
const changePasswordSchema = z.object({ current: z.string().min(1).max(200), next: z.string().min(MIN_PASSWORD).max(200) });
const uploadSchema = z.object({ filename: z.string().min(1).max(200), dataBase64: z.string().min(10) });
const publicOrderSchema = z.object({
  customerName: z.string().min(2).max(120), customerMobile: z.string().min(10).max(16), province: z.string().min(2).max(60), city: z.string().min(2).max(60),
  deliveryAddress: z.string().min(5).max(500), postalCode: z.string().min(10).max(10), deliveryInstructions: z.string().max(500).optional(),
  productId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(500), referralCode: z.string().max(40).optional(), source: z.enum(['qr_packaging', 'direct_web', 'agent_referral']).optional(),
  idempotencyKey: z.string().min(8).max(100),
});
const publicRetailerSchema = z.object({
  storeName: z.string().min(2).max(120), ownerName: z.string().min(2).max(120), mobile: z.string().min(10).max(16), address: z.string().min(5).max(500),
  province: z.string().min(2).max(60), city: z.string().min(2).max(60), district: z.string().max(120).default(''), postalCode: z.string().max(10).default(''),
  referralCode: z.string().max(40).optional(),
});

export function createApp(cfg: Config, db: Db) {
  const app = express();
  app.disable('x-powered-by');
  if (cfg.trustProxy) app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: cfg.env === 'production' ? {
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'], connectSrc: ["'self'"], workerSrc: ["'self'"], manifestSrc: ["'self'"], objectSrc: ["'none'"],
        frameAncestors: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"],
      },
    } : false,
  }));
  app.use(express.json({ limit: '5mb' }));
  app.use(sessionLoader(cfg, db));

  const api = express.Router();
  const q: Query = db.query;
  const limiter = (windowMs: number, limit: number) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, skip: () => cfg.env === 'test', message: { error: 'درخواست‌های بیش از حد؛ کمی بعد دوباره تلاش کنید.', code: 'rate_limited' } });

  const audit = (user: Pick<AuthUser, 'id' | 'username'> | null | undefined, action: string, entity?: string, entityId?: string, detail?: unknown, query: Query = q) =>
    query(`INSERT INTO audit_logs (user_id, username, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5,$6)`,
      [user?.id ?? null, user?.username ?? null, action, entity ?? null, entityId ?? null, detail === undefined ? null : JSON.stringify(detail).slice(0, 2000)]);

  /** Runs fn on the authoritative ledger inside one transaction holding a row lock (no lost updates, no negative stock races). */
  async function mutate<T>(fn: (state: SaberCommerceState, q: Query) => Promise<{ next: SaberCommerceState; out: T }> | { next: SaberCommerceState; out: T }): Promise<T> {
    return db.tx(async (tq) => {
      const rows = await tq('SELECT version, state FROM ledger_state WHERE id = 1 FOR UPDATE');
      if (!rows[0]) throw new HttpError(503, 'دفتر کل مقداردهی نشده است.', 'not_initialised');
      const state = engine.normalizeState(typeof rows[0].state === 'string' ? JSON.parse(rows[0].state) : rows[0].state);
      const { next, out } = await fn(state, tq);
      if (next !== state) {
        await tq('UPDATE ledger_state SET version = $1, state = $2::jsonb, updated_at = now() WHERE id = 1', [next.version, JSON.stringify(next)]);
      }
      return out;
    });
  }

  async function readState(): Promise<SaberCommerceState> {
    const rows = await q('SELECT state FROM ledger_state WHERE id = 1');
    if (!rows[0]) throw new HttpError(503, 'دفتر کل مقداردهی نشده است.', 'not_initialised');
    return engine.normalizeState(typeof rows[0].state === 'string' ? JSON.parse(rows[0].state) : rows[0].state);
  }

  /** Adds the real public tracking counters (QR scans, referral visits, ...) on top of the stored baseline for the administrator. */
  async function withPublicCounters(s: SaberCommerceState): Promise<SaberCommerceState> {
    const ev = await q(`SELECT kind, code, count(*)::int AS n FROM public_events GROUP BY kind, code`);
    const n = (kind: string, code: string) => ev.filter((e) => e.kind === kind && String(e.code).toLowerCase() === code.toLowerCase()).reduce((a, e) => a + e.n, 0);
    return {
      ...s,
      qrLogs: s.qrLogs.map((l) => ({
        ...l,
        scansCount: l.scansCount + (l.type === 'product_packaging_qr' ? n('qr_scan', l.code) : n('referral_visit', l.code.replace('/ref/', ''))),
        pageViewsCount: l.pageViewsCount + (l.type === 'product_packaging_qr' ? n('product_view', l.code) : 0),
        retailerRegistrationsCount: l.retailerRegistrationsCount + (l.type === 'agent_referral_link' ? n('retailer_request', l.code.replace('/ref/', '')) : 0),
        b2cOrdersCount: l.b2cOrdersCount + (l.type === 'agent_referral_link' ? n('b2c_order', l.code.replace('/ref/', '')) : 0),
      })),
    };
  }

  const scoped = async (state: SaberCommerceState, user: AuthUser) => {
    const view = engine.getScopedStateForRole(state, user.role, user.entity_id ?? '');
    return user.role === 'admin' ? withPublicCounters(view) : view;
  };

  // ---------------------------------------------------------------- health
  app.get('/healthz', wrap(async (_req, res) => {
    const rows = await q('SELECT version FROM ledger_state WHERE id = 1');
    res.json({ ok: true, db: db.kind, ledgerVersion: rows[0]?.version ?? null });
  }));

  // ---------------------------------------------------------------- auth
  api.post('/auth/login', limiter(15 * 60_000, 40), csrfHeader, wrap(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const rows = await q('SELECT * FROM users WHERE username = $1', [username.trim().toLowerCase()]);
    const u = rows[0];
    const fail = () => { throw new HttpError(401, 'نام کاربری یا گذرواژه نادرست است.', 'bad_credentials'); };
    if (!u) { await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '=='); return fail(); }
    if (!u.active) return fail();
    if (u.locked_until && new Date(u.locked_until).getTime() > Date.now()) throw new HttpError(429, 'حساب به‌دلیل تلاش‌های ناموفق موقتاً قفل شده است؛ بعداً تلاش کنید.', 'locked');
    if (!(await verifyPassword(password, u.password_hash))) {
      await q(`UPDATE users SET failed_logins = failed_logins + 1, locked_until = CASE WHEN failed_logins + 1 >= 5 THEN now() + interval '10 minutes' ELSE locked_until END WHERE id = $1`, [u.id]);
      await audit({ id: u.id, username: u.username }, 'LOGIN_FAILED');
      return fail();
    }
    await q('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [u.id]);
    const { token, maxAgeMs } = signSession(cfg, { id: u.id, token_version: u.token_version });
    setSessionCookie(res, cfg, token, maxAgeMs);
    await audit({ id: u.id, username: u.username }, 'LOGIN');
    res.json({ user: { username: u.username, fullName: u.full_name, role: u.role, entityId: u.entity_id } });
  }));

  api.post('/auth/logout', csrfHeader, (req, res) => {
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  // 200 with user:null when nobody is signed in (a normal state for the public storefront, not an error)
  api.get('/auth/me', (req, res) => {
    const u = req.user;
    res.json({ user: u ? { username: u.username, fullName: u.full_name, role: u.role, entityId: u.entity_id } : null });
  });

  api.post('/auth/password', requireAuth, csrfHeader, wrap(async (req, res) => {
    const { current, next } = changePasswordSchema.parse(req.body);
    const u = req.user!;
    const rows = await q('SELECT password_hash FROM users WHERE id = $1', [u.id]);
    if (!(await verifyPassword(current, rows[0].password_hash))) throw new HttpError(400, 'گذرواژهٔ فعلی نادرست است.', 'bad_password');
    await q('UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2', [await hashPassword(next), u.id]);
    await audit(u, 'PASSWORD_CHANGED');
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
  }));

  // ---------------------------------------------------------------- ledger
  api.get('/state', requireAuth, wrap(async (req, res) => {
    const state = await readState();
    res.json({ state: await scoped(state, req.user!), demo: cfg.seedDemo });
  }));

  api.post('/action', requireAuth, csrfHeader, limiter(60_000, 120), wrap(async (req, res) => {
    const user = req.user!;
    const body = actionSchema.parse(req.body);
    for (const step of body.steps) {
      const rule = ACTIONS[step.fn];
      if (!rule || typeof (engine as Record<string, unknown>)[step.fn] !== 'function') throw new HttpError(404, 'عملیات ناشناخته است.', 'unknown_action');
      if (!rule.roles.includes(user.role)) throw new HttpError(403, 'این عملیات برای نقش شما مجاز نیست.', 'forbidden');
      assertSaneNumbers(step.input);
    }

    type ActionOut = { duplicate: boolean; results: unknown[] };
    // all steps run in ONE transaction on the locked ledger: either every step applies or none does
    const outcome = await mutate<ActionOut>(async (state, tq) => {
      const dup = await tq('SELECT 1 FROM action_keys WHERE user_key = $1 AND key = $2', [user.id, body.idempotencyKey]);
      if (dup.length) return { next: state, out: { duplicate: true, results: [] } };
      let current = state;
      const results: unknown[] = [];
      for (const [idx, step] of body.steps.entries()) {
        const rule = ACTIONS[step.fn];
        const fnImpl = (engine as Record<string, unknown>)[step.fn] as (s: SaberCommerceState, i: unknown) => unknown;
        const ctx: ActionCtx = { role: user.role, entityId: user.entity_id, state: current };
        try { rule.check?.(ctx, step.input); } catch (e) { if (e instanceof Forbidden) throw new HttpError(403, e.message, 'forbidden'); throw e; }
        let input = rule.prepare ? rule.prepare(ctx, step.input) : step.input;
        if (['submitAndVerifyRetailerSalesReport', 'submitRetailerPayment', 'createB2cOrderWithSimulatedPayment'].includes(step.fn)) input = { ...input, idempotencyKey: `${user.id}:${body.idempotencyKey}:${idx}` };
        const run = () => withActor({ role: user.role, name: user.full_name, entityId: user.entity_id ?? undefined }, () => fnImpl(current, input));
        const ret = step.seed ? withIdSeed(step.seed, run) : run();
        const isPair = ret && typeof ret === 'object' && 'nextState' in (ret as object);
        current = (isPair ? (ret as { nextState: SaberCommerceState }).nextState : ret) as SaberCommerceState;
        results.push(isPair ? { ...(ret as object), nextState: undefined } : null);
        await audit(user, `ACTION:${step.fn}`, undefined, undefined, undefined, tq);
      }
      await tq('INSERT INTO action_keys (user_key, key) VALUES ($1,$2)', [user.id, body.idempotencyKey]);
      return { next: current, out: { duplicate: false, results } };
    });
    const state = await readState();
    res.json({ state: await scoped(state, user), results: outcome.results, result: outcome.results[outcome.results.length - 1] ?? null, duplicate: outcome.duplicate });
  }));

  // ---------------------------------------------------------------- documents (private files)
  api.post('/documents/:id/attachments', requireAuth, csrfHeader, limiter(60_000, 30), wrap(async (req, res) => {
    const user = req.user!;
    const { filename, dataBase64 } = uploadSchema.parse(req.body);
    const bytes = Buffer.from(dataBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (bytes.length < 50 || bytes.length > MAX_FILE) throw new HttpError(400, 'حجم فایل باید کمتر از ۳ مگابایت باشد.', 'file_size');
    const mime = sniffMime(bytes);
    if (!mime) throw new HttpError(400, 'فقط تصویر JPG/PNG/WebP یا PDF معتبر پذیرفته می‌شود (محتوای فایل بررسی شد).', 'file_type');
    const docId = String(req.params.id);
    const sha = crypto.createHash('sha256').update(bytes).digest('hex');
    const attachmentId = `att-${crypto.randomUUID()}`;
    await mutate(async (state, tq) => {
      const doc = state.documents.find((d) => d.id === docId);
      if (!doc) throw new HttpError(404, 'سند یافت نشد.', 'not_found');
      const scopedDocs = engine.getScopedStateForRole(state, user.role, user.entity_id ?? '').documents;
      if (!scopedDocs.some((d) => d.id === docId)) throw new HttpError(404, 'سند یافت نشد.', 'not_found');
      if (doc.verificationStatus === 'verified') throw new HttpError(409, 'سند تأییدشده قابل تغییر نیست.', 'locked');
      const version = doc.attachments.length + 1;
      await tq(`INSERT INTO attachments (id, document_id, filename, mime_type, size_bytes, sha256, version, uploaded_by, bytes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [attachmentId, docId, filename.slice(0, 200), mime, bytes.length, sha, version, user.username, bytes]);
      const next = withActor({ role: user.role, name: user.full_name, entityId: user.entity_id ?? undefined }, () =>
        engine.uploadSignedDocumentAttachment(state, { documentId: docId, filename, mimeType: mime, sizeBytes: bytes.length, uploadedBy: user.full_name, attachmentId, checksumSha256: sha, storageKey: `db://attachments/${attachmentId}` }));
      await audit(user, 'UPLOAD_ATTACHMENT', 'document', docId, { sha, size: bytes.length }, tq);
      return { next, out: null };
    });
    res.json({ state: await scoped(await readState(), user), attachmentId, sha256: sha });
  }));

  api.get('/attachments/:id', requireAuth, wrap(async (req, res) => {
    const user = req.user!;
    const rows = await q('SELECT document_id, filename, mime_type, bytes FROM attachments WHERE id = $1', [String(req.params.id)]);
    const a = rows[0];
    if (!a) throw new HttpError(404, 'پیوست یافت نشد.', 'not_found');
    const state = await readState();
    const docs = engine.getScopedStateForRole(state, user.role, user.entity_id ?? '').documents;
    if (!docs.some((d) => d.id === a.document_id)) throw new HttpError(404, 'پیوست یافت نشد.', 'not_found');
    res.setHeader('Content-Type', a.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="attachment-${String(req.params.id).slice(-8)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(a.bytes));
  }));

  // ---------------------------------------------------------------- administration
  api.get('/admin/users', requireRole('admin'), wrap(async (_req, res) => {
    const rows = await q(`SELECT id, username, full_name, role, entity_id, active, to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at FROM users ORDER BY role, username`);
    res.json({ users: rows });
  }));

  api.post('/admin/users', requireRole('admin'), csrfHeader, wrap(async (req, res) => {
    const body = userCreateSchema.parse(req.body);
    const state = await readState();
    const exists = body.role === 'agent' ? state.agents.some((a) => a.id === body.entityId) : state.retailers.some((r) => r.id === body.entityId);
    if (!exists) throw new HttpError(400, 'شناسهٔ بازاریاب/فروشگاه در دفتر کل وجود ندارد.', 'bad_entity');
    try {
      const rows = await q(`INSERT INTO users (username, password_hash, full_name, role, entity_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [body.username.toLowerCase(), await hashPassword(body.password), body.fullName, body.role, body.entityId]);
      await audit(req.user, 'USER_CREATED', 'user', rows[0].id, { role: body.role, entityId: body.entityId });
      res.status(201).json({ id: rows[0].id });
    } catch (e: any) {
      if (String(e?.message).includes('duplicate key')) throw new HttpError(409, 'این نام کاربری یا این موجودیت قبلاً حساب دارد.', 'duplicate');
      throw e;
    }
  }));

  api.patch('/admin/users/:id', requireRole('admin'), csrfHeader, wrap(async (req, res) => {
    const id = String(req.params.id);
    if (!UUID.test(id)) throw new HttpError(404, 'کاربر یافت نشد.', 'not_found');
    const b = userPatchSchema.parse(req.body);
    const rows = await q('SELECT id, role FROM users WHERE id = $1', [id]);
    if (!rows[0]) throw new HttpError(404, 'کاربر یافت نشد.', 'not_found');
    if (id === req.user!.id && b.active === false) throw new HttpError(400, 'نمی‌توانید حساب خودتان را غیرفعال کنید.', 'self_disable');
    if (b.active !== undefined) await q('UPDATE users SET active = $1, token_version = token_version + 1 WHERE id = $2', [b.active, id]);
    if (b.password) await q('UPDATE users SET password_hash = $1, token_version = token_version + 1, failed_logins = 0, locked_until = NULL WHERE id = $2', [await hashPassword(b.password), id]);
    if (b.fullName) await q('UPDATE users SET full_name = $1 WHERE id = $2', [b.fullName, id]);
    await audit(req.user, 'USER_UPDATED', 'user', id, { active: b.active, passwordReset: Boolean(b.password) });
    res.json({ ok: true });
  }));

  api.get('/admin/audit', requireRole('admin'), wrap(async (_req, res) => {
    const rows = await q(`SELECT to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at, username, action, entity, entity_id FROM audit_logs ORDER BY id DESC LIMIT 200`);
    res.json({ entries: rows });
  }));

  api.post('/admin/reset-demo', requireRole('admin'), csrfHeader, wrap(async (req, res) => {
    if (!cfg.seedDemo) throw new HttpError(403, 'بازنشانی فقط در نمونهٔ دمو مجاز است.', 'not_demo');
    await mutate(() => ({ next: createInitialSeedState() as SaberCommerceState, out: null }));
    await q('DELETE FROM attachments');
    await q('DELETE FROM public_events');
    await audit(req.user, 'RESET_DEMO');
    res.json({ state: await scoped(await readState(), req.user!) });
  }));

  // ---------------------------------------------------------------- public storefront (no account needed)
  const pub = express.Router();
  pub.get('/catalog', limiter(60_000, 120), wrap(async (req, res) => {
    const state = await readState();
    const inv = engine.computeInventorySummary(state, undefined);
    const refRaw = typeof req.query.ref === 'string' ? req.query.ref.trim().slice(0, 40) : '';
    const ref = refRaw ? state.agents.find((a) => a.code.toLowerCase() === refRaw.toLowerCase() && a.status === 'active') : undefined;
    res.json({
      business: { businessName: state.settings.businessName, brandTitle: state.settings.brandTitle, logoText: state.settings.logoText, address: state.settings.address, phone: state.settings.phone, supportEmail: state.settings.supportEmail, currencyLabel: state.settings.currencyLabel, defaultShippingFee: state.settings.defaultShippingFee, freeShippingThreshold: state.settings.freeShippingThreshold },
      products: state.products.filter((p) => p.isActive).map((p) => ({ id: p.id, sku: p.sku, slug: p.slug, name: p.name, brand: p.brand, category: p.category, packaging: p.packaging, netWeightGrams: p.netWeightGrams, description: p.description, directB2cPrice: p.campaignPrice ?? p.directB2cPrice, baseRetailerPrice: p.baseRetailerPrice, retailerMarkupPercent: p.retailerMarkupPercent, suggestedRetailPrice: p.suggestedRetailPrice, available: Math.max(0, inv.warehouseStock) })),
      agents: state.agents.filter((a) => a.status === 'active').map((a) => ({ id: a.id, code: a.code, fullName: a.fullName })),
      referralAgent: ref ? { id: ref.id, code: ref.code, fullName: ref.fullName } : null,
      simulatedPayment: true,
    });
  }));

  pub.post('/event', limiter(60_000, 60), csrfHeader, wrap(async (req, res) => {
    const b = z.object({ kind: z.enum(['product_view', 'qr_scan', 'referral_visit']), code: z.string().min(1).max(60) }).parse(req.body);
    await q('INSERT INTO public_events (kind, code) VALUES ($1,$2)', [b.kind, b.code]);
    res.json({ ok: true });
  }));

  pub.post('/orders', limiter(10 * 60_000, 20), csrfHeader, wrap(async (req, res) => {
    const b = publicOrderSchema.parse(req.body);
    const out = await mutate((state) => {
      const ref = b.referralCode ? state.agents.find((a) => a.code.toLowerCase() === b.referralCode!.toLowerCase()) : undefined;
      const r = withActor({ role: 'customer', name: b.customerName }, () =>
        engine.createB2cOrderWithSimulatedPayment(state, {
          customerName: b.customerName, customerMobile: b.customerMobile, province: b.province, city: b.city, deliveryAddress: b.deliveryAddress, postalCode: b.postalCode,
          deliveryInstructions: b.deliveryInstructions, productId: b.productId, quantity: b.quantity, sourceChannel: ref ? 'agent_referral' : b.source ?? 'direct_web', referralAgentId: ref?.id,
          idempotencyKey: `public:${b.idempotencyKey}`,
        }));
      return { next: r.nextState, out: r.createdOrder };
    });
    await q('INSERT INTO public_events (kind, code) VALUES ($1,$2)', ['b2c_order', b.referralCode ?? 'direct']);
    res.status(201).json({ order: { orderNumber: out.orderNumber, totalPayable: out.totalPayable, orderStatus: out.orderStatus, paymentStatus: out.paymentStatus, quantity: out.quantity, productNameSnapshot: out.productNameSnapshot, simulatedPaymentRef: out.simulatedPaymentRef, createdAt: out.createdAt }, simulatedPayment: true });
  }));

  pub.get('/orders/track', limiter(10 * 60_000, 30), wrap(async (req, res) => {
    const number = String(req.query.number ?? '').trim().slice(0, 40);
    const mobile = String(req.query.mobile ?? '').trim().slice(0, 16);
    const state = await readState();
    const o = state.b2cOrders.find((x) => x.orderNumber === number && x.customerMobile === mobile);
    if (!o) throw new HttpError(404, 'سفارشی با این شماره و موبایل پیدا نشد.', 'not_found');
    res.json({ order: { orderNumber: o.orderNumber, orderStatus: o.orderStatus, paymentStatus: o.paymentStatus, quantity: o.quantity, productNameSnapshot: o.productNameSnapshot, totalPayable: o.totalPayable, courierName: o.courierName, trackingCode: o.trackingCode, dispatchedAt: o.dispatchedAt, deliveredAt: o.deliveredAt, createdAt: o.createdAt } });
  }));

  pub.post('/retailer-requests', limiter(10 * 60_000, 10), csrfHeader, wrap(async (req, res) => {
    const b = publicRetailerSchema.parse(req.body);
    await mutate((state) => {
      const ref = b.referralCode ? state.agents.find((a) => a.code.toLowerCase() === b.referralCode!.toLowerCase() && a.status === 'active') : undefined;
      const assigned = ref ?? state.agents.find((a) => a.status === 'active');
      if (!assigned) throw new HttpError(503, 'در حال حاضر بازاریاب فعالی وجود ندارد.', 'no_agent');
      const next = withActor({ role: 'customer', name: b.ownerName }, () =>
        engine.createRetailer(state, { storeName: b.storeName, ownerName: b.ownerName, mobile: b.mobile, address: b.address, province: b.province, city: b.city, district: b.district, postalCode: b.postalCode, agentId: assigned.id, acquisitionAgentId: ref?.id ?? assigned.id, source: 'public', notes: ref ? `درخواست از لینک معرف ${ref.code}` : 'درخواست از صفحهٔ عمومی محصول' }));
      return { next, out: null };
    });
    await q('INSERT INTO public_events (kind, code) VALUES ($1,$2)', ['retailer_request', b.referralCode ?? 'direct']);
    res.status(201).json({ ok: true, message: 'درخواست شما ثبت شد و پس از بررسی مدیریت با شما تماس گرفته می‌شود.' });
  }));

  app.use('/api', api);
  app.use('/api/public', pub);

  app.use('/api', (_req, res) => { res.status(404).json({ error: 'مسیر یافت نشد.', code: 'not_found' }); });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) return void res.status(400).json({ error: 'ورودی نامعتبر است.', code: 'validation', issues: err.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`) });
    if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message, code: err.code });
    if (err instanceof SyntaxError) return void res.status(400).json({ error: 'JSON نامعتبر است.', code: 'bad_json' });
    // engine business rules throw plain Errors with Persian messages
    if (err instanceof Error && !(err as any).code && !/relation|syntax error|connect|ECONN/i.test(err.message)) return void res.status(422).json({ error: err.message, code: 'business_rule' });
    console.error('[error]', err instanceof Error ? err.stack : err);
    res.status(500).json({ error: 'خطای داخلی سرور.', code: 'internal' });
  });

  return app;
}
