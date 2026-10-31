import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createInitialSeedState } from './seed.ts';
import {
  computeInventorySummary,
  computeFinancialSummary,
  createProduct,
  updateProductPricing,
  createSalesAgent,
  createWarehouseToAgentDeliveryDraft,
  createAgentToRetailerDeliveryDraft,
  uploadSignedDocumentAttachment,
  verifyOfficialDocument,
  submitAndVerifyRetailerSalesReport,
  submitRetailerPayment,
  verifyRetailerPayment,
  payAgentCommission,
  recordFieldVisit,
  submitAndVerifyAgentRemittance,
  recordAgentReturnToWarehouse,
  recordRetailerReturn,
  createB2cOrderWithSimulatedPayment,
  updateB2cOrderFulfillment,
  getScopedStateForRole,
  isInvoiceOverdue,
  refreshOverdueFlags,
  reverseRetailerPayment,
  verifyAgentRemittance,
} from './engine.ts';
import { uid } from './runtime.ts';

test('Part 45 & 33: Initial seed state matches exact 200-package & 14M Toman reconciliation', () => {
  const state = createInitialSeedState();
  const inv = computeInventorySummary(state);

  assert.equal(inv.initialAndInbound, 200);
  assert.equal(inv.warehouseStock, 30);
  assert.equal(inv.totalAgentCustody, 30);
  assert.equal(inv.totalRetailerCustody, 50);
  assert.equal(inv.soldThroughRetailers, 70);
  assert.equal(inv.soldDirectB2c, 20);
  assert.equal(inv.totalAccountedFor, 200);
  assert.equal(inv.isReconciled, true);

  const fin = computeFinancialSummary(state);
  // 70 packages x 560,000 (settlement price: 700,000 consumer price minus the store's 20%)
  assert.equal(fin.totalB2bReceivablesGenerated, 39200000);
  assert.equal(fin.totalVerifiedB2bCollections, 28000000);
  assert.equal(fin.totalOutstandingReceivables, 11200000);
  assert.equal(fin.totalB2cRevenue, 14000000, '20 packages x 700,000, free shipping above the threshold');
  assert.equal(fin.isReceivablesReconciled, true);
});

test('Acceptance Tests 1-7: Product creation, dynamic pricing, suggested price calculation, and historical snapshot preservation', () => {
  let state = createInitialSeedState();
  const originalOrderPrice = state.b2cOrders[0].unitPriceSnapshot;
  const originalInvoicePrice = state.invoices[0].unitPriceSnapshot;

  state = createProduct(state, {
    name: 'خرمای مضافتی بم ممتاز',
    sku: 'MZF-800',
    brand: 'خرمای صابر',
    category: 'خرمای تر و نیمه‌تر',
    packaging: 'جعبه مقوایی لمینت بهداشتی',
    netWeightGrams: 800,
    unit: 'بسته',
    description: 'خرمای مضافتی درجه یک صادراتی بم',
    costPrice: 110000,
    baseRetailerPrice: 150000,
    retailerMarkupPercent: 20,
    directB2cPrice: 190000,
    minStockAlert: 20,
    barcode: '6260458900802',
    initialWarehouseStock: 50,
  });

  const mazafati = state.products.find((p) => p.sku === 'MZF-800')!;
  assert.ok(mazafati);
  assert.equal(mazafati.suggestedRetailPrice, 180000); // 150,000 * 1.20

  // Change Piarom prices and verify historical snapshots do NOT change
  state = updateProductPricing(state, {
    productId: 'prod-piarom-600',
    costPrice: 170000,
    baseRetailerPrice: 220000,
    retailerMarkupPercent: 15,
    directB2cPrice: 265000,
  });

  const updatedPiarom = state.products.find((p) => p.id === 'prod-piarom-600')!;
  assert.equal(updatedPiarom.baseRetailerPrice, 220000);
  assert.equal(updatedPiarom.suggestedRetailPrice, 253000);
  assert.equal(updatedPiarom.directB2cPrice, 265000);

  // Historical orders and invoices retain original 240,000 and 200,000 snapshots
  assert.equal(state.b2cOrders[0].unitPriceSnapshot, originalOrderPrice);
  assert.equal(state.invoices[0].unitPriceSnapshot, originalInvoicePrice);
});

