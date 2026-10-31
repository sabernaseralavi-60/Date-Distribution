import {
  SaberCommerceState,
  Product,
  SalesAgent,
  Retailer,
  CommissionRule,
  OfficialDocument,
  DocumentAttachment,
  CustodyPolicyMode,
  RetailerSalesReport,
  RetailerPayment,
  PaymentAllocation,
  FieldVisitReport,
  VisitOutcome,
  RestockRequest,
  InventoryDiscrepancy,
  InventoryCountRecord,
  B2cOrder,
  B2cOrderStatus,
  OperatingExpense,
  BusinessSettings,
  UserRole,
  ReceivableInvoice,
  CommissionRecord,
  JournalEntry,
  CashBankTransaction,
  FinancialAdjustment,
} from './types.ts';
import { computeSimpleChecksum, isValidIranianMobile, isValidIranianPostalCode } from './formatters.ts';
import { actor, nowIso, nowMs, uid } from './runtime.ts';

export interface InventoryReconciliationSummary {
  initialAndInbound: number;
  warehouseStock: number;
  totalAgentCustody: number;
  totalRetailerCustody: number;
  soldThroughRetailers: number;
  soldDirectB2c: number;
  damagedOrQuarantined: number;
  agentCustodyByAgent: Record<string, number>;
  retailerCustodyByRetailer: Record<string, number>;
  totalAccountedFor: number;
  isReconciled: boolean;
}

export interface FinancialReconciliationSummary {
  totalB2bReceivablesGenerated: number;
  totalVerifiedB2bCollections: number;
  totalOutstandingReceivables: number;
  totalOverdueReceivables: number;
  totalPendingPaymentsAmount: number;
  totalB2cRevenue: number;
  totalCommissionCalculated: number;
  totalCommissionPaid: number;
  totalCommissionUnpaid: number;
  totalAgentHeldCash: number;
  agentCashByAgent: Record<string, { collected: number; remitted: number; held: number }>;
  totalExpenses: number;
  verifiedBankBalance: number;
  isReceivablesReconciled: boolean;
}

export function computeInventorySummary(
  state: SaberCommerceState,
  productId?: string
): InventoryReconciliationSummary {
  let initialAndInbound = 0;
  let warehouseStock = 0;
  let soldThroughRetailers = 0;
  let soldDirectB2c = 0;
  let damagedOrQuarantined = 0;

  const agentCustodyByAgent: Record<string, number> = {};
  const retailerCustodyByRetailer: Record<string, number> = {};

  for (const ag of state.agents) {
    agentCustodyByAgent[ag.id] = 0;
  }
  for (const rt of state.retailers) {
    retailerCustodyByRetailer[rt.id] = 0;
  }

  const txs = productId
    ? state.inventoryTransactions.filter((t) => t.productId === productId)
    : state.inventoryTransactions;

  for (const tx of txs) {
    const q = tx.quantity;
    switch (tx.movementType) {
      case 'initial_stock':
      case 'supplier_receipt':
        initialAndInbound += q;
        warehouseStock += q;
        break;
      case 'warehouse_to_agent':
        warehouseStock -= q;
        agentCustodyByAgent[tx.toLocationId] = (agentCustodyByAgent[tx.toLocationId] ?? 0) + q;
        break;
      case 'agent_to_retailer':
        agentCustodyByAgent[tx.fromLocationId] = (agentCustodyByAgent[tx.fromLocationId] ?? 0) - q;
        retailerCustodyByRetailer[tx.toLocationId] =
          (retailerCustodyByRetailer[tx.toLocationId] ?? 0) + q;
        break;
      case 'retailer_sale':
        retailerCustodyByRetailer[tx.fromLocationId] =
          (retailerCustodyByRetailer[tx.fromLocationId] ?? 0) - q;
        soldThroughRetailers += q;
        break;
      case 'agent_return_to_warehouse':
        agentCustodyByAgent[tx.fromLocationId] = (agentCustodyByAgent[tx.fromLocationId] ?? 0) - q;
        warehouseStock += q;
        break;
      case 'retailer_return_to_agent':
        retailerCustodyByRetailer[tx.fromLocationId] =
          (retailerCustodyByRetailer[tx.fromLocationId] ?? 0) - q;
        agentCustodyByAgent[tx.toLocationId] = (agentCustodyByAgent[tx.toLocationId] ?? 0) + q;
        break;
      case 'retailer_return_to_warehouse':
        retailerCustodyByRetailer[tx.fromLocationId] =
          (retailerCustodyByRetailer[tx.fromLocationId] ?? 0) - q;
        warehouseStock += q;
        break;
      case 'b2c_reservation':
      case 'b2c_fulfillment':
        warehouseStock -= q;
        soldDirectB2c += q;
        break;
      case 'damaged_stock':
        if (tx.fromLocationType === 'warehouse') {
          warehouseStock -= q;
        } else if (tx.fromLocationType === 'agent') {
          agentCustodyByAgent[tx.fromLocationId] =
            (agentCustodyByAgent[tx.fromLocationId] ?? 0) - q;
        } else if (tx.fromLocationType === 'retailer') {
          retailerCustodyByRetailer[tx.fromLocationId] =
            (retailerCustodyByRetailer[tx.fromLocationId] ?? 0) - q;
        }
        damagedOrQuarantined += q;
        break;
      case 'stock_adjustment':
        if (tx.toLocationType === 'warehouse') {
          initialAndInbound += q;
          warehouseStock += q;
        } else if (tx.fromLocationType === 'warehouse') {
          warehouseStock -= q;
          damagedOrQuarantined += q;
        }
        break;
    }
  }

  const totalAgentCustody = Object.values(agentCustodyByAgent).reduce((a, b) => a + b, 0);
  const totalRetailerCustody = Object.values(retailerCustodyByRetailer).reduce((a, b) => a + b, 0);
  const totalAccountedFor =
    warehouseStock +
    totalAgentCustody +
    totalRetailerCustody +
    soldThroughRetailers +
    soldDirectB2c +
    damagedOrQuarantined;

  return {
    initialAndInbound,
    warehouseStock,
    totalAgentCustody,
    totalRetailerCustody,
    soldThroughRetailers,
    soldDirectB2c,
    damagedOrQuarantined,
    agentCustodyByAgent,
    retailerCustodyByRetailer,
    totalAccountedFor,
    isReconciled: totalAccountedFor === initialAndInbound,
  };
}

export function computeFinancialSummary(state: SaberCommerceState): FinancialReconciliationSummary {
  const activeInvoices = state.invoices.filter((inv) => inv.status !== 'reversed');
  const totalB2bReceivablesGenerated = activeInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalVerifiedB2bCollections = state.payments
    .filter((p) => p.status === 'verified')
    .reduce((s, p) => s + p.amount, 0);
  const totalOutstandingReceivables = activeInvoices.reduce((s, i) => s + i.remainingAmount, 0);
  const totalOverdueReceivables = activeInvoices
    .filter((i) => isInvoiceOverdue(i))
    .reduce((s, i) => s + i.remainingAmount, 0);
  const totalPendingPaymentsAmount = state.payments
    .filter((p) => p.status === 'pending')
    .reduce((s, p) => s + p.amount, 0);

  const totalB2cRevenue = state.b2cOrders
    .filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'refunded')
    .reduce((s, o) => s + o.totalPayable, 0);

  const activeCommissions = state.commissions.filter(
    (c) => c.status !== 'cancelled' && c.status !== 'reversed'
  );
  const totalCommissionCalculated = activeCommissions.reduce((s, c) => s + c.commissionAmount, 0);
  const totalCommissionPaid = activeCommissions.reduce((s, c) => s + c.paidAmount, 0);
  const totalCommissionUnpaid = activeCommissions.reduce((s, c) => s + c.remainingPayable, 0);

  const agentCashByAgent: Record<string, { collected: number; remitted: number; held: number }> = {};
  for (const ag of state.agents) {
    agentCashByAgent[ag.id] = { collected: 0, remitted: 0, held: 0 };
  }
  for (const col of state.agentCashCollections) {
    if (!agentCashByAgent[col.agentId]) {
      agentCashByAgent[col.agentId] = { collected: 0, remitted: 0, held: 0 };
    }
    agentCashByAgent[col.agentId].collected += col.amount;
  }
  for (const rem of state.agentRemittances.filter((r) => r.status === 'verified')) {
    if (!agentCashByAgent[rem.agentId]) {
      agentCashByAgent[rem.agentId] = { collected: 0, remitted: 0, held: 0 };
    }
    agentCashByAgent[rem.agentId].remitted += rem.remittedAmount;
  }
  let totalAgentHeldCash = 0;
  for (const agId of Object.keys(agentCashByAgent)) {
    const item = agentCashByAgent[agId];
    item.held = Math.max(0, item.collected - item.remitted);
    totalAgentHeldCash += item.held;
  }

  const totalExpenses = state.expenses.reduce((s, e) => s + e.amount, 0);
  const verifiedBankBalance =
    totalVerifiedB2bCollections -
    totalAgentHeldCash +
    totalB2cRevenue -
    totalCommissionPaid -
    totalExpenses;

  const unallocatedCredit = state.payments.filter((p) => p.status === 'verified').reduce((s, p) => s + (p.unallocatedAmount ?? 0), 0);
  const isReceivablesReconciled =
    totalB2bReceivablesGenerated - (totalVerifiedB2bCollections - unallocatedCredit) === totalOutstandingReceivables;

  return {
    totalB2bReceivablesGenerated,
    totalVerifiedB2bCollections,
    totalOutstandingReceivables,
    totalOverdueReceivables,
    totalPendingPaymentsAmount,
    totalB2cRevenue,
    totalCommissionCalculated,
    totalCommissionPaid,
    totalCommissionUnpaid,
    totalAgentHeldCash,
    agentCashByAgent,
    totalExpenses,
    verifiedBankBalance,
    isReceivablesReconciled,
  };
}

export function calculateSuggestedRetailPrice(basePrice: number, markupPercent: number): number {
  return Math.round(basePrice * (1 + markupPercent / 100));
}

