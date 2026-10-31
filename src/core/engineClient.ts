/**
 * Browser-side face of the domain engine.
 *
 * Read-only helpers (computeInventorySummary, ...) run locally on the role-scoped state the server sent.
 * Every state-changing function is a RECORDER: it validates by running the real engine locally (so forms keep their
 * immediate Persian error messages and the screen updates at once), but the returned "next state" carries a pending marker with the
 * call that must be replayed on the server. The authoritative result always comes from the server (App.commit replaces the
 * optimistic copy), the browser's copy is never trusted. Ids are made deterministic with a seed so that the id the user sees
 * (for example of a newly created document) is the id the server will create.
 */
import * as engine from './engine.ts';
import { withIdSeed } from './runtime.ts';
import type { SaberCommerceState } from './types.ts';

export * from './engine.ts';

export interface PendingStep { fn: string; input: Record<string, unknown>; seed: string }
export type Pending = SaberCommerceState & { __pending: true; __steps: PendingStep[] };

export const isPending = (s: unknown): s is Pending => Boolean(s && typeof s === 'object' && (s as { __pending?: boolean }).__pending);

const newSeed = () => Math.random().toString(36).slice(2, 10).padEnd(6, 'x');

function record<I extends Record<string, any>, R>(fn: string, impl: (s: SaberCommerceState, i: I) => R) {
  return (state: SaberCommerceState, input: I): R => {
    const prior = isPending(state) ? state.__steps : [];
    const seed = newSeed();
    const out = withIdSeed(seed, () => impl(state, input)) as any;
    const wrap = (next: SaberCommerceState): Pending => ({ ...next, __pending: true, __steps: [...prior, { fn, input, seed }] }) as Pending;
    if (out && typeof out === 'object' && 'nextState' in out) return { ...out, nextState: wrap(out.nextState) } as R;
    return wrap(out) as unknown as R;
  };
}

type E = typeof engine;
export const createProduct = record('createProduct', engine.createProduct as E['createProduct']);
export const updateProductPricing = record('updateProductPricing', engine.updateProductPricing as E['updateProductPricing']);
export const createSalesAgent = record('createSalesAgent', engine.createSalesAgent as E['createSalesAgent']);
export const createRetailer = record('createRetailer', engine.createRetailer as E['createRetailer']);
export const recordSupplierStockReceipt = record('recordSupplierStockReceipt', engine.recordSupplierStockReceipt as E['recordSupplierStockReceipt']);
export const createWarehouseToAgentDeliveryDraft = record('createWarehouseToAgentDeliveryDraft', engine.createWarehouseToAgentDeliveryDraft as E['createWarehouseToAgentDeliveryDraft']);
export const createAgentToRetailerDeliveryDraft = record('createAgentToRetailerDeliveryDraft', engine.createAgentToRetailerDeliveryDraft as E['createAgentToRetailerDeliveryDraft']);
export const verifyOfficialDocument = record('verifyOfficialDocument', engine.verifyOfficialDocument as E['verifyOfficialDocument']);
export const recordAgentReturnToWarehouse = record('recordAgentReturnToWarehouse', engine.recordAgentReturnToWarehouse as E['recordAgentReturnToWarehouse']);
export const recordRetailerReturn = record('recordRetailerReturn', engine.recordRetailerReturn as E['recordRetailerReturn']);
export const submitAndVerifyRetailerSalesReport = record('submitAndVerifyRetailerSalesReport', engine.submitAndVerifyRetailerSalesReport as E['submitAndVerifyRetailerSalesReport']);
export const submitRetailerPayment = record('submitRetailerPayment', engine.submitRetailerPayment as E['submitRetailerPayment']);
export const verifyRetailerPayment = record('verifyRetailerPayment', engine.verifyRetailerPayment as E['verifyRetailerPayment']);
export const rejectRetailerPayment = record('rejectRetailerPayment', engine.rejectRetailerPayment as E['rejectRetailerPayment']);
export const reverseRetailerPayment = record('reverseRetailerPayment', engine.reverseRetailerPayment as E['reverseRetailerPayment']);
export const submitAndVerifyAgentRemittance = record('submitAndVerifyAgentRemittance', engine.submitAndVerifyAgentRemittance as E['submitAndVerifyAgentRemittance']);
export const verifyAgentRemittance = record('verifyAgentRemittance', engine.verifyAgentRemittance as E['verifyAgentRemittance']);
export const payAgentCommission = record('payAgentCommission', engine.payAgentCommission as E['payAgentCommission']);
export const approveCommission = record('approveCommission', engine.approveCommission as E['approveCommission']);
export const recordFieldVisit = record('recordFieldVisit', engine.recordFieldVisit as E['recordFieldVisit']);
export const createB2cOrderWithSimulatedPayment = record('createB2cOrderWithSimulatedPayment', engine.createB2cOrderWithSimulatedPayment as E['createB2cOrderWithSimulatedPayment']);
export const updateB2cOrderFulfillment = record('updateB2cOrderFulfillment', engine.updateB2cOrderFulfillment as E['updateB2cOrderFulfillment']);
export const updateBusinessSettings = record('updateBusinessSettings', engine.updateBusinessSettings as E['updateBusinessSettings']);
export const approveRetailer = record('approveRetailer', engine.approveRetailer as E['approveRetailer']);
export const submitRestockRequest = record('submitRestockRequest', engine.submitRestockRequest as E['submitRestockRequest']);
export const recordExpense = record('recordExpense', engine.recordExpense as E['recordExpense']);
export const recordCashBankTransaction = record('recordCashBankTransaction', engine.recordCashBankTransaction as E['recordCashBankTransaction']);
export const recordFinancialAdjustment = record('recordFinancialAdjustment', engine.recordFinancialAdjustment as E['recordFinancialAdjustment']);
export const markNotificationsRead = record('markNotificationsRead', engine.markNotificationsRead as E['markNotificationsRead']);