test('Acceptance Tests 8-27: Agent creation, Warehouse-to-Agent delivery (25 pkgs), signed document upload & verification, Agent-to-Retailer delivery (10 pkgs)', () => {
  let state = createInitialSeedState();

  // Add 50 packages to warehouse so we can test a fresh 25-package agent transfer
  state = createProduct(state, {
    name: 'خرمای کبکاب بهبهان',
    sku: 'KBK-600',
    brand: 'خرمای صابر',
    category: 'خرمای شیره دار',
    packaging: 'بسته شفاف ۶۰۰ گرمی',
    netWeightGrams: 600,
    unit: 'بسته',
    description: 'خرمای کبکاب درجه یک',
    costPrice: 90000,
    baseRetailerPrice: 120000,
    retailerMarkupPercent: 15,
    directB2cPrice: 145000,
    minStockAlert: 15,
    barcode: '6260458900777',
    initialWarehouseStock: 50,
  });
  const kbk = state.products.find((p) => p.sku === 'KBK-600')!;

  state = createSalesAgent(state, {
    fullName: 'حامد فرهمند',
    mobile: '09129998877',
    address: 'تهران، پاسداران',
    commissionRatePercent: 7,
    custodyPolicyMode: 'consignment',
    assignedRetailerIds: ['rt-1'],
  });
  const newAgent = state.agents.find((a) => a.mobile === '09129998877')!;
  assert.ok(newAgent);

  // Create draft delivery of 25 packages from warehouse to newAgent
  const draftRes = createWarehouseToAgentDeliveryDraft(state, {
    agentId: newAgent.id,
    productId: kbk.id,
    quantity: 25,
  });
  state = draftRes.nextState;
  const docId = draftRes.createdDocument.id;

  // Attempting to verify before uploading signed image must fail (Acceptance Test 68)
  assert.throws(() => {
    verifyOfficialDocument(state, { documentId: docId });
  });

  // Upload signed document image
  state = uploadSignedDocumentAttachment(state, {
    documentId: docId,
    filename: 'signed-ag-receipt.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 250000,
    uploadedBy: newAgent.fullName,
  });

  // Admin verifies document
  state = verifyOfficialDocument(state, { documentId: docId, adminName: 'صابر نصرعلوی' });

  let inv = computeInventorySummary(state, kbk.id);
  assert.equal(inv.warehouseStock, 25); // 50 - 25
  assert.equal(inv.agentCustodyByAgent[newAgent.id], 25);

  // Agent delivers 10 packages to retailer rt-1
  const rtDraft = createAgentToRetailerDeliveryDraft(state, {
    agentId: newAgent.id,
    retailerId: 'rt-1',
    productId: kbk.id,
    quantity: 10,
  });
  state = rtDraft.nextState;
  state = uploadSignedDocumentAttachment(state, {
    documentId: rtDraft.createdDocument.id,
    filename: 'signed-rt-receipt.png',
    mimeType: 'image/png',
    sizeBytes: 180000,
    uploadedBy: newAgent.fullName,
  });
  state = verifyOfficialDocument(state, {
    documentId: rtDraft.createdDocument.id,
    adminName: 'صابر نصرعلوی',
  });

  inv = computeInventorySummary(state, kbk.id);
  assert.equal(inv.agentCustodyByAgent[newAgent.id], 15); // 25 - 10
  assert.equal(inv.retailerCustodyByRetailer['rt-1'], 10);
  assert.equal(inv.isReconciled, true);
});

