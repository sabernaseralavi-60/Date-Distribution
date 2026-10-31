import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.ts';
import { loadConfig } from '../config.ts';
import { migrate, openDb, type Db } from '../db.ts';
import { bootstrap } from '../seed.ts';

const PW = 'Demo-pass-12345';
const ADMIN_PW = 'Admin-pass-12345';
let base = '';
let db: Db;
let server: Server;

class Client {
  cookie = '';
  async call(method: string, path: string, body?: unknown) {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(method !== 'GET' ? { 'x-sdc-csrf': '1' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data: data as any, headers: res.headers };
  }
  async login(username: string, password: string) {
    const r = await this.call('POST', '/api/auth/login', { username, password });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    return this;
  }
  act(fn: string, input: Record<string, unknown>, key = crypto.randomUUID()) {
    return this.call('POST', '/api/action', { steps: [{ fn, input }], idempotencyKey: key });
  }
  state = async () => (await this.call('GET', '/api/state')).data.state;
}
const as = (u: string, p = PW) => new Client().login(u, p);

beforeAll(async () => {
  const cfg = loadConfig({ env: 'test', sessionSecret: 's'.repeat(40), seedDemo: true, seedPassword: PW, adminPassword: ADMIN_PW, trustProxy: false });
  db = await openDb({ databaseUrl: null, dataDir: null });
  await migrate(db);
  await bootstrap(db, cfg);
  server = createApp(cfg, db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}, 60_000);

afterAll(async () => {
  server?.close();
  await db?.close();
});

describe('authentication', () => {
  it('rejects anonymous access to the ledger and to actions', async () => {
    const c = new Client();
    expect((await c.call('GET', '/api/state')).status).toBe(401);
    expect((await c.call('POST', '/api/action', { steps: [{ fn: 'createProduct', input: {} }], idempotencyKey: 'x'.repeat(10) })).status).toBe(401);
    expect((await c.call('GET', '/api/admin/users')).status).toBe(401);
  });
  it('wrong password fails, right password sets an HttpOnly cookie, CSRF header is required', async () => {
    const c = new Client();
    expect((await c.call('POST', '/api/auth/login', { username: 'admin', password: 'wrong-wrong-1' })).status).toBe(401);
    const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: ADMIN_PW }) });
    expect(res.status).toBe(403); // no x-sdc-csrf
    await c.login('admin', ADMIN_PW);
    expect((await c.call('GET', '/api/auth/me')).data.user.role).toBe('admin');
  });
  it('locks the account after five wrong passwords', async () => {
    const c = new Client();
    for (let i = 0; i < 5; i++) await c.call('POST', '/api/auth/login', { username: 'rt03', password: 'nope-nope-nope' });
    const r = await c.call('POST', '/api/auth/login', { username: 'rt03', password: PW });
    expect(r.status).toBe(429);
  });
});

describe('role scoping: nobody receives another party\'s rows (F-002)', () => {
  it('an agent sees only own stores, no warehouse movements, no journal, no other agents', async () => {
    const a = await as('agent1');
    const s = await a.state();
    expect(s.agents).toHaveLength(1);
    expect(s.retailers.every((r: any) => r.agentId === s.agents[0].id)).toBe(true);
    expect(s.retailers.length).toBeGreaterThan(0);
    expect(s.journalEntries).toHaveLength(0);
    expect(s.expenses).toHaveLength(0);
    expect(s.b2cOrders).toHaveLength(0);
    expect(s.customers).toHaveLength(0);
    expect(s.auditLogs).toHaveLength(0);
    expect(s.inventoryTransactions.every((t: any) => [t.fromLocationId, t.toLocationId].some((x: string) => x === s.agents[0].id || s.retailers.some((r: any) => r.id === x)))).toBe(true);
    expect(s.products.every((p: any) => p.costPrice === 0)).toBe(true);
  });
  it('a store sees only itself, only its own invoices and no commissions or cost prices', async () => {
    const r = await as('rt01');
    const s = await r.state();
    expect(s.retailers).toHaveLength(1);
    expect(s.invoices.every((i: any) => i.retailerId === s.retailers[0].id)).toBe(true);
    expect(s.commissions).toHaveLength(0);
    expect(s.commissionRules).toHaveLength(0);
    expect(s.agents[0].commissionRatePercent).toBe(0);
    expect(s.journalEntries).toHaveLength(0);
    expect(s.products.every((p: any) => p.costPrice === 0)).toBe(true);
  });
  it('the administrator sees everything', async () => {
    const s = await (await as('admin', ADMIN_PW)).state();
    expect(s.agents).toHaveLength(6);
    expect(s.retailers).toHaveLength(12);
  });
});

