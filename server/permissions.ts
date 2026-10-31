import type { SaberCommerceState } from '../src/core/types.ts';
import type { Role } from './auth.ts';

export class Forbidden extends Error {}

export interface ActionCtx {
  role: Role;
  entityId: string | null;
  state: SaberCommerceState;
}

type Input = Record<string, any>;
interface ActionRule {
  roles: Role[];
  /** throws Forbidden when the caller may not touch the entities named in the input */
  check?: (c: ActionCtx, input: Input) => void;
  /** server-side overrides: a client can never set trust-bearing flags for itself */
  prepare?: (c: ActionCtx, input: Input) => Input;
}

const own = (c: ActionCtx) => c.entityId ?? '';
const retailerOf = (c: ActionCtx, id: unknown) => c.state.retailers.find((r) => r.id === id);

/** agent: the retailer must be assigned to the agent; retailer: it must be itself; admin: any */
function retailerAccess(c: ActionCtx, retailerId: unknown) {
  if (c.role === 'admin') return;
  const r = retailerOf(c, retailerId);
  if (!r) throw new Forbidden('فروشگاه یافت نشد یا در دسترس شما نیست.');
  if (c.role === 'agent' && r.agentId !== own(c)) throw new Forbidden('این فروشگاه به شما اختصاص داده نشده است.');
  if (c.role === 'retailer' && r.id !== own(c)) throw new Forbidden('این فروشگاه متعلق به شما نیست.');
}
const agentSelf = (c: ActionCtx, agentId: unknown) => {
  if (c.role === 'admin') return;
  if (agentId !== own(c)) throw new Forbidden('این عملیات فقط برای حساب خود شما مجاز است.');
};

const ADMIN: Role[] = ['admin'];
const staff: Role[] = ['admin', 'agent'];
const anyRole: Role[] = ['admin', 'agent', 'retailer'];

export const ACTIONS: Record<string, ActionRule> = {
  // administrator only: catalogue, pricing, people, warehouse, approvals, money decisions
  createProduct: { roles: ADMIN },
  updateProductPricing: { roles: ADMIN },
  createSalesAgent: { roles: ADMIN },
  recordSupplierStockReceipt: { roles: ADMIN },
  createWarehouseToAgentDeliveryDraft: { roles: ADMIN },
  verifyOfficialDocument: { roles: ADMIN },
  verifyRetailerPayment: { roles: ADMIN },
  rejectRetailerPayment: { roles: ADMIN },
  reverseRetailerPayment: { roles: ADMIN },
  verifyAgentRemittance: { roles: ADMIN },
  payAgentCommission: { roles: ADMIN },
  approveCommission: { roles: ADMIN },
  updateB2cOrderFulfillment: { roles: ADMIN },
  // phone/walk-in order entered by the administrator (customers use the public endpoint)
  createB2cOrderWithSimulatedPayment: { roles: ADMIN },
  updateBusinessSettings: { roles: ADMIN },
  approveRetailer: { roles: ADMIN },
  recordExpense: { roles: ADMIN },
  recordCashBankTransaction: { roles: ADMIN },
  recordFinancialAdjustment: { roles: ADMIN },

  // agents register stores (pending approval) and act only on their own custody and stores
  createRetailer: {
    roles: staff,
    prepare: (c, i) => (c.role === 'admin' ? { ...i, source: 'admin' } : { ...i, source: 'agent', agentId: own(c), acquisitionAgentId: own(c) }),
  },
  createAgentToRetailerDeliveryDraft: {
    roles: staff,
    check: (c, i) => { agentSelf(c, i.agentId); retailerAccess(c, i.retailerId); },
  },
  recordAgentReturnToWarehouse: { roles: staff, check: (c, i) => agentSelf(c, i.agentId) },
  recordFieldVisit: { roles: staff, check: (c, i) => { agentSelf(c, i.agentId); retailerAccess(c, i.retailerId); } },
  submitAndVerifyAgentRemittance: {
    roles: staff,
    check: (c, i) => agentSelf(c, i.agentId),
    // an agent's own remittance is pending until the administrator verifies it (Part 21)
    prepare: (c, i) => (c.role === 'admin' ? i : { ...i, autoVerify: false }),
  },

  // retailers and their agents
  recordRetailerReturn: { roles: anyRole, check: (c, i) => retailerAccess(c, i.retailerId) },
  submitAndVerifyRetailerSalesReport: { roles: anyRole, check: (c, i) => retailerAccess(c, i.retailerId) },
  submitRestockRequest: {
    roles: anyRole,
    check: (c, i) => retailerAccess(c, i.retailerId),
    prepare: (c, i) => ({ ...i, requestedByRole: c.role === 'retailer' ? 'retailer' : 'agent' }),
  },
  submitRetailerPayment: {
    roles: anyRole,
    check: (c, i) => retailerAccess(c, i.retailerId),
    // only an administrator can verify; only an agent can receive cash on behalf of the business
    prepare: (c, i) => {
      if (c.role === 'admin') return i;
      const direct = c.role === 'agent' && i.collectedByAgentDirectly === true;
      return { ...i, autoVerify: false, collectedByAgentDirectly: direct, collectingAgentId: direct ? own(c) : undefined };
    },
  },
  markNotificationsRead: {
    roles: anyRole,
    prepare: (c, i) => {
      const ids = new Set(
        c.state.notifications
          .filter((n) => c.role === 'admin' ? n.targetRole === 'admin' : n.targetRole === c.role && n.targetEntityId === own(c))
          .map((n) => n.id)
      );
      const asked: string[] | undefined = Array.isArray(i.ids) ? i.ids : undefined;
      return { ids: (asked ?? [...ids]).filter((x) => ids.has(x)) };
    },
  },
};

/** Rejects NaN/Infinity and absurd magnitudes anywhere in an input (engine rules then check business limits). */
export function assertSaneNumbers(v: unknown, depth = 0): void {
  if (depth > 6) throw new Error('ساختار ورودی بیش از حد تو در تو است.');
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || Math.abs(v) > 1e12) throw new Error('مقدار عددی نامعتبر است.');
  } else if (typeof v === 'string') {
    if (v.length > 5000) throw new Error('متن ورودی بیش از حد طولانی است.');
  } else if (Array.isArray(v)) {
    if (v.length > 200) throw new Error('فهرست ورودی بیش از حد طولانی است.');
    v.forEach((x) => assertSaneNumbers(x, depth + 1));
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (k === '__proto__' || k === 'constructor') throw new Error('کلید نامعتبر.');
      assertSaneNumbers(x, depth + 1);
    }
  }
}