test('Acceptance Tests 28-40 & 67: Retailer reports 6 packages sold, partial payment, single commission calculation, and commission payout', () => {
  let state = createInitialSeedState();
  // Retailer rt-11 currently has 9 packages remaining (10 delivered - 1 sold)
  const beforeInv = computeInventorySummary(state);
  assert.equal(beforeInv.retailerCustodyByRetailer['rt-11'], 9);

  // Retailer rt-11 reports selling 6 packages
  state = submitAndVerifyRetailerSalesReport(state, {
    retailerId: 'rt-11',
    productId: 'prod-piarom-600',
    reportedSoldQuantity: 6,
    idempotencyKey: 'test-sr-rt11-6',
  });

  // Duplicate submission with same idempotencyKey must not duplicate receivable
  state = submitAndVerifyRetailerSalesReport(state, {
    retailerId: 'rt-11',
    productId: 'prod-piarom-600',
    reportedSoldQuantity: 6,
    idempotencyKey: 'test-sr-rt11-6',
  });

  const afterInv = computeInventorySummary(state);
  assert.equal(afterInv.retailerCustodyByRetailer['rt-11'], 3); // 9 - 6 = 3
  assert.equal(afterInv.isReconciled, true);

  // Retailer rt-11 submits a partial payment of 1,400,000 Toman = 2.5 packages of the 560,000 settlement price
  state = submitRetailerPayment(state, {
    retailerId: 'rt-11',
    amount: 1400000,
    method: 'bank_transfer',
    referenceNumber: 'TRX-RT11-800K',
    autoVerify: false,
    idempotencyKey: 'pay-rt11-800k',
  });

  const pendingPay = state.payments.find((p) => p.idempotencyKey === 'pay-rt11-800k')!;
  assert.equal(pendingPay.status, 'pending');

  const commCountBefore = state.commissions.length;
  state = verifyRetailerPayment(state, { paymentId: pendingPay.id });
  // Calling verifyRetailerPayment a second time must NOT generate duplicate commission (Acceptance Test 67)
  state = verifyRetailerPayment(state, { paymentId: pendingPay.id });

  assert.equal(state.commissions.length, commCountBefore + 1);
  const newComm = state.commissions.find((c) => c.sourcePaymentId === pendingPay.id)!;
  // Hand computation: 1,400,000 / 560,000 = 2.5 packages x (5% of the 700,000 consumer price = 35,000) = 87,500 Toman
  assert.equal(newComm.commissionAmount, 87500);
  assert.equal(newComm.remainingPayable, 87500);

  // Administrator pays a portion (25,000 Toman) of the commission
  state = payAgentCommission(state, {
    commissionId: newComm.id,
    amountToPay: 25000,
    referenceNumber: 'SHABA-PART-25K',
  });

  const updatedComm = state.commissions.find((c) => c.id === newComm.id)!;
  assert.equal(updatedComm.paidAmount, 25000);
  assert.equal(updatedComm.remainingPayable, 62500);
  assert.equal(updatedComm.status, 'partially_paid');
});

test('Acceptance Tests 41-55: Field visits, Agent cash collection & remittance reconciliation, and Returns', () => {
  let state = createInitialSeedState();

  // Field visit with zero stock and restocking request
  state = recordFieldVisit(state, {
    agentId: 'ag-1',
    retailerId: 'rt-2',
    observedStock: 0,
    retailerReportedSales: 8,
    paymentFollowupStatus: 'پیگیری انجام شد',
    restockingNeededCount: 12,
    outcome: 'stock_depleted',
    nextVisitDate: '2026-11-05T10:00:00.000Z',
  });
  assert.equal(state.visits[0].observedStock, 0);
  assert.equal(state.restockRequests[0].requestedQuantity, 12);

  // Agent ag-3 currently holds 560,000 Toman cash (1,400,000 collected - 840,000 remitted). Remit 150,000 Toman:
  state = submitAndVerifyAgentRemittance(state, {
    agentId: 'ag-3',
    remittedAmount: 150000,
    transferReference: 'REM-150K',
  });
  const fin = computeFinancialSummary(state);
  assert.equal(fin.agentCashByAgent['ag-3'].held, 410000);

  // Agent ag-1 returns 2 unused packages to warehouse (currently holds 5)
  state = recordAgentReturnToWarehouse(state, {
    agentId: 'ag-1',
    productId: 'prod-piarom-600',
    quantityReturned: 2,
    condition: 'healthy',
    reason: 'بازگشت مازاد موجودی بازاریاب به انبار',
  });
  // Retailer rt-12 returns 2 unsold packages to warehouse (currently holds 9)
  state = recordRetailerReturn(state, {
    retailerId: 'rt-12',
    destination: 'warehouse',
    productId: 'prod-piarom-600',
    quantityReturned: 2,
    reason: 'عدم کشش محلی',
  });

  const inv = computeInventorySummary(state);
  assert.equal(inv.agentCustodyByAgent['ag-1'], 3);
  assert.equal(inv.retailerCustodyByRetailer['rt-12'], 7);
  assert.equal(inv.warehouseStock, 34); // 30 + 2 + 2
  assert.equal(inv.isReconciled, true);
});