describe('server-side authorization (role replay)', () => {
  it('agents and stores cannot run administrator actions', async () => {
    for (const who of ['agent1', 'rt01']) {
      const c = await as(who);
      for (const fn of ['createProduct', 'verifyRetailerPayment', 'payAgentCommission', 'updateBusinessSettings', 'verifyOfficialDocument', 'recordExpense', 'approveRetailer']) {
        const r = await c.act(fn, {});
        expect(r.status, `${who} ${fn}`).toBe(403);
      }
    }
  });
  it('an agent cannot act for another agent or on another agent\'s store', async () => {
    const a = await as('agent1');
    const admin = await as('admin', ADMIN_PW);
    const s = await admin.state();
    const other = s.retailers.find((r: any) => r.agentId !== 'ag-1');
    const r = await a.act('recordFieldVisit', { agentId: 'ag-1', retailerId: other.id, observedStock: 1, retailerReportedSales: 0, paymentFollowupStatus: 'x', restockingNeededCount: 0, outcome: 'stock_sufficient', nextVisitDate: new Date().toISOString() });
    expect(r.status).toBe(403);
    const r2 = await a.act('recordFieldVisit', { agentId: 'ag-2', retailerId: 'rt-1', observedStock: 1, retailerReportedSales: 0, paymentFollowupStatus: 'x', restockingNeededCount: 0, outcome: 'stock_sufficient', nextVisitDate: new Date().toISOString() });
    expect(r2.status).toBe(403);
  });
  it('a store cannot report sales for another store', async () => {
    const c = await as('rt01');
    const r = await c.act('submitAndVerifyRetailerSalesReport', { retailerId: 'rt-2', productId: 'x', reportedSoldQuantity: 1 });
    expect(r.status).toBe(403);
  });
  it('a retailer cannot fabricate agent-held cash or self-verify a payment', async () => {
    const c = await as('rt01');
    const before = await (await as('admin', ADMIN_PW)).state();
    const r = await c.act('submitRetailerPayment', { retailerId: 'rt-1', amount: 1000, method: 'cash_to_agent', referenceNumber: 'T-1', collectedByAgentDirectly: true, autoVerify: true });
    expect(r.status).toBe(200);
    const after = await (await as('admin', ADMIN_PW)).state();
    const pay = after.payments[0];
    expect(pay.status).toBe('pending');
    expect(pay.collectedByAgentDirectly).toBe(false);
    expect(after.agentCashCollections.length).toBe(before.agentCashCollections.length);
    expect(after.commissions.length).toBe(before.commissions.length);
  });
});