// 1. Product & Dynamic Pricing
export function createProduct(
  state: SaberCommerceState,
  input: {
    name: string;
    sku: string;
    brand: string;
    category: string;
    packaging: string;
    netWeightGrams: number;
    unit: string;
    description: string;
    costPrice: number;
    baseRetailerPrice: number;
    retailerMarkupPercent: number;
    directB2cPrice: number;
    minStockAlert: number;
    barcode: string;
    initialWarehouseStock?: number;
  }
): SaberCommerceState {
  const trimmedSku = input.sku.trim().toUpperCase();
  if (!input.name.trim()) {
    throw new Error('نام محصول الزامی است.');
  }
  if (!trimmedSku) {
    throw new Error('کد محصول (SKU) الزامی است.');
  }
  if (state.products.some((p) => p.sku.toUpperCase() === trimmedSku)) {
    throw new Error('کد محصول (SKU) تکراری است و باید یکتا باشد.');
  }
  if (input.netWeightGrams <= 0) {
    throw new Error('وزن خالص محصول باید عددی مثبت باشد.');
  }
  if (input.costPrice < 0 || input.baseRetailerPrice < 0 || input.directB2cPrice < 0) {
    throw new Error('قیمت‌های محصول نمی‌توانند منفی باشند.');
  }

  const now = nowIso();
  const suggestedRetailPrice = calculateSuggestedRetailPrice(
    input.baseRetailerPrice,
    input.retailerMarkupPercent
  );
  const newProd: Product = {
    id: `prod-${uid()}`,
    sku: trimmedSku,
    slug: trimmedSku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: input.name.trim(),
    brand: input.brand.trim() || state.settings.businessName,
    category: input.category.trim(),
    packaging: input.packaging.trim(),
    netWeightGrams: input.netWeightGrams,
    unit: input.unit.trim() || 'بسته',
    description: input.description.trim(),
    costPrice: Math.round(input.costPrice),
    baseRetailerPrice: Math.round(input.baseRetailerPrice),
    retailerMarkupPercent: input.retailerMarkupPercent,
    suggestedRetailPrice,
    directB2cPrice: Math.round(input.directB2cPrice),
    priceEffectiveDate: now,
    minStockAlert: input.minStockAlert,
    barcode: input.barcode.trim(),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const nextInventoryTxs = [...state.inventoryTransactions];
  if (input.initialWarehouseStock && input.initialWarehouseStock > 0) {
    nextInventoryTxs.push({
      id: `inv-tx-${uid()}`,
      productId: newProd.id,
      movementType: 'initial_stock',
      fromLocationType: 'external',
      fromLocationId: 'supplier-initial',
      toLocationType: 'warehouse',
      toLocationId: 'main-warehouse',
      quantity: Math.round(input.initialWarehouseStock),
      unitPriceSnapshot: newProd.costPrice,
      createdAt: now,
      createdBy: actor().name,
      notes: `ثبت موجودی اولیه برای ${newProd.name}`,
    });
  }

  return {
    ...state,
    version: state.version + 1,
    products: [...state.products, newProd],
    priceHistory: [
      ...state.priceHistory,
      {
        id: `ph-${uid()}`,
        productId: newProd.id,
        costPrice: newProd.costPrice,
        baseRetailerPrice: newProd.baseRetailerPrice,
        retailerMarkupPercent: newProd.retailerMarkupPercent,
        suggestedRetailPrice: newProd.suggestedRetailPrice,
        directB2cPrice: newProd.directB2cPrice,
        effectiveDate: now,
        createdBy: actor().name,
      },
    ],
    inventoryTransactions: nextInventoryTxs,
    auditLogs: [
      {
        id: `aud-${uid()}`,
        actorRole: actor().role,
        actorName: actor().name,
        action: 'CREATE_PRODUCT',
        entityType: 'Product',
        entityId: newProd.id,
        details: `ثبت محصول جدید: ${newProd.name} (${newProd.sku})`,
        timestamp: now,
      },
      ...state.auditLogs,
    ],
  };
}

export function updateProductPricing(
  state: SaberCommerceState,
  input: {
    productId: string;
    costPrice: number;
    baseRetailerPrice: number;
    retailerMarkupPercent: number;
    directB2cPrice: number;
    campaignPrice?: number;
  }
): SaberCommerceState {
  if (input.costPrice < 0 || input.baseRetailerPrice < 0 || input.directB2cPrice < 0) {
    throw new Error('قیمت‌ها نمی‌توانند منفی باشند.');
  }
  const prod = state.products.find((p) => p.id === input.productId);
  if (!prod) {
    throw new Error('محصول مورد نظر یافت نشد.');
  }
  const now = nowIso();
  const suggestedRetailPrice = calculateSuggestedRetailPrice(
    input.baseRetailerPrice,
    input.retailerMarkupPercent
  );

  // Historical orders, deliveries, and invoices retain their unitPriceSnapshot untouched!
  const updatedProduct: Product = {
    ...prod,
    costPrice: Math.round(input.costPrice),
    baseRetailerPrice: Math.round(input.baseRetailerPrice),
    retailerMarkupPercent: input.retailerMarkupPercent,
    suggestedRetailPrice,
    directB2cPrice: Math.round(input.directB2cPrice),
    campaignPrice: input.campaignPrice ? Math.round(input.campaignPrice) : undefined,
    priceEffectiveDate: now,
    updatedAt: now,
  };

  return {
    ...state,
    version: state.version + 1,
    products: state.products.map((p) => (p.id === prod.id ? updatedProduct : p)),
    priceHistory: [
      {
        id: `ph-${uid()}`,
        productId: prod.id,
        costPrice: updatedProduct.costPrice,
        baseRetailerPrice: updatedProduct.baseRetailerPrice,
        retailerMarkupPercent: updatedProduct.retailerMarkupPercent,
        suggestedRetailPrice: updatedProduct.suggestedRetailPrice,
        directB2cPrice: updatedProduct.directB2cPrice,
        campaignPrice: updatedProduct.campaignPrice,
        effectiveDate: now,
        createdBy: actor().name,
      },
      ...state.priceHistory,
    ],
    auditLogs: [
      {
        id: `aud-${uid()}`,
        actorRole: actor().role,
        actorName: actor().name,
        action: 'UPDATE_PRODUCT_PRICING',
        entityType: 'Product',
        entityId: prod.id,
        details: `به‌روزرسانی قیمت ${prod.name}: تسویه ${updatedProduct.baseRetailerPrice} / مصرف‌کننده B2C ${updatedProduct.directB2cPrice}`,
        timestamp: now,
      },
      ...state.auditLogs,
    ],
  };
}

// 2. Agent & Retailer Management
export function createSalesAgent(
  state: SaberCommerceState,
  input: {
    fullName: string;
    mobile: string;
    nationalId?: string;
    address: string;
    commissionRatePercent: number;
    custodyPolicyMode: CustodyPolicyMode;
    assignedRetailerIds?: string[];
    notes?: string;
  }
): SaberCommerceState {
  if (!input.fullName.trim()) {
    throw new Error('نام و نام خانوادگی بازاریاب الزامی است.');
  }
  if (!isValidIranianMobile(input.mobile)) {
    throw new Error('شماره موبایل بازاریاب معتبر نیست (فرمت صحیح: 09XXXXXXXXX).');
  }
  if (state.agents.some((a) => a.mobile === input.mobile.trim())) {
    throw new Error('شماره موبایل بازاریاب تکراری است.');
  }

  const nextIndex = state.agents.length + 1;
  const code = `AG-${String(nextIndex).padStart(2, '0')}`;
  const agentId = `ag-${uid()}`;
  const ruleId = `crule-${uid()}`;
  const now = nowIso();

  const newRule: CommissionRule = {
    id: ruleId,
    name: `قانون پورسانت وصول مطالبات (${input.commissionRatePercent}٪) — ${input.fullName.trim()}`,
    agentId,
    channel: 'B2B',
    method: 'verified_collections_percent',
    rateOrAmount: input.commissionRatePercent,
    effectiveStartDate: now,
    minThreshold: 0,
    isActive: true,
    notes: input.notes || 'قانون پورسانت اختصاصی بازاریاب',
  };

  const newAgent: SalesAgent = {
    id: agentId,
    code,
    fullName: input.fullName.trim(),
    mobile: input.mobile.trim(),
    nationalId: input.nationalId?.trim(),
    address: input.address.trim(),
    startDate: now,
    status: 'active',
    username: `agent_${nextIndex}`,
    commissionRuleId: ruleId,
    commissionRatePercent: input.commissionRatePercent,
    custodyPolicyMode: input.custodyPolicyMode,
    assignedRetailerIds: input.assignedRetailerIds ?? [],
    notes: input.notes ?? '',
  };

  const updatedRetailers = state.retailers.map((rt) =>
    (input.assignedRetailerIds ?? []).includes(rt.id) ? { ...rt, agentId } : rt
  );

  return {
    ...state,
    version: state.version + 1,
    agents: [...state.agents, newAgent],
    commissionRules: [...state.commissionRules, newRule],
    retailers: updatedRetailers,
    auditLogs: [
      {
        id: `aud-${uid()}`,
        actorRole: actor().role,
        actorName: actor().name,
        action: 'CREATE_AGENT',
        entityType: 'SalesAgent',
        entityId: agentId,
        details: `ثبت بازاریاب جدید ${newAgent.fullName} با کد ${code} و نرخ پورسانت ${input.commissionRatePercent}٪`,
        timestamp: now,
      },
      ...state.auditLogs,
    ],
  };
}

export function createRetailer(
  state: SaberCommerceState,
  input: {
    storeName: string;
    ownerName: string;
    mobile: string;
    landline?: string;
    address: string;
    province: string;
    city: string;
    district: string;
    postalCode: string;
    agentId: string;
    acquisitionAgentId?: string;
    settlementIntervalDays?: number;
    deliveryMode?: CustodyPolicyMode;
    creditLimit?: number;
    notes?: string;
    /** admin = active at once; public/agent = pending until approveRetailer */
    source?: 'admin' | 'public' | 'agent';
  }
): SaberCommerceState {
  if (!input.storeName.trim()) {
    throw new Error('نام فروشگاه الزامی است.');
  }
  if (!isValidIranianMobile(input.mobile)) {
    throw new Error('شماره موبایل مسئول فروشگاه معتبر نیست.');
  }
  const nextIndex = 1 + Math.max(0, ...state.retailers.map((r) => Number(/(\d+)$/.exec(r.code)?.[1] ?? 0)));
  const code = `RT-${String(nextIndex).padStart(2, '0')}`;
  const retailerId = `rt-${uid()}`;
  const now = nowIso();

  const newRetailer: Retailer = {
    id: retailerId,
    code,
    storeName: input.storeName.trim(),
    ownerName: input.ownerName.trim() || 'مسئول فروشگاه',
    mobile: input.mobile.trim(),
    landline: input.landline?.trim() || '',
    address: input.address.trim(),
    province: input.province.trim() || 'تهران',
    city: input.city.trim() || 'تهران',
    district: input.district.trim(),
    postalCode: input.postalCode.trim() || '1456789000',
    agentId: input.agentId,
    acquisitionAgentId: input.acquisitionAgentId || input.agentId,
    registrationDate: now,
    approvedDate: input.source && input.source !== 'admin' ? undefined : now,
    approvedBy: input.source && input.source !== 'admin' ? undefined : actor().name,
    status: input.source && input.source !== 'admin' ? 'pending' : 'active',
    settlementIntervalDays: input.settlementIntervalDays ?? state.settings.settlementPeriodDays,
    deliveryMode: input.deliveryMode ?? state.settings.defaultRetailerDeliveryMode,
    creditLimit: input.creditLimit ?? 5000000,
    nextSettlementDate: new Date(nowMs() + 14 * 86400000).toISOString(),
    hasOverdueReceivable: false,
    notes: input.notes ?? '',
  };

  const updatedAgents = state.agents.map((ag) =>
    ag.id === input.agentId && !ag.assignedRetailerIds.includes(retailerId)
      ? { ...ag, assignedRetailerIds: [...ag.assignedRetailerIds, retailerId] }
      : ag
  );

  return {
    ...state,
    version: state.version + 1,
    retailers: [...state.retailers, newRetailer],
    agents: updatedAgents,
    auditLogs: [
      {
        id: `aud-${uid()}`,
        actorRole: actor().role,
        actorName: actor().name,
        action: 'CREATE_RETAILER',
        entityType: 'Retailer',
        entityId: retailerId,
        details: `ثبت سوپرمارکت جدید ${newRetailer.storeName} (${code})`,
        timestamp: now,
      },
      ...state.auditLogs,
    ],
  };
}

// 3. Warehouse Stock Receipt & Signed Delivery Workflows (Forms 1 & 2)
export function recordSupplierStockReceipt(
  state: SaberCommerceState,
  input: {
    productId: string;
    quantity: number;
    supplierName: string;
    unitCostPrice?: number;
    notes?: string;
  }
): SaberCommerceState {
  if (input.quantity <= 0) {
    throw new Error('تعداد ورودی انبار باید بیشتر از صفر باشد.');
  }
  const prod = state.products.find((p) => p.id === input.productId);
  if (!prod) {
    throw new Error('محصول یافت نشد.');
  }
  const now = nowIso();
  const unitCost = input.unitCostPrice ?? prod.costPrice;

  return {
    ...state,
    version: state.version + 1,
    inventoryTransactions: [
      ...state.inventoryTransactions,
      {
        id: `inv-tx-sup-${uid()}`,
        productId: prod.id,
        movementType: 'supplier_receipt',
        fromLocationType: 'external',
        fromLocationId: input.supplierName.trim() || 'تأمین‌کننده نخلستان',
        toLocationType: 'warehouse',
        toLocationId: 'main-warehouse',
        quantity: Math.round(input.quantity),
        unitPriceSnapshot: unitCost,
        createdAt: now,
        createdBy: actor().name,
        notes: input.notes || `ورود ${input.quantity} بسته از تأمین‌کننده ${input.supplierName}`,
      },
    ],
  };
}

export function createWarehouseToAgentDeliveryDraft(
  state: SaberCommerceState,
  input: {
    agentId: string;
    productId: string;
    quantity: number;
    policyMode?: CustodyPolicyMode;
    isEmergencyException?: boolean;
    notes?: string;
  }
): { nextState: SaberCommerceState; createdDocument: OfficialDocument } {
  if (input.quantity <= 0) {
    throw new Error('تعداد تحویل به بازاریاب باید مثبت باشد.');
  }
  const inv = computeInventorySummary(state, input.productId);
  if (inv.warehouseStock < input.quantity) {
    throw new Error(
      `موجودی انبار مرکزی کافی نیست (موجودی فعلی: ${inv.warehouseStock} بسته، درخواستی: ${input.quantity} بسته).`
    );
  }
  const agent = state.agents.find((a) => a.id === input.agentId);
  const product = state.products.find((p) => p.id === input.productId);
  if (!agent || !product) {
    throw new Error('بازاریاب یا محصول معتبر نیست.');
  }

  const mode = input.policyMode ?? agent.custodyPolicyMode;
  const seq =
    state.documents.filter((d) => d.documentType === 'agent_delivery').length + 1;
  const docNum = `AG-${state.settings.documentNumberPrefixYear}-${String(seq).padStart(5, '0')}`;
  const docId = `doc-ag-${uid()}`;
  const now = nowIso();

  const createdDocument: OfficialDocument = {
    id: docId,
    documentNumber: docNum,
    documentType: 'agent_delivery',
    title: 'رسید تحویل کالا و تعهد نگهداری بازاریاب',
    issueDate: now,
    agentId: agent.id,
    productId: product.id,
    quantity: Math.round(input.quantity),
    unitReferencePrice: product.baseRetailerPrice,
    totalReferenceValue: Math.round(input.quantity) * product.baseRetailerPrice,
    policyMode: mode,
    declarationText:
      mode === 'credit_sale'
        ? state.settings.agentCreditDeclaration
        : state.settings.agentConsignmentDeclaration,
    verificationStatus: input.isEmergencyException ? 'emergency_pending' : 'pending_signature',
    isDemoPlaceholder: false,
    signerAgentName: agent.fullName,
    signerWarehouseName: 'سرپرست انبار مرکزی',
    emergencyDeadline: input.isEmergencyException
      ? new Date(nowMs() + 2 * 86400000).toISOString()
      : undefined,
    attachments: [],
    notes: input.notes || `پیش‌نویس رسید تحویل ${input.quantity} بسته به ${agent.fullName}`,
  };

  return {
    createdDocument,
    nextState: {
      ...state,
      version: state.version + 1,
      documents: [createdDocument, ...state.documents],
    },
  };
}

export function createAgentToRetailerDeliveryDraft(
  state: SaberCommerceState,
  input: {
    agentId: string;
    retailerId: string;
    productId: string;
    quantity: number;
    deliveryMode?: CustodyPolicyMode;
    notes?: string;
  }
): { nextState: SaberCommerceState; createdDocument: OfficialDocument } {
  if (input.quantity <= 0) {
    throw new Error('تعداد تحویل به فروشگاه باید بیشتر از صفر باشد.');
  }
  const inv = computeInventorySummary(state, input.productId);
  const agentHeld = inv.agentCustodyByAgent[input.agentId] ?? 0;
  if (agentHeld < input.quantity) {
    throw new Error(
      `موجودی تحت امانت بازاریاب کافی نیست (موجودی نزد بازاریاب: ${agentHeld} بسته، درخواستی: ${input.quantity} بسته).`
    );
  }
  const agent = state.agents.find((a) => a.id === input.agentId);
  const retailer = state.retailers.find((r) => r.id === input.retailerId);
  const product = state.products.find((p) => p.id === input.productId);
  if (!agent || !retailer || !product) {
    throw new Error('اطلاعات بازاریاب، فروشگاه یا محصول یافت نشد.');
  }

  const mode = input.deliveryMode ?? retailer.deliveryMode;
  const seq =
    state.documents.filter((d) => d.documentType === 'retailer_delivery').length + 1;
  const docNum = `RT-${state.settings.documentNumberPrefixYear}-${String(seq).padStart(5, '0')}`;
  const docId = `doc-rt-${uid()}`;
  const now = nowIso();

  const createdDocument: OfficialDocument = {
    id: docId,
    documentNumber: docNum,
    documentType: 'retailer_delivery',
    title: 'رسید تحویل امانی محصول به فروشگاه',
    issueDate: now,
    agentId: agent.id,
    retailerId: retailer.id,
    productId: product.id,
    quantity: Math.round(input.quantity),
    unitReferencePrice: product.baseRetailerPrice,
    retailerMarkupPercent: product.retailerMarkupPercent,
    suggestedRetailPrice: product.suggestedRetailPrice,
    totalReferenceValue: Math.round(input.quantity) * product.baseRetailerPrice,
    policyMode: mode,
    declarationText: state.settings.retailerConsignmentDeclaration,
    verificationStatus: 'pending_signature',
    isDemoPlaceholder: false,
    signerAgentName: agent.fullName,
    signerRetailerName: retailer.ownerName,
    attachments: [],
    notes: input.notes || `رسید تحویل ${input.quantity} بسته به ${retailer.storeName}`,
  };

  return {
    createdDocument,
    nextState: {
      ...state,
      version: state.version + 1,
      documents: [createdDocument, ...state.documents],
    },
  };
}

export function uploadSignedDocumentAttachment(
  state: SaberCommerceState,
  input: {
    documentId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: string;
    previewDataUrl?: string;
    /** set by the server after it stored the bytes and hashed them (SHA-256 of the real content) */
    attachmentId?: string;
    checksumSha256?: string;
    storageKey?: string;
  }
): SaberCommerceState {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedMimes.includes(input.mimeType)) {
    throw new Error('فرمت فایل مجاز نیست. فقط تصاویر (JPG, PNG, WebP) یا PDF مجاز هستند.');
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > 10 * 1024 * 1024) {
    throw new Error('حجم فایل باید کمتر از ۱۰ مگابایت باشد.');
  }

  const doc = state.documents.find((d) => d.id === input.documentId);
  if (!doc) {
    throw new Error('سند مورد نظر یافت نشد.');
  }

  const now = nowIso();
  const nextVer = doc.attachments.length + 1;
  const newAttachment: DocumentAttachment = {
    id: input.attachmentId ?? `att-${uid()}`,
    documentId: doc.id,
    originalFilename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploadedBy: input.uploadedBy,
    uploadedAt: now,
    checksumSha256: input.checksumSha256 ?? computeSimpleChecksum(`${doc.documentNumber}-${input.filename}-${now}`),
    storageKey: input.storageKey ?? `private/documents/${state.settings.documentNumberPrefixYear}/${doc.documentNumber}-v${nextVer}`,
    version: nextVer,
    previewDataUrl: input.previewDataUrl,
  };

  return {
    ...state,
    version: state.version + 1,
    documents: state.documents.map((d) =>
      d.id === doc.id
        ? {
            ...d,
            verificationStatus:
              d.verificationStatus === 'verified' ? 'verified' : 'uploaded',
            isDemoPlaceholder: false,
            attachments: [...d.attachments, newAttachment],
          }
        : d
    ),
  };
}