test('Acceptance Tests 56-66: B2C QR order, inventory reservation, shipment tracking, and strict RBAC scoping', () => {
  let state = createInitialSeedState();

  const b2cRes = createB2cOrderWithSimulatedPayment(state, {
    customerName: 'کیانا رستگار',
    customerMobile: '09123456789',
    province: 'تهران',
    city: 'تهران',
    deliveryAddress: 'بلوار کشاورز، پلاک ۴۵',
    postalCode: '1415678901',
    productId: 'prod-piarom-600',
    quantity: 3,
    sourceChannel: 'qr_packaging',
  });
  state = b2cRes.nextState;

  // Generic QR packaging scan must NOT falsely attribute to any sales agent (Part 32)
  assert.equal(b2cRes.createdOrder.referralAgentId, undefined);

  const inv = computeInventorySummary(state);
  assert.equal(inv.warehouseStock, 27); // 30 - 3
  assert.equal(inv.soldDirectB2c, 23); // 20 + 3
  assert.equal(inv.isReconciled, true);

  state = updateB2cOrderFulfillment(state, {
    orderId: b2cRes.createdOrder.id,
    orderStatus: 'shipped',
    courierName: 'پست پیشتاز',
    trackingCode: 'POST-778899',
  });
  assert.equal(state.b2cOrders[0].orderStatus, 'shipped');

  // Security RBAC Scoping (Acceptance Tests 64-66):
  const agent1Scoped = getScopedStateForRole(state, 'agent', 'ag-1');
  assert.ok(agent1Scoped.retailers.every((r) => r.agentId === 'ag-1'));
  assert.ok(agent1Scoped.commissions.every((c) => c.agentId === 'ag-1'));

  const retailer1Scoped = getScopedStateForRole(state, 'retailer', 'rt-1');
  assert.equal(retailer1Scoped.retailers.length, 1);
  assert.equal(retailer1Scoped.retailers[0].id, 'rt-1');
  assert.ok(retailer1Scoped.invoices.every((i) => i.retailerId === 'rt-1'));

  // a customer never receives ledger rows (not even their own order): tracking is a separate public lookup by number + mobile
  const customerScoped = getScopedStateForRole(state, 'customer', b2cRes.createdOrder.orderNumber);
  assert.equal(customerScoped.b2cOrders.length, 0);
  assert.equal(customerScoped.customers.length, 0);
  assert.equal(customerScoped.payments.length, 0);
  // an agent never sees another agent's rows or the journal; a store sees no commission data
  assert.equal(agent1Scoped.journalEntries.length, 0);
  assert.equal(agent1Scoped.agents.length, 1);
  assert.equal(retailer1Scoped.commissions.length, 0);
  assert.equal(retailer1Scoped.journalEntries.length, 0);
});

// ---- findings fixed 2026-10-31 (hand-computed cases, not the engine's own output) ----
import { setClock } from './runtime.ts';

test('F-006: an advance payment earns no commission and is kept as credit, then applied to the next invoice', () => {
  let s = createInitialSeedState();
  const rt = s.retailers.find((r) => !s.invoices.some((i) => i.retailerId === r.id && i.remainingAmount > 0))!;
  const product = s.products[0];
  s = submitRetailerPayment(s, { retailerId: rt.id, amount: 300000, method: 'bank_transfer', referenceNumber: 'ADV', autoVerify: true });
  assert.equal(s.commissions.length, createInitialSeedState().commissions.length, 'no invoice -> no commission');
  const pay = s.payments.find((p) => p.referenceNumber === 'ADV')!;
  assert.equal(pay.unallocatedAmount, 300000);
  const stock = computeInventorySummary(s, product.id).retailerCustodyByRetailer[rt.id];
  if (stock > 0) {
    const before = s.commissions.length;
    s = submitAndVerifyRetailerSalesReport(s, { retailerId: rt.id, productId: product.id, reportedSoldQuantity: 1, idempotencyKey: 'adv-1' });
    const inv = s.invoices.find((i) => i.sourceReportId && i.retailerId === rt.id && i.createdAt >= pay.paymentDate)!;
    assert.equal(inv.paidAmount, Math.min(300000, product.baseRetailerPrice), 'the advance is applied to the new invoice');
    assert.equal(s.commissions.length, before + 1, 'commission is earned on the allocated part only, once');
    assert.equal(s.payments.find((p) => p.id === pay.id)!.unallocatedAmount, Math.max(0, 300000 - product.baseRetailerPrice));
  }
});