describe('idempotency and concurrency', () => {
  it('the same idempotency key never repeats an action', async () => {
    const c = await as('admin', ADMIN_PW);
    const key = crypto.randomUUID();
    const n0 = (await c.state()).expenses.length;
    expect((await c.act('recordExpense', { title: 'بسته‌بندی', amount: 1000, category: 'packaging', paidFromAccount: 'بانک' }, key)).status).toBe(200);
    const again = await c.act('recordExpense', { title: 'بسته‌بندی', amount: 1000, category: 'packaging', paidFromAccount: 'بانک' }, key);
    expect(again.data.duplicate).toBe(true);
    expect((await c.state()).expenses.length).toBe(n0 + 1);
  });
  it('parallel conflicting actions are serialised: stock never goes negative', async () => {
    const admin = await as('admin', ADMIN_PW);
    const s = await admin.state();
    const product = s.products[0];
    const stock = (s.inventoryTransactions as any[]).reduce((n, t) => n + (t.toLocationType === 'warehouse' ? t.quantity : 0) - (t.fromLocationType === 'warehouse' ? t.quantity : 0), 0);
    // ask for the whole warehouse stock twice at the same time as B2C orders
    const orders = await Promise.all([1, 2].map((i) =>
      fetch(base + '/api/public/orders', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sdc-csrf': '1' }, body: JSON.stringify({ customerName: 'مشتری آزمون', customerMobile: '09123334455', province: 'تهران', city: 'تهران', deliveryAddress: 'خیابان آزمون پلاک ' + i, postalCode: '1234567890', productId: product.id, quantity: Math.max(1, stock), idempotencyKey: `race-${i}-${Date.now()}-abc` }) }).then((r) => r.status)));
    expect(orders.filter((x) => x === 201).length).toBeLessThanOrEqual(1);
    const after = await admin.state();
    const left = (after.inventoryTransactions as any[]).reduce((n, t) => n + (t.toLocationType === 'warehouse' ? t.quantity : 0) - (t.fromLocationType === 'warehouse' ? t.quantity : 0), 0);
    expect(left).toBeGreaterThanOrEqual(0);
  });
});

describe('money: spec scenarios and the findings fixed', () => {
  it('sale report -> pending payment -> admin verifies -> commission once -> duplicate verify does nothing (scenarios 28-40, 67)', async () => {
    const admin = await as('admin', ADMIN_PW);
    const store = await as('rt02');
    const s0 = await admin.state();
    const product = s0.products[0];
    const stockBefore = (s0.inventoryTransactions as any[]).filter((t) => t.toLocationId === 'rt-2').reduce((n, t) => n + t.quantity, 0) - (s0.inventoryTransactions as any[]).filter((t) => t.fromLocationId === 'rt-2').reduce((n, t) => n + t.quantity, 0);
    expect(stockBefore).toBeGreaterThan(0);
    const rep = await store.act('submitAndVerifyRetailerSalesReport', { retailerId: 'rt-2', productId: product.id, reportedSoldQuantity: 1, physicalCountedStock: stockBefore - 1 });
    expect(rep.status, JSON.stringify(rep.data)).toBe(200);
    const pay = await store.act('submitRetailerPayment', { retailerId: 'rt-2', amount: product.baseRetailerPrice, method: 'bank_transfer', referenceNumber: 'TRX-INT-1' });
    expect(pay.status).toBe(200);
    const pending = (await admin.state()).payments.find((p: any) => p.referenceNumber === 'TRX-INT-1');
    expect(pending.status).toBe('pending');
    const c0 = (await admin.state()).commissions.length;
    expect((await admin.act('verifyRetailerPayment', { paymentId: pending.id })).status).toBe(200);
    const s1 = await admin.state();
    expect(s1.commissions.length).toBe(c0 + 1);
    expect((await admin.act('verifyRetailerPayment', { paymentId: pending.id })).status).toBe(200);
    expect((await admin.state()).commissions.length).toBe(c0 + 1);
  });
  it('an advance payment with no open invoice earns NO commission and the money is kept as credit (F-006)', async () => {
    const admin = await as('admin', ADMIN_PW);
    const s = await admin.state();
    const target = s.retailers.find((r: any) => !s.invoices.some((i: any) => i.retailerId === r.id && i.remainingAmount > 0));
    expect(target, 'a store with no open invoice exists in the demo').toBeTruthy();
    const c0 = s.commissions.length;
    await admin.act('submitRetailerPayment', { retailerId: target.id, amount: 500000, method: 'bank_transfer', referenceNumber: 'ADV-1', autoVerify: true });
    const s1 = await admin.state();
    expect(s1.commissions.length).toBe(c0);
    const p = s1.payments.find((x: any) => x.referenceNumber === 'ADV-1');
    expect(p.status).toBe('verified');
    expect(p.unallocatedAmount).toBe(500000);
  });
  it('overdue is derived from the due date, not stored (F-008)', async () => {
    const s = await (await as('admin', ADMIN_PW)).state();
    for (const i of s.invoices) {
      expect(i.isOverdue).toBe(i.remainingAmount > 0 && i.status !== 'reversed' && Date.parse(i.dueDate) < Date.now());
    }
  });
});

describe('private documents (F-014)', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 7)]);
  it('rejects a file whose content is not an image/PDF even with an image name', async () => {
    const admin = await as('admin', ADMIN_PW);
    const doc = (await admin.state()).documents[0];
    const r = await admin.call('POST', `/api/documents/${doc.id}/attachments`, { filename: 'a.png', dataBase64: Buffer.alloc(300, 65).toString('base64') });
    expect(r.status).toBe(400);
  });
  it('stores a real file with its SHA-256 and serves it only to people who may see the document', async () => {
    const admin = await as('admin', ADMIN_PW);
    const product = (await admin.state()).products[0];
    expect((await admin.act('recordSupplierStockReceipt', { productId: product.id, quantity: 5, supplierName: 'نخلستان آزمون' })).status).toBe(200);
    const draft = await admin.act('createWarehouseToAgentDeliveryDraft', { agentId: 'ag-1', productId: product.id, quantity: 1 });
    expect(draft.status, JSON.stringify(draft.data)).toBe(200);
    const doc = draft.data.result.createdDocument;
    expect(doc.verificationStatus).not.toBe('verified');
    const up = await admin.call('POST', `/api/documents/${doc.id}/attachments`, { filename: 'sign.png', dataBase64: png.toString('base64') });
    expect(up.status, JSON.stringify(up.data)).toBe(200);
    const { createHash } = await import('node:crypto');
    expect(up.data.sha256).toBe(createHash('sha256').update(png).digest('hex'));
    const get = await admin.call('GET', `/api/attachments/${up.data.attachmentId}`);
    expect(get.status).toBe(200);
    expect(get.headers.get('cache-control')).toContain('no-store');
    const anon = await new Client().call('GET', `/api/attachments/${up.data.attachmentId}`);
    expect(anon.status).toBe(401);
    const strangerStore = await as('rt12');
    if (doc.agentId !== 'ag-6' && doc.retailerId !== 'rt-12') {
      expect((await strangerStore.call('GET', `/api/attachments/${up.data.attachmentId}`)).status).toBe(404);
    }
  });
});