export function verifyOfficialDocument(
  state: SaberCommerceState,
  input: {
    documentId: string;
    adminName?: string;
  }
): SaberCommerceState {
  const doc = state.documents.find((d) => d.id === input.documentId);
  if (!doc) {
    throw new Error('سند یافت نشد.');
  }
  if (doc.verificationStatus === 'verified') {
    return state; // Idempotent: do not duplicate inventory transfer
  }
  if (doc.attachments.length === 0 && doc.verificationStatus !== 'emergency_pending') {
    throw new Error('بدون بارگذاری تصویر امضاشده، امکان تأیید نهایی انتقال وجود ندارد.');
  }

  const inv = computeInventorySummary(state, doc.productId);
  const now = nowIso();
  const nextInventoryTxs = [...state.inventoryTransactions];
  const nextConsignmentDeliveries = [...state.consignmentDeliveries];
  const nextInvoices = [...state.invoices];

  if (doc.documentType === 'agent_delivery') {
    if (!doc.agentId) throw new Error('بازاریاب سند مشخص نیست.');
    if (inv.warehouseStock < doc.quantity) {
      throw new Error('موجودی انبار برای نهایی‌سازی این حواله کافی نیست.');
    }
    nextInventoryTxs.push({
      id: `inv-tx-w2a-${uid()}`,
      productId: doc.productId,
      movementType: 'warehouse_to_agent',
      fromLocationType: 'warehouse',
      fromLocationId: 'main-warehouse',
      toLocationType: 'agent',
      toLocationId: doc.agentId,
      quantity: doc.quantity,
      unitPriceSnapshot: doc.unitReferencePrice,
      referenceDocumentId: doc.id,
      createdAt: now,
      createdBy: input.adminName || actor().name,
      notes: `تأیید نهایی رسید تحویل به بازاریاب (${doc.documentNumber})`,
    });
  } else if (doc.documentType === 'retailer_delivery') {
    if (!doc.agentId || !doc.retailerId) {
      throw new Error('بازاریاب یا فروشگاه در سند مشخص نیست.');
    }
    const agentHeld = inv.agentCustodyByAgent[doc.agentId] ?? 0;
    if (agentHeld < doc.quantity) {
      throw new Error('موجودی امانی بازاریاب برای نهایی‌سازی تحویل به فروشگاه کافی نیست.');
    }
    nextInventoryTxs.push({
      id: `inv-tx-a2r-${uid()}`,
      productId: doc.productId,
      movementType: 'agent_to_retailer',
      fromLocationType: 'agent',
      fromLocationId: doc.agentId,
      toLocationType: 'retailer',
      toLocationId: doc.retailerId,
      quantity: doc.quantity,
      unitPriceSnapshot: doc.unitReferencePrice,
      referenceDocumentId: doc.id,
      createdAt: now,
      createdBy: input.adminName || actor().name,
      notes: `تأیید نهایی تحویل به فروشگاه (${doc.documentNumber})`,
    });

    const delivId = `deliv-${uid()}`;
    nextConsignmentDeliveries.unshift({
      id: delivId,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      agentId: doc.agentId,
      retailerId: doc.retailerId,
      productId: doc.productId,
      quantityDelivered: doc.quantity,
      quantitySold: 0,
      quantityReturned: 0,
      quantityDamaged: 0,
      unitSettlementPriceSnapshot: doc.unitReferencePrice,
      retailerMarkupSnapshot: doc.retailerMarkupPercent ?? state.settings.defaultRetailerMarkupPercent,
      suggestedRetailPriceSnapshot:
        doc.suggestedRetailPrice ??
        calculateSuggestedRetailPrice(
          doc.unitReferencePrice,
          doc.retailerMarkupPercent ?? state.settings.defaultRetailerMarkupPercent
        ),
      deliveryMode: doc.policyMode,
      status: 'verified',
      deliveredAt: doc.issueDate,
      verifiedAt: now,
    });

    // If credit_sale mode is explicitly selected, create receivable immediately upon delivery verification
    if (doc.policyMode === 'credit_sale') {
      nextInvoices.unshift({
        id: `inv-cred-${uid()}`,
        invoiceNumber: `INV-1405-C${state.invoices.length + 1}`,
        retailerId: doc.retailerId,
        agentId: doc.agentId,
        sourceDeliveryId: delivId,
        productId: doc.productId,
        quantity: doc.quantity,
        unitPriceSnapshot: doc.unitReferencePrice,
        totalAmount: doc.totalReferenceValue,
        paidAmount: 0,
        remainingAmount: doc.totalReferenceValue,
        dueDate: new Date(nowMs() + 14 * 86400000).toISOString(),
        isOverdue: false,
        status: 'open',
        createdAt: now,
      });
    }
  }

  return {
    ...state,
    version: state.version + 1,
    documents: state.documents.map((d) =>
      d.id === doc.id
        ? {
            ...d,
            verificationStatus: 'verified',
            approvedByAdmin: input.adminName || actor().name,
            approvedAt: now,
          }
        : d
    ),
    inventoryTransactions: nextInventoryTxs,
    consignmentDeliveries: nextConsignmentDeliveries,
    invoices: nextInvoices,
  };
}