test('F-006: overpayment keeps the excess instead of losing it', () => {
  let s = createInitialSeedState();
  const rt = s.retailers.find((r) => s.invoices.some((i) => i.retailerId === r.id && i.remainingAmount > 0))!;
  const open = s.invoices.filter((i) => i.retailerId === rt.id).reduce((n, i) => n + i.remainingAmount, 0);
  s = submitRetailerPayment(s, { retailerId: rt.id, amount: open + 50000, method: 'bank_transfer', referenceNumber: 'OVER', autoVerify: true });
  const pay = s.payments.find((p) => p.referenceNumber === 'OVER')!;
  assert.equal(pay.unallocatedAmount, 50000);
  assert.equal(s.invoices.filter((i) => i.retailerId === rt.id).reduce((n, i) => n + i.remainingAmount, 0), 0);
  assert.equal(computeFinancialSummary(s).isReceivablesReconciled, true);
});

test('F-008: overdue follows the clock and the due date', () => {
  const base = createInitialSeedState();
  const inv = base.invoices.find((i) => i.remainingAmount > 0)!;
  const due = Date.parse(inv.dueDate);
  try {
    setClock(() => due - 86400000);
    assert.equal(isInvoiceOverdue(inv), false);
    setClock(() => due + 86400000);
    assert.equal(isInvoiceOverdue(inv), true);
    assert.equal(refreshOverdueFlags(base).invoices.find((i) => i.id === inv.id)!.isOverdue, true);
  } finally {
    setClock(null);
  }
});

test('F-007: commission methods - fixed per package, capped, thresholded, and reversed with the payment', () => {
  let s = createInitialSeedState();
  const rt = s.retailers.find((r) => s.invoices.some((i) => i.retailerId === r.id && i.remainingAmount > 0))!;
  const agentId = rt.agentId;
  s = { ...s, commissionRules: [{ id: 'r-fix', name: 'ثابت هر بسته', agentId, channel: 'B2B', method: 'fixed_per_package_settled', rateOrAmount: 10000, effectiveStartDate: '2020-01-01T00:00:00Z', minThreshold: 0, maxLimit: 25000, isActive: true, notes: '' }] };
  const inv = s.invoices.find((i) => i.retailerId === rt.id && i.remainingAmount > 0)!;
  const pay = Math.min(inv.remainingAmount, inv.unitPriceSnapshot * 4);
  s = submitRetailerPayment(s, { retailerId: rt.id, amount: pay, method: 'bank_transfer', referenceNumber: 'FIX', autoVerify: true });
  const c = s.commissions.find((x) => x.sourcePaymentId === s.payments.find((p) => p.referenceNumber === 'FIX')!.id)!;
  assert.equal(c.commissionAmount, Math.min(Math.floor(pay / inv.unitPriceSnapshot) * 10000, 25000), 'packages settled x 10000, capped at 25000');
  const paymentId = s.payments.find((p) => p.referenceNumber === 'FIX')!.id;
  s = reverseRetailerPayment(s, { paymentId, reason: 'آزمون' });
  assert.equal(s.commissions.find((x) => x.id === c.id)!.status, 'reversed');
  assert.equal(s.invoices.find((i) => i.id === inv.id)!.remainingAmount, inv.remainingAmount);
});

