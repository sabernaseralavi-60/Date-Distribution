import type { SaberCommerceState } from './core/types.ts';

export interface SessionUser {
  username: string;
  fullName: string;
  role: 'admin' | 'agent' | 'retailer';
  entityId: string | null;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly code: string) { super(message); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(method !== 'GET' ? { 'x-sdc-csrf': '1' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `خطای ${res.status}`, data?.code ?? 'error');
  return data as T;
}

export interface ActionStep { fn: string; input: Record<string, unknown>; seed?: string }

export const api = {
  me: () => call<{ user: SessionUser | null }>('GET', '/api/auth/me'),
  login: (username: string, password: string) => call<{ user: SessionUser }>('POST', '/api/auth/login', { username, password }),
  logout: () => call<{ ok: true }>('POST', '/api/auth/logout', {}),
  changePassword: (current: string, next: string) => call<{ ok: true }>('POST', '/api/auth/password', { current, next }),
  state: () => call<{ state: SaberCommerceState; demo: boolean }>('GET', '/api/state'),
  act: (steps: ActionStep[], idempotencyKey: string) =>
    call<{ state: SaberCommerceState; results: any[]; result: any; duplicate: boolean }>('POST', '/api/action', { steps, idempotencyKey }),
  upload: (docId: string, filename: string, dataBase64: string) =>
    call<{ state: SaberCommerceState; attachmentId: string; sha256: string }>('POST', `/api/documents/${encodeURIComponent(docId)}/attachments`, { filename, dataBase64 }),
  users: () => call<{ users: { id: string; username: string; full_name: string; role: string; entity_id: string | null; active: boolean; created_at: string }[] }>('GET', '/api/admin/users'),
  createUser: (b: { username: string; fullName: string; role: 'agent' | 'retailer'; entityId: string; password: string }) => call<{ id: string }>('POST', '/api/admin/users', b),
  patchUser: (id: string, b: { active?: boolean; password?: string; fullName?: string }) => call<{ ok: true }>('PATCH', `/api/admin/users/${id}`, b),
  audit: () => call<{ entries: { at: string; username: string | null; action: string; entity: string | null; entity_id: string | null }[] }>('GET', '/api/admin/audit'),
  resetDemo: () => call<{ state: SaberCommerceState }>('POST', '/api/admin/reset-demo', {}),

  // public storefront (no login)
  catalog: (ref?: string) => call<PublicCatalog>('GET', `/api/public/catalog${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`),
  event: (kind: 'product_view' | 'qr_scan' | 'referral_visit', code: string) => call<{ ok: true }>('POST', '/api/public/event', { kind, code }).catch(() => null),
  publicOrder: (b: Record<string, unknown>) => call<{ order: PublicOrder; simulatedPayment: boolean }>('POST', '/api/public/orders', b),
  trackOrder: (number: string, mobile: string) => call<{ order: PublicOrder }>('GET', `/api/public/orders/track?number=${encodeURIComponent(number)}&mobile=${encodeURIComponent(mobile)}`),
  retailerRequest: (b: Record<string, unknown>) => call<{ ok: true; message: string }>('POST', '/api/public/retailer-requests', b),
};

export interface PublicOrder {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  quantity: number;
  productNameSnapshot: string;
  totalPayable: number;
  simulatedPaymentRef?: string;
  courierName?: string;
  trackingCode?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface PublicCatalog {
  business: { businessName: string; brandTitle: string; logoText: string; address: string; phone: string; supportEmail: string; currencyLabel: string; defaultShippingFee: number; freeShippingThreshold: number };
  products: { id: string; sku: string; slug: string; name: string; brand: string; category: string; packaging: string; netWeightGrams: number; description: string; directB2cPrice: number; baseRetailerPrice: number; retailerMarkupPercent: number; suggestedRetailPrice: number; available: number }[];
  agents: { id: string; code: string; fullName: string }[];
  referralAgent: { id: string; code: string; fullName: string } | null;
  simulatedPayment: boolean;
}

export const newKey = (): string => (globalThis.crypto?.randomUUID?.() ?? `k${Date.now()}${Math.random().toString(36).slice(2)}`);