// 4. Returns (Forms 3 & 4)
export function recordAgentReturnToWarehouse(
  state: SaberCommerceState,
  input: {
    agentId: string;
    productId: string;
    quantityReturned: number;
    condition: 'healthy' | 'damaged';
    reason: string;
    originalDocumentNumber?: string;
  }
): SaberCommerceState {
  if (input.quantityReturned <= 0) {
    throw new Error('تعداد برگشتی باید بیشتر از صفر باشد.');
  }
  const inv = computeInventorySummary(state, input.productId);
  const agentHeld = inv.agentCustodyByAgent[input.agentId] ?? 0;
  if (input.quantityReturned > agentHeld) {
    throw new Error(
      `تعداد برگشتی (${input.quantityReturned}) بیشتر از موجودی تحت مسئولیت بازاریاب (${agentHeld}) است.`
    );
  }
  const agent = state.agents.find((a) => a.id === input.agentId);
  const product = state.products.find((p) => p.id === input.productId);
  if (!agent || !product) throw new Error('بازاریاب یا محصول یافت نشد.');

  const now = nowIso();
  const seq = state.documents.filter((d) => d.documentType === 'agent_return').length + 1;
  const docNum = `AR-${state.settings.documentNumberPrefixYear}-${String(seq).padStart(5, '0')}`;
  const docId = `doc-ar-${uid()}`;

  const returnDoc: OfficialDocument = {
    id: docId,
    documentNumber: docNum,
    documentType: 'agent_return',
    title: 'رسید برگشت کالای بازاریاب به انبار',
    issueDate: now,
    agentId: agent.id,
    productId: product.id,
    quantity: input.quantityReturned,
    unitReferencePrice: product.baseRetailerPrice,
    totalReferenceValue: input.quantityReturned * product.baseRetailerPrice,
    policyMode: 'consignment',
    declarationText: `برگشت ${input.quantityReturned} بسته به انبار مرکزی به علت: ${input.reason}`,
    verificationStatus: 'verified',
    isDemoPlaceholder: false,
    signerAgentName: agent.fullName,
    signerWarehouseName: 'سرپرست انبار مرکزی',
    approvedByAdmin: actor().name,
    approvedAt: now,
    attachments: [],
    notes: input.reason,
  };

  return {
    ...state,
    version: state.version + 1,
    documents: [returnDoc, ...state.documents],
    inventoryTransactions: [
      ...state.inventoryTransactions,
      {
        id: `inv-tx-ar-${uid()}`,
        productId: product.id,
        movementType: input.condition === 'damaged' ? 'damaged_stock' : 'agent_return_to_warehouse',
        fromLocationType: 'agent',
        fromLocationId: agent.id,
        toLocationType: input.condition === 'damaged' ? 'damaged' : 'warehouse',
        toLocationId: input.condition === 'damaged' ? 'quarantine' : 'main-warehouse',
        quantity: input.quantityReturned,
        unitPriceSnapshot: product.baseRetailerPrice,
        referenceDocumentId: docId,
        createdAt: now,
        createdBy: agent.fullName,
        notes: `برگشت از بازاریاب به انبار (${docNum}): ${input.reason}`,
      },
    ],
  };
}

export function recordRetailerReturn(
  state: SaberCommerceState,
  input: {
    retailerId: string;
    destination: 'agent' | 'warehouse';
    productId: string;
    quantityReturned: number;
    reason: string;
  }
): SaberCommerceState {
  if (input.quantityReturned <= 0) {
    throw new Error('تعداد مرجوعی باید بیشتر از صفر باشد.');
  }
  const inv = computeInventorySummary(state, input.productId);
  const retailerHeld = inv.retailerCustodyByRetailer[input.retailerId] ?? 0;
  if (input.quantityReturned > retailerHeld) {
    throw new Error(
      `تعداد مرجوعی (${input.quantityReturned}) نمی‌تواند بیشتر از موجودی امانی فروشگاه (${retailerHeld}) باشد.`
    );
  }
  const retailer = state.retailers.find((r) => r.id === input.retailerId);
  const product = state.products.find((p) => p.id === input.productId);
  if (!retailer || !product) throw new Error('فروشگاه یا محصول یافت نشد.');

  const now = nowIso();
  const seq = state.documents.filter((d) => d.documentType === 'retailer_return').length + 1;
  const docNum = `RR-${state.settings.documentNumberPrefixYear}-${String(seq).padStart(5, '0')}`;
  const docId = `doc-rr-${uid()}`;

  const returnDoc: OfficialDocument = {
    id: docId,
    documentNumber: docNum,
    documentType: 'retailer_return',
    title: 'رسید مرجوعی کالا از فروشگاه',
    issueDate: now,
    agentId: retailer.agentId,
    retailerId: retailer.id,
    productId: product.id,
    quantity: input.quantityReturned,
    unitReferencePrice: product.baseRetailerPrice,
    totalReferenceValue: input.quantityReturned * product.baseRetailerPrice,
    policyMode: 'consignment',
    declarationText: `مرجوعی ${input.quantityReturned} بسته از فروشگاه ${retailer.storeName}`,
    verificationStatus: 'verified',
    isDemoPlaceholder: false,
    signerRetailerName: retailer.ownerName,
    approvedByAdmin: actor().name,
    approvedAt: now,
    attachments: [],
    notes: input.reason,
  };

  return {
    ...state,
    version: state.version + 1,
    documents: [returnDoc, ...state.documents],
    inventoryTransactions: [
      ...state.inventoryTransactions,
      {
        id: `inv-tx-rr-${uid()}`,
        productId: product.id,
        movementType:
          input.destination === 'agent'
            ? 'retailer_return_to_agent'
            : 'retailer_return_to_warehouse',
        fromLocationType: 'retailer',
        fromLocationId: retailer.id,
        toLocationType: input.destination === 'agent' ? 'agent' : 'warehouse',
        toLocationId: input.destination === 'agent' ? retailer.agentId : 'main-warehouse',
        quantity: input.quantityReturned,
        unitPriceSnapshot: product.baseRetailerPrice,
        referenceDocumentId: docId,
        createdAt: now,
        createdBy: retailer.ownerName,
        notes: `مرجوعی از فروشگاه ${retailer.storeName} (${docNum})`,
      },
    ],
  };
}

// 5. Retailer Sales Report (Form 5)
export function submitAndVerifyRetailerSalesReport(
  state: SaberCommerceState,
  input: {
    retailerId: string;
    productId: string;
    reportedSoldQuantity: number;
    physicalCountedStock?: number;
    damagedQuantity?: number;
    autoVerify?: boolean;
    idempotencyKey?: string;
    notes?: string;
  }
): SaberCommerceState {
  if (input.reportedSoldQuantity <= 0) {
    throw new Error('تعداد فروش گزارش‌شده باید بیشتر از صفر باشد.');
  }
  const idemKey =
    input.idempotencyKey ||
    `sr-${input.retailerId}-${input.productId}-${input.reportedSoldQuantity}-${uid()}`;
  if (state.salesReports.some((r) => r.idempotencyKey === idemKey)) {
    return state; // Idempotent: prevent duplicate sales/receivable generation
  }

  const inv = computeInventorySummary(state, input.productId);
  const currentRetailerStock = inv.retailerCustodyByRetailer[input.retailerId] ?? 0;
  const damaged = input.damagedQuantity ?? 0;
  if (input.reportedSoldQuantity + damaged > currentRetailerStock) {
    throw new Error(
      `مجموع فروش (${input.reportedSoldQuantity}) و آسیب‌دیده (${damaged}) بیشتر از موجودی امانی فعلی فروشگاه (${currentRetailerStock} بسته) است.`
    );
  }

  const retailer = state.retailers.find((r) => r.id === input.retailerId);
  const product = state.products.find((p) => p.id === input.productId);
  if (!retailer || !product) throw new Error('فروشگاه یا محصول یافت نشد.');

  // Preserve original consignment delivery price snapshot if available
  const latestDelivery = state.consignmentDeliveries.find(
    (d) => d.retailerId === retailer.id && d.productId === product.id && d.status === 'verified'
  );
  const unitSettlementPriceSnapshot =
    latestDelivery?.unitSettlementPriceSnapshot ?? product.baseRetailerPrice;

  // period maths from the ledger (Part 18): opening + received - returned - sold - damaged = closing
  const previous = state.salesReports
    .filter((r) => r.retailerId === retailer.id && r.productId === product.id && r.status !== 'rejected')
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
  const periodStart = previous?.periodEnd ?? retailer.registrationDate;
  const inPeriod = state.inventoryTransactions.filter(
    (x) => x.productId === product.id && x.createdAt > periodStart && x.createdAt <= nowIso()
  );
  const receivedQuantity = inPeriod
    .filter((x) => x.movementType === 'agent_to_retailer' && x.toLocationId === retailer.id)
    .reduce((s, x) => s + x.quantity, 0);
  const returnedQuantity = inPeriod
    .filter((x) => (x.movementType === 'retailer_return_to_agent' || x.movementType === 'retailer_return_to_warehouse') && x.fromLocationId === retailer.id)
    .reduce((s, x) => s + x.quantity, 0);
  const openingStockForPeriod = currentRetailerStock - receivedQuantity + returnedQuantity;
  const calculatedClosingStock = currentRetailerStock - input.reportedSoldQuantity - damaged;
  const physicalCountedStock = input.physicalCountedStock ?? calculatedClosingStock;
  const hasDiscrepancy = physicalCountedStock !== calculatedClosingStock;
  const receivableAmount = input.reportedSoldQuantity * unitSettlementPriceSnapshot;
  const now = nowIso();
  const reportId = `sr-${uid()}`;
  const reportNum = `SR-${state.settings.documentNumberPrefixYear}-${String(
    state.salesReports.length + 1
  ).padStart(5, '0')}`;

  const isVerified = input.autoVerify ?? true;

  const newReport: RetailerSalesReport = {
    id: reportId,
    reportNumber: reportNum,
    retailerId: retailer.id,
    agentId: retailer.agentId,
    productId: product.id,
    periodStart,
    periodEnd: now,
    openingStock: openingStockForPeriod,
    receivedQuantity,
    returnedQuantity,
    reportedSoldQuantity: input.reportedSoldQuantity,
    damagedQuantity: damaged,
    calculatedClosingStock,
    physicalCountedStock,
    hasDiscrepancy,
    unitSettlementPriceSnapshot,
    receivableGenerated: receivableAmount,
    status: isVerified ? 'verified_by_admin' : 'submitted',
    idempotencyKey: idemKey,
    createdAt: now,
    verifiedAt: isVerified ? now : undefined,
    notes: input.notes || `گزارش فروش ${input.reportedSoldQuantity} بسته توسط ${retailer.storeName}`,
  };

  const nextDiscrepancies = [...state.discrepancies];
  if (hasDiscrepancy) {
    nextDiscrepancies.unshift({
      id: `disc-${uid()}`,
      reportNumber: `DAMAGE-${state.settings.documentNumberPrefixYear}-${String(
        state.discrepancies.length + 1
      ).padStart(5, '0')}`,
      reportedBy: retailer.ownerName,
      locationType: 'retailer',
      locationId: retailer.id,
      productId: product.id,
      relatedDocumentNumber: reportNum,
      expectedQuantity: calculatedClosingStock,
      observedQuantity: physicalCountedStock,
      differenceQuantity: physicalCountedStock - calculatedClosingStock,
      damagedQuantity: damaged,
      lostQuantity: Math.max(0, calculatedClosingStock - physicalCountedStock),
      reason: 'مغایرت موجودی فیزیکی شمارش‌شده با موجودی محاسباتی گزارش فروش',
      resolution: 'pending_review',
      financialLiabilityGenerated: 0,
      createdAt: now,
      notes: 'ایجاد خودکار به علت اختلاف شمارش فیزیکی در گزارش فروش فروشگاه',
    });
  }

  const nextInventoryTxs = [...state.inventoryTransactions];
  const nextInvoices = [...state.invoices];
  const nextJournal = [...state.journalEntries];

  if (isVerified) {
    nextInventoryTxs.push({
      id: `inv-tx-sale-${uid()}`,
      productId: product.id,
      movementType: 'retailer_sale',
      fromLocationType: 'retailer',
      fromLocationId: retailer.id,
      toLocationType: 'customer',
      toLocationId: 'b2b-end-consumers',
      quantity: input.reportedSoldQuantity,
      unitPriceSnapshot: unitSettlementPriceSnapshot,
      referenceDocumentId: reportId,
      createdAt: now,
      createdBy: retailer.ownerName,
      notes: `کسر موجودی امانی بابت فروش ${input.reportedSoldQuantity} بسته (${reportNum})`,
    });

    if (damaged > 0) {
      nextInventoryTxs.push({
        id: `inv-tx-dmg-${uid()}`,
        productId: product.id,
        movementType: 'damaged_stock',
        fromLocationType: 'retailer',
        fromLocationId: retailer.id,
        toLocationType: 'damaged',
        toLocationId: 'quarantine',
        quantity: damaged,
        unitPriceSnapshot: unitSettlementPriceSnapshot,
        referenceDocumentId: reportId,
        createdAt: now,
        createdBy: retailer.ownerName,
        notes: `کالای آسیب‌دیده گزارش‌شده در ${reportNum}`,
      });
    }

    if (retailer.deliveryMode === 'consignment') {
      const invId = `inv-${uid()}`;
      const invNum = `INV-${state.settings.documentNumberPrefixYear}-${String(
        state.invoices.length + 1
      ).padStart(5, '0')}`;
      nextInvoices.unshift({
        id: invId,
        invoiceNumber: invNum,
        retailerId: retailer.id,
        agentId: retailer.agentId,
        sourceReportId: reportId,
        productId: product.id,
        quantity: input.reportedSoldQuantity,
        unitPriceSnapshot: unitSettlementPriceSnapshot,
        totalAmount: receivableAmount,
        paidAmount: 0,
        remainingAmount: receivableAmount,
        dueDate: new Date(
          nowMs() + retailer.settlementIntervalDays * 86400000
        ).toISOString(),
        isOverdue: false,
        status: 'open',
        createdAt: now,
      });

      nextJournal.unshift({
        id: `je-sr-${uid()}`,
        entryNumber: `JE-${state.settings.documentNumberPrefixYear}-${state.journalEntries.length + 100}`,
        entryDate: now,
        description: `ثبت مطالبات فروش امانی ${retailer.storeName} (${input.reportedSoldQuantity} بسته)`,
        referenceType: 'sale_report',
        referenceId: reportId,
        debitAccount: `حساب‌های دریافتنی فروشگاهی — ${retailer.storeName}`,
        creditAccount: 'درآمد فروش امانی B2B',
        amount: receivableAmount,
      });
    }
  }

  let result: SaberCommerceState = {
    ...state,
    version: state.version + 1,
    salesReports: [newReport, ...state.salesReports],
    discrepancies: nextDiscrepancies,
    inventoryTransactions: nextInventoryTxs,
    invoices: nextInvoices,
    journalEntries: nextJournal,
  };
  if (isVerified && retailer.deliveryMode === 'consignment') {
    // sale-based commission rules fire here; advance credit of earlier payments is applied to the new invoice
    const saleComms = commissionsForEvent(result, {
      kind: 'sale',
      sourceId: reportId,
      retailerId: retailer.id,
      salesAgentId: retailer.agentId,
      basis: receivableAmount,
      quantity: input.reportedSoldQuantity,
      productId: product.id,
    });
    if (saleComms.length) result = { ...result, commissions: [...saleComms, ...result.commissions] };
    result = applyRetailerCredit(result, retailer.id);
  }
  return result;
}