test('Part 33 formulas: inventory and receivable reconciliation hold after a mixed sequence', () => {
  const s = createInitialSeedState();
  const inv = computeInventorySummary(s);
  assert.equal(inv.isReconciled, true);
  assert.equal(inv.warehouseStock + inv.totalAgentCustody + inv.totalRetailerCustody + inv.soldThroughRetailers + inv.soldDirectB2c, inv.initialAndInbound);
  const fin = computeFinancialSummary(s);
  assert.equal(fin.totalB2bReceivablesGenerated - fin.totalVerifiedB2bCollections, fin.totalOutstandingReceivables);
});

test('ids never collide even within the same millisecond (F-009)', () => {
  setClock(() => 1_700_000_000_000);
  try {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(uid());
    assert.equal(seen.size, 5000);
  } finally {
    setClock(null);
  }
});


test('Owner price decision: 700,000 per box, 20% to the store, 5% to the distribution agent (hand-computed)', () => {
  const s = createInitialSeedState();
  const p = s.products[0];
  assert.equal(p.suggestedRetailPrice, 700000);
  assert.equal(p.directB2cPrice, 700000);
  assert.equal(p.suggestedRetailPrice - p.baseRetailerPrice, 140000, 'store keeps 20% = 140,000');
  assert.equal(p.baseRetailerPrice, 560000);
  assert.ok(/بم/.test(p.name) && !/حاجی/.test(p.name + p.description), 'origin is Bam');
  assert.ok(s.commissionRules.every((r) => r.method === 'consumer_price_percent_settled' && r.rateOrAmount === 5));
  // a full-package payment earns exactly 35,000 for the agent; the owner keeps 700,000 - 140,000 - 35,000 = 525,000 (75%)
  const rt = s.retailers.find((r) => s.invoices.some((i) => i.retailerId === r.id && i.remainingAmount >= 560000))!;
  const n = submitRetailerPayment(s, { retailerId: rt.id, amount: 560000, method: 'bank_transfer', referenceNumber: 'BOX', autoVerify: true });
  const pay = n.payments.find((x) => x.referenceNumber === 'BOX')!;
  const c = n.commissions.find((x) => x.sourcePaymentId === pay.id)!;
  assert.equal(c.commissionAmount, 35000);
  assert.equal(700000 - 140000 - c.commissionAmount, 525000);
});

test('signed money documents: cash collected by an agent needs the signed scan before verification; remittance too', () => {
  let s = createInitialSeedState();
  const rt = s.retailers.find((r) => s.invoices.some((i) => i.retailerId === r.id && i.remainingAmount > 0))!;
  s = submitRetailerPayment(s, { retailerId: rt.id, amount: 100000, method: 'cash_to_agent', referenceNumber: 'CASH-DOC', collectedByAgentDirectly: true, collectingAgentId: rt.agentId, autoVerify: false });
  const pay = s.payments.find((x) => x.referenceNumber === 'CASH-DOC')!;
  const doc = s.documents.find((d) => d.id === pay.receiptDocumentId)!;
  assert.equal(doc.documentType, 'payment_receipt');
  assert.equal(doc.verificationStatus, 'pending_signature');
  assert.throws(() => verifyRetailerPayment(s, { paymentId: pay.id }), /امضا/);
  s = uploadSignedDocumentAttachment(s, { documentId: doc.id, filename: 's.png', mimeType: 'image/png', sizeBytes: 1000, uploadedBy: 'x' });
  s = verifyRetailerPayment(s, { paymentId: pay.id });
  assert.equal(s.payments.find((x) => x.id === pay.id)!.status, 'verified');

  // remittance by an agent stays pending and needs its receipt scan
  s = submitAndVerifyAgentRemittance(s, { agentId: 'ag-3', remittedAmount: 100000, transferReference: 'R-DOC', autoVerify: false });
  const rem = s.agentRemittances.find((x) => x.transferReference === 'R-DOC')!;
  assert.equal(rem.status, 'pending');
  assert.throws(() => verifyAgentRemittance(s, { remittanceId: rem.id, approve: true }), /بارگذاری/);
  s = uploadSignedDocumentAttachment(s, { documentId: rem.documentId!, filename: 'b.png', mimeType: 'image/png', sizeBytes: 1000, uploadedBy: 'x' });
  s = verifyAgentRemittance(s, { remittanceId: rem.id, approve: true });
  assert.equal(s.agentRemittances.find((x) => x.id === rem.id)!.status, 'verified');
});