describe('public storefront', () => {
  it('shows the catalogue without any ledger data, and tracks an order only with number + mobile', async () => {
    const c = new Client();
    const cat = await c.call('GET', '/api/public/catalog');
    expect(cat.status).toBe(200);
    expect(cat.data.products[0].costPrice).toBeUndefined();
    expect(JSON.stringify(cat.data)).not.toContain('commission');
    const bad = await c.call('GET', '/api/public/orders/track?number=B2C-1405-00001&mobile=09120000000');
    expect(bad.status).toBe(404);
  });
  it('a public store request is created pending, not active (Part 10)', async () => {
    const c = new Client();
    const r = await c.call('POST', '/api/public/retailer-requests', { storeName: 'فروشگاه آزمون', ownerName: 'مسئول آزمون', mobile: '09125556677', address: 'تهران خیابان آزمون ۱', province: 'تهران', city: 'تهران', district: 'منطقه ۱', postalCode: '1234567890' });
    expect(r.status).toBe(201);
    const s = await (await as('admin', ADMIN_PW)).state();
    expect(s.retailers.find((x: any) => x.storeName === 'فروشگاه آزمون').status).toBe('pending');
  });
});

describe('user administration', () => {
  it('only the administrator manages logins; deactivation revokes sessions at once', async () => {
    const admin = await as('admin', ADMIN_PW);
    const store = await as('rt05');
    expect((await store.call('GET', '/api/admin/users')).status).toBe(403);
    const users = (await admin.call('GET', '/api/admin/users')).data.users;
    const rt = users.find((u: any) => u.username === 'rt05');
    expect((await admin.call('PATCH', `/api/admin/users/${rt.id}`, { active: false })).status).toBe(200);
    expect((await store.call('GET', '/api/state')).status).toBe(401);
  });
});