// 6. Retailer Payments, Allocations, Field Collections, Remittances & Commission Engine (Forms 6, 7, 8, 13, 14)
export function submitRetailerPayment(
  state: SaberCommerceState,
  input: {
    retailerId: string;
    amount: number;
    method: 'bank_transfer' | 'pos' | 'cash_to_agent' | 'other';
    bankName?: string;
    referenceNumber: string;
    collectingAgentId?: string;
    collectedByAgentDirectly?: boolean;
    autoVerify?: boolean;
    idempotencyKey?: string;
    notes?: string;
  }
): SaberCommerceState {
  if (input.amount <= 0) {
    throw new Error('مبلغ پرداختی باید بیشتر از صفر باشد.');
  }
  const retailer = state.retailers.find((r) => r.id === input.retailerId);
  if (!retailer) throw new Error('فروشگاه یافت نشد.');

  const idemKey =
    input.idempotencyKey || `pay-${input.retailerId}-${input.referenceNumber}-${input.amount}`;
  if (state.payments.some((p) => p.idempotencyKey === idemKey)) {
    return state;
  }

  const now = nowIso();
  const payId = `pay-${uid()}`;
  const payNum = `PAY-${state.settings.documentNumberPrefixYear}-${String(
    state.payments.length + 1
  ).padStart(5, '0')}`;

  const newPayment: RetailerPayment = {
    id: payId,
    paymentNumber: payNum,
    retailerId: retailer.id,
    collectingAgentId: input.collectingAgentId ?? retailer.agentId,
    salesAttributionAgentId: retailer.agentId,
    paymentDate: now,
    amount: Math.round(input.amount),
    method: input.method,
    bankName: input.bankName,
    referenceNumber: input.referenceNumber.trim() || `REF-${uid()}`,
    collectedByAgentDirectly: Boolean(input.collectedByAgentDirectly),
    status: 'pending',
    allocations: [],
    idempotencyKey: idemKey,
    notes: input.notes || 'ثبت واریزی فروشگاه',
  };

  const nextCashCollections = [...state.agentCashCollections];
  if (input.collectedByAgentDirectly) {
    nextCashCollections.unshift({
      id: `acash-${uid()}`,
      receiptNumber: `PAY-${state.settings.documentNumberPrefixYear}-C${
        state.agentCashCollections.length + 1
      }`,
      agentId: input.collectingAgentId ?? retailer.agentId,
      retailerId: retailer.id,
      paymentId: payId,
      amount: Math.round(input.amount),
      collectedAt: now,
      method: 'cash',
      holdingStatus: 'held_by_agent',
      notes: input.notes || 'دریافت وجه نقد توسط بازاریاب در محل فروشگاه',
    });
  }

  const withPending: SaberCommerceState = {
    ...state,
    version: state.version + 1,
    payments: [newPayment, ...state.payments],
    agentCashCollections: nextCashCollections,
  };

  if (input.autoVerify) {
    return verifyRetailerPayment(withPending, { paymentId: payId });
  }
  return withPending;
}

// ---------------------------------------------------------------------------
// Receivables, allocation and commission (rewritten 2026-10-31, findings F-006..F-008)
// ---------------------------------------------------------------------------

/** Overdue is derived from the due date and the clock, never stored by hand (F-008). */
export function isInvoiceOverdue(inv: ReceivableInvoice, at: number = nowMs()): boolean {
  return inv.status !== 'reversed' && inv.remainingAmount > 0 && Date.parse(inv.dueDate) < at;
}

/** Re-derives isOverdue / hasOverdueReceivable. Called by the server whenever a state is loaded. */
export function refreshOverdueFlags(state: SaberCommerceState): SaberCommerceState {
  const at = nowMs();
  const invoices = state.invoices.map((i) => {
    const o = isInvoiceOverdue(i, at);
    return o === i.isOverdue ? i : { ...i, isOverdue: o };
  });
  const overdueRetailers = new Set(invoices.filter((i) => i.isOverdue).map((i) => i.retailerId));
  const retailers = state.retailers.map((r) => {
    const o = overdueRetailers.has(r.id);
    return o === r.hasOverdueReceivable ? r : { ...r, hasOverdueReceivable: o };
  });
  return { ...state, invoices, retailers };
}

interface AllocationResult {
  invoices: ReceivableInvoice[];
  allocations: PaymentAllocation[];
  allocated: number;
}

/** FIFO (oldest invoice first) unless a target invoice is given. Money that no invoice absorbs is NOT lost: the caller records it. */
function allocateAmount(
  state: SaberCommerceState,
  payment: RetailerPayment,
  amount: number,
  targetInvoiceId?: string
): AllocationResult {
  let remaining = Math.max(0, Math.round(amount));
  const allocations: PaymentAllocation[] = [];
  const now = nowIso();
  const ordered = [...state.invoices].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const invoices = ordered.map((inv) => {
    if (inv.retailerId !== payment.retailerId || inv.status === 'reversed' || inv.remainingAmount <= 0 || remaining <= 0) return inv;
    if (targetInvoiceId && inv.id !== targetInvoiceId) return inv;
    const take = Math.min(inv.remainingAmount, remaining);
    remaining -= take;
    allocations.push({
      id: `alloc-${uid()}`,
      paymentId: payment.id,
      invoiceId: inv.id,
      retailerId: payment.retailerId,
      agentId: inv.agentId,
      allocatedAmount: take,
      createdAt: now,
    });
    const newRem = inv.remainingAmount - take;
    return {
      ...inv,
      paidAmount: inv.paidAmount + take,
      remainingAmount: newRem,
      status: (newRem === 0 ? 'paid' : 'partially_paid') as 'paid' | 'partially_paid',
      isOverdue: newRem === 0 ? false : inv.isOverdue,
    };
  });
  return { invoices, allocations, allocated: allocations.reduce((s, a) => s + a.allocatedAmount, 0) };
}

type CommissionEvent =
  | { kind: 'collection'; sourceId: string; retailerId: string; salesAgentId: string; collectingAgentId?: string; basis: number; packagesSettled: number; productId: string; allocationId?: string }
  | { kind: 'sale'; sourceId: string; retailerId: string; salesAgentId: string; basis: number; quantity: number; productId: string }
  | { kind: 'new_retailer'; sourceId: string; retailerId: string; salesAgentId: string; productId: string };

function ruleApplies(rule: CommissionRule, event: CommissionEvent): boolean {
  switch (event.kind) {
    case 'collection':
      return rule.method === 'verified_collections_percent' || rule.method === 'fixed_per_package_settled' || rule.method === 'campaign_bonus';
    case 'sale':
      return rule.method === 'reported_sales_percent' || rule.method === 'fixed_per_package_sold';
    case 'new_retailer':
      return rule.method === 'fixed_per_new_retailer';
  }
}

function ruleAmount(rule: CommissionRule, event: CommissionEvent): { basis: number; amount: number } {
  let basis = 0;
  let amount = 0;
  if (event.kind === 'collection') {
    basis = event.basis;
    if (rule.method === 'fixed_per_package_settled') amount = event.packagesSettled * rule.rateOrAmount;
    else amount = (event.basis * rule.rateOrAmount) / 100;
  } else if (event.kind === 'sale') {
    basis = event.basis;
    amount = rule.method === 'fixed_per_package_sold' ? event.quantity * rule.rateOrAmount : (event.basis * rule.rateOrAmount) / 100;
  } else {
    basis = 0;
    amount = rule.rateOrAmount;
  }
  if (basis < rule.minThreshold) return { basis, amount: 0 };
  amount = Math.round(amount);
  if (rule.maxLimit !== undefined && rule.maxLimit > 0) amount = Math.min(amount, rule.maxLimit);
  return { basis, amount };
}

/**
 * Creates commission records for one qualifying event (Parts 26-27): one record per matching active rule and beneficiary,
 * snapshotting the rule, never twice for the same (event, rule, beneficiary). With no rule at all the default policy of the
 * spec applies: a percentage of verified collections (agent rate, else the business default).
 */
function commissionsForEvent(state: SaberCommerceState, event: CommissionEvent): CommissionRecord[] {
  const policy = state.settings.commissionAttributionPolicy;
  const at = nowMs();
  const collecting = event.kind === 'collection' ? event.collectingAgentId : undefined;
  let beneficiaries: { agentId: string; share: number }[] = [{ agentId: event.salesAgentId, share: 1 }];
  if (event.kind === 'collection' && collecting) {
    if (policy === 'collecting_agent') beneficiaries = [{ agentId: collecting, share: 1 }];
    else if (policy === 'split_50_50' && collecting !== event.salesAgentId) {
      beneficiaries = [{ agentId: event.salesAgentId, share: 0.5 }, { agentId: collecting, share: 0.5 }];
    }
  }
  const out: CommissionRecord[] = [];
  const now = nowIso();
  let seq = state.commissions.length;
  for (const b of beneficiaries) {
    const rules = state.commissionRules.filter(
      (r) =>
        r.agentId === b.agentId &&
        r.isActive &&
        Date.parse(r.effectiveStartDate) <= at &&
        (!r.effectiveEndDate || Date.parse(r.effectiveEndDate) >= at) &&
        (!r.productId || r.productId === event.productId) &&
        (r.channel === 'B2B' || r.channel === 'ALL') &&
        ruleApplies(r, event)
    );
    type Planned = { ruleId: string; name: string; rate: number; basis: number; amount: number };
    const planned: Planned[] = rules.map((r) => ({ ruleId: r.id, name: r.name, rate: r.rateOrAmount, ...ruleAmount(r, event) }));
    const agent = state.agents.find((a) => a.id === b.agentId);
    const hasAnyRule = state.commissionRules.some((r) => r.agentId === b.agentId && r.isActive);
    if (!hasAnyRule && event.kind === 'collection') {
      const rate = agent?.commissionRatePercent ?? state.settings.defaultCommissionRatePercent;
      planned.push({ ruleId: 'default', name: `قانون پورسانت وصول (${rate}٪)`, rate, basis: event.basis, amount: Math.round((event.basis * rate) / 100) });
    }
    for (const p of planned) {
      const amount = Math.round(p.amount * b.share);
      if (amount <= 0) continue;
      const dup = state.commissions.some(
        (c) => c.sourcePaymentId === event.sourceId && (c.ruleId ?? 'default') === p.ruleId && c.agentId === b.agentId && (c.sourceAllocationId ?? '') === ((event.kind === 'collection' && event.allocationId) || '')
      );
      if (dup || out.some((c) => c.sourcePaymentId === event.sourceId && c.ruleId === p.ruleId && c.agentId === b.agentId && c.sourceAllocationId === (event.kind === 'collection' ? event.allocationId : undefined))) continue;
      seq += 1;
      const status: CommissionRecord['status'] = event.kind === 'collection' ? 'earned' : 'pending_verification';
      out.push({
        id: `comm-${uid()}`,
        commissionNumber: `COM-${state.settings.documentNumberPrefixYear}-${String(seq).padStart(5, '0')}`,
        agentId: b.agentId,
        sourcePaymentId: event.sourceId,
        sourceType: event.kind === 'collection' ? 'payment' : event.kind === 'sale' ? 'sales_report' : 'new_retailer',
        sourceAllocationId: event.kind === 'collection' ? event.allocationId : undefined,
        ruleId: p.ruleId,
        retailerId: event.retailerId,
        productId: event.productId,
        baseBasisAmount: p.basis,
        ruleNameSnapshot: p.name,
        ratePercentSnapshot: p.rate,
        commissionAmount: amount,
        paidAmount: 0,
        remainingPayable: amount,
        status,
        createdAt: now,
        notes: `پورسانت خودکار (${p.name}) - ${event.kind === 'collection' ? 'وصول تأییدشده' : event.kind === 'sale' ? 'فروش گزارش‌شده' : 'فروشگاه جدید'}`,
      });
    }
  }
  return out;
}

