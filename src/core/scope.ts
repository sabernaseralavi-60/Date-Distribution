import type { SaberCommerceState, UserRole } from './types.ts';

/**
 * Role-scoped view of the ledger (spec Parts 5 and 43). Runs on the SERVER: the browser of an agent or retailer never receives
 * another agent's, retailer's or customer's rows, nor the warehouse movements, the journal, expenses or the audit log (finding F-002).
 * Every collection is listed explicitly; a collection added later is empty for non-admin roles until someone scopes it.
 */
export function getScopedStateForRole(state: SaberCommerceState, role: UserRole, entityId: string): SaberCommerceState {
  if (role === 'admin') return state;

  const empty: SaberCommerceState = {
    ...state,
    priceHistory: [],
    commissionRules: [],
    agents: [],
    retailers: [],
    customers: [],
    inventoryTransactions: [],
    documents: [],
    consignmentDeliveries: [],
    salesReports: [],
    invoices: [],
    payments: [],
    agentCashCollections: [],
    agentRemittances: [],
    commissions: [],
    commissionPayments: [],
    visits: [],
    restockRequests: [],
    discrepancies: [],
    inventoryCounts: [],
    b2cOrders: [],
    refunds: [],
    expenses: [],
    journalEntries: [],
    notifications: [],
    qrLogs: [],
    auditLogs: [],
    cashBankTransactions: [],
    financialAdjustments: [],
  };
  const publicProducts = state.products.filter((p) => p.isActive).map((p) => ({ ...p, costPrice: 0 }));

  if (role === 'agent') {
    const me = state.agents.find((a) => a.id === entityId);
    if (!me) return { ...empty, products: publicProducts };
    const myRetailers = state.retailers.filter((r) => r.agentId === entityId);
    const rtIds = new Set(myRetailers.map((r) => r.id));
    const myDocs = state.documents.filter((d) => d.agentId === entityId || (d.retailerId && rtIds.has(d.retailerId)));
    const docIds = new Set(myDocs.map((d) => d.id));
    const myPaymentIds = new Set<string>();
    const payments = state.payments.filter((p) => {
      const ok = p.collectingAgentId === entityId || p.salesAttributionAgentId === entityId || rtIds.has(p.retailerId);
      if (ok) myPaymentIds.add(p.id);
      return ok;
    });
    const mine = (loc: string, type: string) => (type === 'agent' && loc === entityId) || (type === 'retailer' && rtIds.has(loc));
    return {
      ...empty,
      products: publicProducts,
      commissionRules: state.commissionRules.filter((r) => r.agentId === entityId),
      agents: [me],
      retailers: myRetailers,
      inventoryTransactions: state.inventoryTransactions.filter(
        (t) => mine(t.fromLocationId, t.fromLocationType) || mine(t.toLocationId, t.toLocationType) || (t.referenceDocumentId !== undefined && docIds.has(t.referenceDocumentId))
      ),
      documents: myDocs,
      consignmentDeliveries: state.consignmentDeliveries.filter((d) => d.agentId === entityId || rtIds.has(d.retailerId)),
      salesReports: state.salesReports.filter((r) => rtIds.has(r.retailerId)),
      invoices: state.invoices.filter((i) => rtIds.has(i.retailerId)),
      payments,
      agentCashCollections: state.agentCashCollections.filter((c) => c.agentId === entityId),
      agentRemittances: state.agentRemittances.filter((r) => r.agentId === entityId),
      commissions: state.commissions.filter((c) => c.agentId === entityId),
      commissionPayments: state.commissionPayments.filter((c) => c.agentId === entityId),
      visits: state.visits.filter((v) => v.agentId === entityId),
      restockRequests: state.restockRequests.filter((r) => rtIds.has(r.retailerId)),
      discrepancies: state.discrepancies.filter((d) => mine(d.locationId, d.locationType)),
      inventoryCounts: state.inventoryCounts.filter((c) => mine(c.locationId, c.locationType)),
      notifications: state.notifications.filter((n) => n.targetRole === 'agent' && n.targetEntityId === entityId),
      qrLogs: state.qrLogs.filter((q) => q.referralAgentId === entityId),
      financialAdjustments: state.financialAdjustments.filter((a) => a.retailerId && rtIds.has(a.retailerId)),
    };
  }

  if (role === 'retailer') {
    const me = state.retailers.find((r) => r.id === entityId);
    if (!me) return { ...empty, products: publicProducts };
    const agent = state.agents.find((a) => a.id === me.agentId);
    const myDocs = state.documents.filter((d) => d.retailerId === entityId);
    const docIds = new Set(myDocs.map((d) => d.id));
    const mine = (loc: string, type: string) => type === 'retailer' && loc === entityId;
    return {
      ...empty,
      products: publicProducts,
      // only the contact card of the responsible agent: no rates, no custody, no personal id
      agents: agent
        ? [{ ...agent, nationalId: undefined, address: '', commissionRatePercent: 0, commissionRuleId: '', assignedRetailerIds: [], notes: '' }]
        : [],
      retailers: [me],
      inventoryTransactions: state.inventoryTransactions.filter(
        (t) => mine(t.fromLocationId, t.fromLocationType) || mine(t.toLocationId, t.toLocationType) || (t.referenceDocumentId !== undefined && docIds.has(t.referenceDocumentId))
      ),
      documents: myDocs,
      consignmentDeliveries: state.consignmentDeliveries.filter((d) => d.retailerId === entityId),
      salesReports: state.salesReports.filter((r) => r.retailerId === entityId),
      invoices: state.invoices.filter((i) => i.retailerId === entityId),
      payments: state.payments.filter((p) => p.retailerId === entityId),
      visits: state.visits.filter((v) => v.retailerId === entityId),
      restockRequests: state.restockRequests.filter((r) => r.retailerId === entityId),
      discrepancies: state.discrepancies.filter((d) => mine(d.locationId, d.locationType)),
      inventoryCounts: state.inventoryCounts.filter((c) => mine(c.locationId, c.locationType)),
      notifications: state.notifications.filter((n) => n.targetRole === 'retailer' && n.targetEntityId === entityId),
      financialAdjustments: state.financialAdjustments.filter((a) => a.retailerId === entityId),
    };
  }

  // customer / anonymous: never receives ledger rows; the storefront uses the public catalog endpoint
  return { ...empty, products: publicProducts };
}