function settlementJournal(
  state: SaberCommerceState,
  payment: RetailerPayment,
  retailer: Retailer,
  allocated: number,
  unallocated: number,
  agentName: string
): JournalEntry[] {
  const now = nowIso();
  const entries: JournalEntry[] = [];
  const debit = payment.collectedByAgentDirectly ? `موجودی نقد نزد بازاریاب — ${agentName}` : 'موجودی بانک مدیریت (تاییدشده)';
  let n = state.journalEntries.length;
  if (allocated > 0) {
    entries.push({
      id: `je-pay-${uid()}`,
      entryNumber: `JE-${state.settings.documentNumberPrefixYear}-${++n + 200}`,
      entryDate: now,
      description: `تأیید واریزی فروشگاه ${retailer.storeName} (${payment.paymentNumber})`,
      referenceType: 'payment',
      referenceId: payment.id,
      debitAccount: debit,
      creditAccount: `حساب‌های دریافتنی فروشگاهی — ${retailer.storeName}`,
      amount: allocated,
    });
  }
  if (unallocated > 0) {
    entries.push({
      id: `je-adv-${uid()}`,
      entryNumber: `JE-${state.settings.documentNumberPrefixYear}-${++n + 200}`,
      entryDate: now,
      description: `مازاد واریزی بدون فاکتور باز (پیش‌دریافت) ${retailer.storeName} (${payment.paymentNumber})`,
      referenceType: 'payment',
      referenceId: payment.id,
      debitAccount: debit,
      creditAccount: `پیش‌دریافت از فروشگاه — ${retailer.storeName}`,
      amount: unallocated,
    });
  }
  return entries;
}

function packagesForAllocations(state: SaberCommerceState, allocations: PaymentAllocation[]): number {
  let pk = 0;
  for (const a of allocations) {
    const inv = state.invoices.find((i) => i.id === a.invoiceId);
    if (inv && inv.unitPriceSnapshot > 0) pk += Math.floor(a.allocatedAmount / inv.unitPriceSnapshot);
  }
  return pk;
}

export function verifyRetailerPayment(
  state: SaberCommerceState,
  input: { paymentId: string; targetInvoiceId?: string }
): SaberCommerceState {
  const payment = state.payments.find((p) => p.id === input.paymentId);
  if (!payment) throw new Error('رکورد پرداخت یافت نشد.');
  if (payment.status === 'verified') return state; // idempotent
  if (payment.status !== 'pending') throw new Error('فقط پرداخت در انتظار بررسی قابل تأیید است.');
  const retailer = state.retailers.find((r) => r.id === payment.retailerId);
  if (!retailer) throw new Error('فروشگاه یافت نشد.');

  const res = allocateAmount(state, payment, payment.amount, input.targetInvoiceId);
  const unallocated = payment.amount - res.allocated;
  const agentName = state.agents.find((a) => a.id === (payment.collectingAgentId ?? payment.salesAttributionAgentId))?.fullName ?? '';
  const withInvoices: SaberCommerceState = { ...state, invoices: res.invoices };
  const newCommissions =
    res.allocated > 0
      ? commissionsForEvent(withInvoices, {
          kind: 'collection',
          sourceId: payment.id,
          retailerId: retailer.id,
          salesAgentId: payment.salesAttributionAgentId,
          collectingAgentId: payment.collectingAgentId,
          basis: res.allocated,
          packagesSettled: packagesForAllocations(withInvoices, res.allocations),
          productId: res.invoices.find((i) => i.id === res.allocations[0]?.invoiceId)?.productId ?? state.products[0]?.id ?? '',
          allocationId: undefined,
        })
      : [];

  return {
    ...state,
    version: state.version + 1,
    payments: state.payments.map((p) =>
      p.id === payment.id ? { ...p, status: 'verified', allocations: res.allocations, unallocatedAmount: unallocated } : p
    ),
    invoices: res.invoices,
    commissions: [...newCommissions, ...state.commissions],
    journalEntries: [...settlementJournal(state, payment, retailer, res.allocated, unallocated, agentName), ...state.journalEntries],
    auditLogs: [
      {
        id: `aud-${uid()}`,
        actorRole: actor().role,
        actorName: actor().name,
        action: 'VERIFY_PAYMENT',
        entityType: 'RetailerPayment',
        entityId: payment.id,
        details: `تأیید ${payment.paymentNumber}: تخصیص ${res.allocated}، مازاد ${unallocated}`,
        timestamp: nowIso(),
      },
      ...state.auditLogs,
    ],
  };
}

/** Applies the leftover (advance) money of verified payments to invoices that were created later. */
export function applyRetailerCredit(state: SaberCommerceState, retailerId: string): SaberCommerceState {
  let s = state;
  const withCredit = state.payments
    .filter((p) => p.retailerId === retailerId && p.status === 'verified' && (p.unallocatedAmount ?? 0) > 0)
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
  for (const p0 of withCredit) {
    const payment = s.payments.find((p) => p.id === p0.id)!;
    const credit = payment.unallocatedAmount ?? 0;
    if (credit <= 0) continue;
    const res = allocateAmount(s, payment, credit);
    if (res.allocated === 0) continue;
    const retailer = s.retailers.find((r) => r.id === retailerId)!;
    const withInv: SaberCommerceState = { ...s, invoices: res.invoices };
    const comms = commissionsForEvent(withInv, {
      kind: 'collection',
      sourceId: payment.id,
      retailerId,
      salesAgentId: payment.salesAttributionAgentId,
      collectingAgentId: payment.collectingAgentId,
      basis: res.allocated,
      packagesSettled: packagesForAllocations(withInv, res.allocations),
      productId: res.invoices.find((i) => i.id === res.allocations[0]?.invoiceId)?.productId ?? s.products[0]?.id ?? '',
      allocationId: res.allocations[0]?.id,
    });
    const agentName = s.agents.find((a) => a.id === (payment.collectingAgentId ?? payment.salesAttributionAgentId))?.fullName ?? '';
    const journal: JournalEntry = {
      id: `je-adv-apply-${uid()}`,
      entryNumber: `JE-${s.settings.documentNumberPrefixYear}-${s.journalEntries.length + 201}`,
      entryDate: nowIso(),
      description: `تخصیص پیش‌دریافت ${payment.paymentNumber} به فاکتور جدید ${retailer.storeName}`,
      referenceType: 'payment',
      referenceId: payment.id,
      debitAccount: `پیش‌دریافت از فروشگاه — ${retailer.storeName}`,
      creditAccount: `حساب‌های دریافتنی فروشگاهی — ${retailer.storeName}`,
      amount: res.allocated,
    };
    void agentName;
    s = {
      ...s,
      invoices: res.invoices,
      payments: s.payments.map((p) =>
        p.id === payment.id ? { ...p, allocations: [...p.allocations, ...res.allocations], unallocatedAmount: credit - res.allocated } : p
      ),
      commissions: [...comms, ...s.commissions],
      journalEntries: [journal, ...s.journalEntries],
    };
  }
  return s === state ? state : { ...s, version: state.version + 1 };
}

export function rejectRetailerPayment(state: SaberCommerceState, input: { paymentId: string; reason: string }): SaberCommerceState {
  const payment = state.payments.find((p) => p.id === input.paymentId);
  if (!payment) throw new Error('رکورد پرداخت یافت نشد.');
  if (payment.status !== 'pending') throw new Error('فقط پرداخت در انتظار بررسی قابل رد است.');
  if (!input.reason.trim()) throw new Error('دلیل رد پرداخت الزامی است.');
  return {
    ...state,
    version: state.version + 1,
    payments: state.payments.map((p) => (p.id === payment.id ? { ...p, status: 'rejected', rejectionReason: input.reason.trim() } : p)),
  };
}

/** Reverses a verified payment: invoices are restored, source commissions are reversed explicitly (Part 27). */
export function reverseRetailerPayment(state: SaberCommerceState, input: { paymentId: string; reason: string }): SaberCommerceState {
  const payment = state.payments.find((p) => p.id === input.paymentId);
  if (!payment) throw new Error('رکورد پرداخت یافت نشد.');
  if (payment.status !== 'verified') throw new Error('فقط پرداخت تأییدشده قابل ابطال است.');
  if (!input.reason.trim()) throw new Error('دلیل ابطال الزامی است.');
  const byInvoice = new Map<string, number>();
  for (const a of payment.allocations) byInvoice.set(a.invoiceId, (byInvoice.get(a.invoiceId) ?? 0) + a.allocatedAmount);
  const invoices = state.invoices.map((inv) => {
    const back = byInvoice.get(inv.id);
    if (!back) return inv;
    const paid = inv.paidAmount - back;
    const rem = inv.remainingAmount + back;
    return { ...inv, paidAmount: paid, remainingAmount: rem, status: (paid <= 0 ? 'open' : 'partially_paid') as 'open' | 'partially_paid' };
  });
  const now = nowIso();
  const commissions = state.commissions.map((c) =>
    c.sourcePaymentId === payment.id && c.sourceType !== 'sales_report' && c.status !== 'reversed' && c.status !== 'cancelled'
      ? { ...c, status: 'reversed' as const, clawbackAmount: c.paidAmount, remainingPayable: 0, notes: `${c.notes} | ابطال: ${input.reason.trim()}` }
      : c
  );
  return {
    ...state,
    version: state.version + 1,
    payments: state.payments.map((p) => (p.id === payment.id ? { ...p, status: 'reversed', reversalReason: input.reason.trim(), unallocatedAmount: 0 } : p)),
    invoices,
    commissions,
    journalEntries: [
      {
        id: `je-rev-${uid()}`,
        entryNumber: `JE-${state.settings.documentNumberPrefixYear}-${state.journalEntries.length + 300}`,
        entryDate: now,
        description: `ابطال واریزی ${payment.paymentNumber}: ${input.reason.trim()}`,
        referenceType: 'adjustment',
        referenceId: payment.id,
        debitAccount: `حساب‌های دریافتنی فروشگاهی`,
        creditAccount: payment.collectedByAgentDirectly ? 'موجودی نقد نزد بازاریاب' : 'موجودی بانک مدیریت (تاییدشده)',
        amount: payment.amount,
      },
      ...state.journalEntries,
    ],
  };
}

export function approveCommission(state: SaberCommerceState, input: { commissionId: string; approve: boolean; reason?: string }): SaberCommerceState {
  const c = state.commissions.find((x) => x.id === input.commissionId);
  if (!c) throw new Error('رکورد پورسانت یافت نشد.');
  if (!['calculated', 'pending_verification', 'earned'].includes(c.status)) throw new Error('این پورسانت در وضعیت قابل تأیید نیست.');
  if (!input.approve && !(input.reason ?? '').trim()) throw new Error('دلیل رد پورسانت الزامی است.');
  const now = nowIso();
  return {
    ...state,
    version: state.version + 1,
    commissions: state.commissions.map((x) =>
      x.id === c.id
        ? input.approve
          ? { ...x, status: 'approved' as const, approvedAt: now }
          : { ...x, status: 'cancelled' as const, remainingPayable: 0, notes: `${x.notes} | رد: ${(input.reason ?? '').trim()}` }
        : x
    ),
  };
}

export function submitAndVerifyAgentRemittance(
  state: SaberCommerceState,
  input: {
    agentId: string;
    remittedAmount: number;
    transferReference: string;
    notes?: string;
    /** false = pending until an administrator verifies it (agents) */
    autoVerify?: boolean;
  }
): SaberCommerceState {
  if (input.remittedAmount <= 0) {
    throw new Error('مبلغ تحویلی به مدیریت باید بیشتر از صفر باشد.');
  }
  const fin = computeFinancialSummary(state);
  const pendingRemitted = state.agentRemittances.filter((r) => r.agentId === input.agentId && r.status === 'pending').reduce((s, r) => s + r.remittedAmount, 0);
  const currentHeld = (fin.agentCashByAgent[input.agentId]?.held ?? 0) - pendingRemitted;
  if (input.remittedAmount > currentHeld) {
    throw new Error(
      `مبلغ تحویلی (${input.remittedAmount}) نمی‌تواند بیشتر از وجه نقد نزد بازاریاب (${currentHeld}) باشد.`
    );
  }
  const now = nowIso();
  const remId = `arem-${uid()}`;
  const remNum = `REM-${state.settings.documentNumberPrefixYear}-${String(
    state.agentRemittances.length + 1
  ).padStart(4, '0')}`;

  return {
    ...state,
    version: state.version + 1,
    agentRemittances: [
      {
        id: remId,
        remittanceNumber: remNum,
        agentId: input.agentId,
        previousCashHeld: currentHeld,
        newlyCollectedAmount: 0,
        remittedAmount: Math.round(input.remittedAmount),
        remainingCashHeld: currentHeld - Math.round(input.remittedAmount),
        remittanceDate: now,
        transferReference: input.transferReference.trim() || `REM-TRX-${uid()}`,
        status: input.autoVerify === false ? 'pending' : 'verified',
        verifiedBy: input.autoVerify === false ? undefined : actor().name,
        notes: input.notes || 'تسویه و واریز وجوه وصولی بازاریاب به حساب مدیریت',
      },
      ...state.agentRemittances,
    ],
  };
}

export function verifyAgentRemittance(state: SaberCommerceState, input: { remittanceId: string; approve: boolean; reason?: string }): SaberCommerceState {
  const r = state.agentRemittances.find((x) => x.id === input.remittanceId);
  if (!r) throw new Error('رسید تحویل وجه یافت نشد.');
  if (r.status !== 'pending') throw new Error('این رسید قبلاً بررسی شده است.');
  if (!input.approve && !(input.reason ?? '').trim()) throw new Error('دلیل رد الزامی است.');
  return {
    ...state,
    version: state.version + 1,
    agentRemittances: state.agentRemittances.map((x) =>
      x.id === r.id
        ? input.approve
          ? { ...x, status: 'verified' as const, verifiedBy: actor().name }
          : { ...x, status: 'rejected' as const, verifiedBy: actor().name, notes: `${x.notes} | رد: ${(input.reason ?? '').trim()}` }
        : x
    ),
  };
}

export function payAgentCommission(
  state: SaberCommerceState,
  input: {
    commissionId: string;
    amountToPay: number;
    referenceNumber: string;
    notes?: string;
  }
): SaberCommerceState {
  if (input.amountToPay <= 0) {
    throw new Error('مبلغ پرداخت پورسانت باید بیشتر از صفر باشد.');
  }
  const comm = state.commissions.find((c) => c.id === input.commissionId);
  if (!comm) throw new Error('رکورد پورسانت یافت نشد.');
  if (!['earned', 'approved', 'partially_paid'].includes(comm.status)) {
    throw new Error('پورسانت باید ابتدا تأیید شود یا به وضعیت «کسب‌شده» برسد.');
  }
  if (input.amountToPay > comm.remainingPayable) {
    throw new Error('مبلغ پرداختی بیشتر از مانده قابل پرداخت پورسانت است.');
  }

  const now = nowIso();
  const newPaid = comm.paidAmount + Math.round(input.amountToPay);
  const newRem = comm.remainingPayable - Math.round(input.amountToPay);

  return {
    ...state,
    version: state.version + 1,
    commissions: state.commissions.map((c) =>
      c.id === comm.id
        ? {
            ...c,
            paidAmount: newPaid,
            remainingPayable: newRem,
            status: newRem === 0 ? 'paid' : 'partially_paid',
            approvedAt: c.approvedAt || now,
          }
        : c
    ),
    commissionPayments: [
      {
        id: `cpay-${uid()}`,
        paymentNumber: `CP-${state.settings.documentNumberPrefixYear}-${String(
          state.commissionPayments.length + 1
        ).padStart(4, '0')}`,
        commissionRecordId: comm.id,
        agentId: comm.agentId,
        amountPaid: Math.round(input.amountToPay),
        paymentDate: now,
        referenceNumber: input.referenceNumber.trim() || `SHABA-${uid()}`,
        paidBy: actor().name,
        notes: input.notes || 'پرداخت پورسانت بازاریاب',
      },
      ...state.commissionPayments,
    ],
  };
}

// 7. Field Visits & Restocking (Forms 9 & 10)
export function recordFieldVisit(
  state: SaberCommerceState,
  input: {
    agentId: string;
    retailerId: string;
    observedStock: number;
    retailerReportedSales: number;
    paymentFollowupStatus: string;
    restockingNeededCount: number;
    competitorObservations?: string;
    outcome: VisitOutcome;
    nextVisitDate: string;
    notes?: string;
  }
): SaberCommerceState {
  const retailer = state.retailers.find((r) => r.id === input.retailerId);
  if (!retailer) throw new Error('فروشگاه یافت نشد.');

  const retailerOutstanding = state.invoices
    .filter((i) => i.retailerId === retailer.id && i.status !== 'reversed')
    .reduce((s, i) => s + i.remainingAmount, 0);

  const now = nowIso();
  const visitNum = `VIS-${state.settings.documentNumberPrefixYear}-${String(
    state.visits.length + 1
  ).padStart(5, '0')}`;

  const nextRestockRequests = [...state.restockRequests];
  if (input.restockingNeededCount > 0) {
    nextRestockRequests.unshift({
      id: `req-${uid()}`,
      requestNumber: `REQ-${state.settings.documentNumberPrefixYear}-${String(
        state.restockRequests.length + 1
      ).padStart(5, '0')}`,
      retailerId: retailer.id,
      requestedByRole: 'agent',
      agentId: input.agentId,
      productId: state.products[0]?.id ?? 'prod-piarom-600',
      currentEstimatedStock: input.observedStock,
      requestedQuantity: input.restockingNeededCount,
      reason: `ثبت‌شده طی بازدید میدانی (${visitNum})`,
      urgency: input.observedStock === 0 ? 'critical' : 'normal',
      preferredDeliveryDate: input.nextVisitDate || now,
      status: 'submitted',
      createdAt: now,
      notes: input.notes || '',
    });
  }

  return {
    ...state,
    version: state.version + 1,
    visits: [
      {
        id: `vis-${uid()}`,
        visitNumber: visitNum,
        agentId: input.agentId,
        retailerId: retailer.id,
        visitDate: now,
        observedStock: Math.max(0, input.observedStock),
        retailerReportedSales: Math.max(0, input.retailerReportedSales),
        outstandingBalanceSnapshot: retailerOutstanding,
        paymentFollowupStatus: input.paymentFollowupStatus,
        restockingNeededCount: Math.max(0, input.restockingNeededCount),
        competitorObservations: input.competitorObservations || '',
        outcome: input.outcome,
        nextVisitDate: input.nextVisitDate || now,
        notes: input.notes || '',
      },
      ...state.visits,
    ],
    restockRequests: nextRestockRequests,
  };
}

// 8. B2C Direct E-Commerce Checkout, Simulated Payment & Fulfillment (Parts 28–31)
export function createB2cOrderWithSimulatedPayment(
  state: SaberCommerceState,
  input: {
    customerName: string;
    customerMobile: string;
    province: string;
    city: string;
    deliveryAddress: string;
    postalCode: string;
    deliveryInstructions?: string;
    productId: string;
    quantity: number;
    sourceChannel?: 'qr_packaging' | 'direct_web' | 'agent_referral';
    referralAgentId?: string;
    idempotencyKey?: string;
  }
): { nextState: SaberCommerceState; createdOrder: B2cOrder } {
  if (!input.customerName.trim()) {
    throw new Error('نام و نام خانوادگی خریدار الزامی است.');
  }
  if (!isValidIranianMobile(input.customerMobile)) {
    throw new Error('شماره موبایل خریدار معتبر نیست (فرمت صحیح: 09XXXXXXXXX).');
  }
  if (!isValidIranianPostalCode(input.postalCode)) {
    throw new Error('کد پستی باید دقیقاً ۱۰ رقم باشد.');
  }
  if (!input.deliveryAddress.trim()) {
    throw new Error('نشانی دقیق تحویل الزامی است.');
  }
  if (input.quantity <= 0) {
    throw new Error('تعداد سفارش باید حداقل ۱ بسته باشد.');
  }

  const idemKey =
    input.idempotencyKey ||
    `b2c-${input.customerMobile}-${input.productId}-${input.quantity}-${uid()}`;
  const existingOrder = state.b2cOrders.find((o) => o.idempotencyKey === idemKey);
  if (existingOrder) {
    return { nextState: state, createdOrder: existingOrder };
  }

  const product = state.products.find((p) => p.id === input.productId);
  if (!product) throw new Error('محصول مورد نظر یافت نشد.');

  const inv = computeInventorySummary(state, product.id);
  if (inv.warehouseStock < input.quantity) {
    throw new Error(
      `موجودی قابل فروش مستقیم کافی نیست (موجودی فعلی: ${inv.warehouseStock} بسته).`
    );
  }

  const now = nowIso();
  const unitPrice = product.campaignPrice ?? product.directB2cPrice;
  const subtotal = unitPrice * input.quantity;
  const shippingFee =
    subtotal >= state.settings.freeShippingThreshold ? 0 : state.settings.defaultShippingFee;
  const totalPayable = subtotal + shippingFee;

  const ordId = `ord-${uid()}`;
  const ordNum = `ORD-${state.settings.documentNumberPrefixYear}-${String(
    state.b2cOrders.length + 1
  ).padStart(5, '0')}`;

  // Do NOT attribute generic packaging QR scans to any sales agent unless an explicit agent_referral link was used
  const safeReferralAgentId =
    input.sourceChannel === 'agent_referral' ? input.referralAgentId : undefined;

  const createdOrder: B2cOrder = {
    id: ordId,
    orderNumber: ordNum,
    customerId: `cu-${uid()}`,
    customerName: input.customerName.trim(),
    customerMobile: input.customerMobile.trim(),
    province: input.province.trim() || 'تهران',
    city: input.city.trim() || 'تهران',
    deliveryAddress: input.deliveryAddress.trim(),
    postalCode: input.postalCode.trim(),
    deliveryInstructions: input.deliveryInstructions,
    productId: product.id,
    productNameSnapshot: product.name,
    quantity: Math.round(input.quantity),
    unitPriceSnapshot: unitPrice,
    discountAmount: 0,
    shippingFee,
    totalPayable,
    orderStatus: 'paid',
    paymentStatus: 'paid',
    simulatedPaymentRef: `SIM-GW-${uid()}`,
    trackingCode: `TRK-${state.settings.documentNumberPrefixYear}-${state.b2cOrders.length + 101}`,
    referralAgentId: safeReferralAgentId,
    sourceChannel: input.sourceChannel ?? 'direct_web',
    idempotencyKey: idemKey,
    createdAt: now,
  };

  return {
    createdOrder,
    nextState: {
      ...state,
      version: state.version + 1,
      b2cOrders: [createdOrder, ...state.b2cOrders],
      inventoryTransactions: [
        ...state.inventoryTransactions,
        {
          id: `inv-tx-b2c-${uid()}`,
          productId: product.id,
          movementType: 'b2c_reservation',
          fromLocationType: 'warehouse',
          fromLocationId: 'main-warehouse',
          toLocationType: 'b2c_reserved',
          toLocationId: ordId,
          quantity: Math.round(input.quantity),
          unitPriceSnapshot: unitPrice,
          referenceDocumentId: ordId,
          createdAt: now,
          createdBy: createdOrder.customerName,
          notes: `رزرو و تخصیص موجودی بابت سفارش آنلاین پرداخت‌شده (${ordNum})`,
        },
      ],
      journalEntries: [
        {
          id: `je-b2c-${uid()}`,
          entryNumber: `JE-${state.settings.documentNumberPrefixYear}-${state.journalEntries.length + 300}`,
          entryDate: now,
          description: `دریافت وجه سفارش مستقیم B2C (${ordNum}) — درگاه آزمایشی`,
          referenceType: 'b2c_order',
          referenceId: ordId,
          debitAccount: 'موجودی بانک مدیریت (تاییدشده)',
          creditAccount: 'درآمد فروش مستقیم B2C',
          amount: totalPayable,
        },
        ...state.journalEntries,
      ],
    },
  };
}

export function updateB2cOrderFulfillment(
  state: SaberCommerceState,
  input: {
    orderId: string;
    orderStatus: B2cOrderStatus;
    packingOperator?: string;
    courierName?: string;
    trackingCode?: string;
  }
): SaberCommerceState {
  const order = state.b2cOrders.find((o) => o.id === input.orderId);
  if (!order) throw new Error('سفارش یافت نشد.');
  const now = nowIso();

  return {
    ...state,
    version: state.version + 1,
    b2cOrders: state.b2cOrders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            orderStatus: input.orderStatus,
            packingOperator: input.packingOperator ?? o.packingOperator,
            courierName: input.courierName ?? o.courierName,
            trackingCode: input.trackingCode ?? o.trackingCode,
            dispatchedAt:
              input.orderStatus === 'shipped' ? now : o.dispatchedAt,
            deliveredAt:
              input.orderStatus === 'delivered' ? now : o.deliveredAt,
          }
        : o
    ),
  };
}

// 9. Role-Based Data Scoping (Part 43 & Acceptance Tests 64–66)
export { getScopedStateForRole } from './scope.ts';

export function updateBusinessSettings(
  state: SaberCommerceState,
  rawSettings: Partial<BusinessSettings>
): SaberCommerceState {
  // only known setting keys are accepted (a client must not be able to add arbitrary fields to the ledger)
  const partialSettings = Object.fromEntries(
    Object.entries(rawSettings).filter(([k, v]) => k in state.settings && k !== 'declarationVersion' && typeof v === typeof (state.settings as unknown as Record<string, unknown>)[k])
  ) as Partial<BusinessSettings>;
  return {
    ...state,
    version: state.version + 1,
    settings: {
      ...state.settings,
      ...partialSettings,
      declarationVersion:
        partialSettings.agentConsignmentDeclaration ||
        partialSettings.retailerConsignmentDeclaration
          ? state.settings.declarationVersion + 1
          : state.settings.declarationVersion,
    },
  };
}


// ---------------------------------------------------------------------------
// Added 2026-10-31: forms that v0 only listed (F-011) and workflow steps the spec requires
// ---------------------------------------------------------------------------

export function approveRetailer(state: SaberCommerceState, input: { retailerId: string; approve: boolean; reason?: string }): SaberCommerceState {
  const r = state.retailers.find((x) => x.id === input.retailerId);
  if (!r) throw new Error('فروشگاه یافت نشد.');
  if (r.status !== 'pending') throw new Error('فقط فروشگاه در وضعیت «در انتظار تأیید» قابل بررسی است.');
  if (!input.approve && !(input.reason ?? '').trim()) throw new Error('دلیل رد الزامی است.');
  const now = nowIso();
  return {
    ...state,
    version: state.version + 1,
    retailers: state.retailers.map((x) =>
      x.id === r.id
        ? input.approve
          ? { ...x, status: 'active' as const, approvedDate: now, approvedBy: actor().name }
          : { ...x, status: 'inactive' as const, notes: `${x.notes} | رد: ${(input.reason ?? '').trim()}` }
        : x
    ),
    auditLogs: [
      { id: `aud-${uid()}`, actorRole: actor().role, actorName: actor().name, action: input.approve ? 'APPROVE_RETAILER' : 'REJECT_RETAILER', entityType: 'Retailer', entityId: r.id, details: `${r.storeName}`, timestamp: now },
      ...state.auditLogs,
    ],
  };
}

export function submitRestockRequest(
  state: SaberCommerceState,
  input: { retailerId: string; productId: string; requestedQuantity: number; reason?: string; urgency?: 'normal' | 'high' | 'critical'; preferredDeliveryDate?: string; requestedByRole?: 'retailer' | 'agent' }
): SaberCommerceState {
  const retailer = state.retailers.find((r) => r.id === input.retailerId);
  if (!retailer) throw new Error('فروشگاه یافت نشد.');
  if (!Number.isInteger(input.requestedQuantity) || input.requestedQuantity <= 0) throw new Error('تعداد درخواستی باید یک عدد صحیح مثبت باشد.');
  const inv = computeInventorySummary(state, input.productId);
  const stock = inv.retailerCustodyByRetailer[retailer.id] ?? 0;
  const now = nowIso();
  return {
    ...state,
    version: state.version + 1,
    restockRequests: [
      {
        id: `req-${uid()}`,
        requestNumber: `REQ-${state.settings.documentNumberPrefixYear}-${String(state.restockRequests.length + 1).padStart(5, '0')}`,
        retailerId: retailer.id,
        requestedByRole: input.requestedByRole ?? 'retailer',
        agentId: retailer.agentId,
        productId: input.productId,
        currentEstimatedStock: stock,
        requestedQuantity: input.requestedQuantity,
        reason: input.reason?.trim() || 'درخواست شارژ مجدد',
        urgency: input.urgency ?? (stock <= 2 ? 'critical' : 'normal'),
        preferredDeliveryDate: input.preferredDeliveryDate ?? new Date(nowMs() + 2 * 86400000).toISOString(),
        status: 'submitted',
        createdAt: now,
        notes: input.reason?.trim() ?? '',
      },
      ...state.restockRequests,
    ],
  };
}

export function recordExpense(
  state: SaberCommerceState,
  input: { title: string; amount: number; category: OperatingExpense['category']; paidFromAccount: string; referenceNumber?: string; notes?: string }
): SaberCommerceState {
  if (!input.title.trim()) throw new Error('شرح هزینه الزامی است.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('مبلغ هزینه باید بیشتر از صفر باشد.');
  const now = nowIso();
  const n = state.expenses.length + 1;
  const amount = Math.round(input.amount);
  return {
    ...state,
    version: state.version + 1,
    expenses: [
      { id: `exp-${uid()}`, expenseNumber: `EXP-${state.settings.documentNumberPrefixYear}-${String(n).padStart(5, '0')}`, category: input.category, title: input.title.trim(), amount, expenseDate: now, paidFromAccount: input.paidFromAccount.trim() || 'حساب بانکی مدیریت', referenceNumber: input.referenceNumber?.trim() || `EXP-REF-${uid()}`, recordedBy: actor().name, notes: input.notes ?? '' },
      ...state.expenses,
    ],
    journalEntries: [
      { id: `je-exp-${uid()}`, entryNumber: `JE-${state.settings.documentNumberPrefixYear}-${state.journalEntries.length + 400}`, entryDate: now, description: `هزینه عملیاتی: ${input.title.trim()}`, referenceType: 'expense', referenceId: `exp-${n}`, debitAccount: `هزینه — ${input.category}`, creditAccount: input.paidFromAccount.trim() || 'حساب بانکی مدیریت', amount },
      ...state.journalEntries,
    ],
  };
}

/** Form 38: movements between the business bank account and the cash box that are not sales or expenses. */
export function recordCashBankTransaction(
  state: SaberCommerceState,
  input: { kind: CashBankTransaction['kind']; amount: number; account: string; referenceNumber?: string; notes?: string }
): SaberCommerceState {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('مبلغ باید بیشتر از صفر باشد.');
  const now = nowIso();
  const amount = Math.round(input.amount);
  const n = state.cashBankTransactions.length + 1;
  const [debit, credit] =
    input.kind === 'bank_deposit' ? ['موجودی بانک مدیریت (تاییدشده)', 'سرمایه / واریز متفرقه']
    : input.kind === 'bank_withdrawal' ? ['برداشت متفرقه', 'موجودی بانک مدیریت (تاییدشده)']
    : input.kind === 'cash_to_bank' ? ['موجودی بانک مدیریت (تاییدشده)', 'صندوق نقد مدیریت']
    : ['صندوق نقد مدیریت', 'موجودی بانک مدیریت (تاییدشده)'];
  return {
    ...state,
    version: state.version + 1,
    cashBankTransactions: [
      { id: `cbt-${uid()}`, number: `CBT-${state.settings.documentNumberPrefixYear}-${String(n).padStart(5, '0')}`, kind: input.kind, amount, date: now, account: input.account.trim() || 'حساب بانکی مدیریت', referenceNumber: input.referenceNumber?.trim() || '', recordedBy: actor().name, notes: input.notes ?? '' },
      ...state.cashBankTransactions,
    ],
    journalEntries: [
      { id: `je-cbt-${uid()}`, entryNumber: `JE-${state.settings.documentNumberPrefixYear}-${state.journalEntries.length + 500}`, entryDate: now, description: `تراکنش نقد/بانک (${input.kind})`, referenceType: 'adjustment', referenceId: `cbt-${n}`, debitAccount: debit, creditAccount: credit, amount },
      ...state.journalEntries,
    ],
  };
}

/** Form 39: credit note / debit note / write-off against a retailer receivable, always with a reason and an approver. */
export function recordFinancialAdjustment(
  state: SaberCommerceState,
  input: { retailerId: string; kind: FinancialAdjustment['kind']; amount: number; reason: string }
): SaberCommerceState {
  const retailer = state.retailers.find((r) => r.id === input.retailerId);
  if (!retailer) throw new Error('فروشگاه یافت نشد.');
  if (!input.reason.trim()) throw new Error('دلیل تعدیل مالی الزامی است.');
  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('مبلغ باید بیشتر از صفر باشد.');
  const now = nowIso();
  let invoices = state.invoices;
  if (input.kind === 'credit_note' || input.kind === 'write_off') {
    let remaining = amount;
    const open = [...state.invoices].filter((i) => i.retailerId === retailer.id && i.remainingAmount > 0 && i.status !== 'reversed').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const outstanding = open.reduce((s, i) => s + i.remainingAmount, 0);
    if (amount > outstanding) throw new Error(`مبلغ تعدیل (${amount}) بیشتر از مانده بدهی فروشگاه (${outstanding}) است.`);
    const reduce = new Map<string, number>();
    for (const i of open) {
      if (remaining <= 0) break;
      const take = Math.min(i.remainingAmount, remaining);
      reduce.set(i.id, take);
      remaining -= take;
    }
    invoices = state.invoices.map((i) => {
      const take = reduce.get(i.id);
      if (!take) return i;
      const rem = i.remainingAmount - take;
      return { ...i, remainingAmount: rem, totalAmount: i.totalAmount - take, status: (rem === 0 ? 'paid' : 'partially_paid') as 'paid' | 'partially_paid' };
    });
  } else {
    // debit note: new receivable line
    invoices = [
      { id: `inv-${uid()}`, invoiceNumber: `INV-${state.settings.documentNumberPrefixYear}-${String(state.invoices.length + 1).padStart(5, '0')}`, retailerId: retailer.id, agentId: retailer.agentId, productId: state.products[0]?.id ?? '', quantity: 0, unitPriceSnapshot: 0, totalAmount: amount, paidAmount: 0, remainingAmount: amount, dueDate: new Date(nowMs() + retailer.settlementIntervalDays * 86400000).toISOString(), isOverdue: false, status: 'open', createdAt: now },
      ...state.invoices,
    ];
  }
  const n = state.financialAdjustments.length + 1;
  return {
    ...state,
    version: state.version + 1,
    invoices,
    financialAdjustments: [
      { id: `fadj-${uid()}`, number: `ADJ-${state.settings.documentNumberPrefixYear}-${String(n).padStart(5, '0')}`, retailerId: retailer.id, kind: input.kind, amount, reason: input.reason.trim(), approvedBy: actor().name, createdAt: now },
      ...state.financialAdjustments,
    ],
    journalEntries: [
      { id: `je-adj-${uid()}`, entryNumber: `JE-${state.settings.documentNumberPrefixYear}-${state.journalEntries.length + 600}`, entryDate: now, description: `تعدیل مالی (${input.kind}) ${retailer.storeName}: ${input.reason.trim()}`, referenceType: 'adjustment', referenceId: `fadj-${n}`, debitAccount: input.kind === 'debit_note' ? `حساب‌های دریافتنی فروشگاهی — ${retailer.storeName}` : 'تخفیفات و ضایعات فروش', creditAccount: input.kind === 'debit_note' ? 'سایر درآمدها' : `حساب‌های دریافتنی فروشگاهی — ${retailer.storeName}`, amount },
      ...state.journalEntries,
    ],
  };
}

export function markNotificationsRead(state: SaberCommerceState, input: { ids?: string[] }): SaberCommerceState {
  const all = !input.ids;
  const set = new Set(input.ids ?? []);
  return { ...state, notifications: state.notifications.map((n) => (all || set.has(n.id) ? { ...n, isRead: true } : n)) };
}

/** Fills collections added after a state was first stored and re-derives time-dependent flags. */
export function normalizeState(state: SaberCommerceState): SaberCommerceState {
  return refreshOverdueFlags({
    ...state,
    cashBankTransactions: state.cashBankTransactions ?? [],
    financialAdjustments: state.financialAdjustments ?? [],
  });
}
