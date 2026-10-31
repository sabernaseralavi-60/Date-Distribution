export type UserRole = 'admin' | 'agent' | 'retailer' | 'customer';

export type CustodyPolicyMode = 'consignment' | 'credit_sale';

export type AgentStatus = 'active' | 'inactive' | 'suspended' | 'pending_approval';

export type RetailerStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'financial_review';

export type DocumentType =
  | 'agent_delivery'      // AG-1405-... Form 1
  | 'retailer_delivery'   // RT-1405-... Form 2
  | 'agent_return'        // AR-1405-... Form 3
  | 'retailer_return'     // RR-1405-... Form 4
  | 'payment_receipt'     // PAY-1405-... Form 7
  | 'remittance_receipt'  // REM-1405-... Form 8
  | 'visit_report'        // VIS-1405-... Form 10
  | 'damage_report'       // DAMAGE-1405-... Form 11
  | 'stock_count';        // CNT-1405-... Form 12

export type VerificationStatus = 'draft' | 'pending_signature' | 'uploaded' | 'verified' | 'rejected' | 'emergency_pending';

export interface BusinessSettings {
  businessName: string;
  brandTitle: string;
  logoText: string;
  address: string;
  phone: string;
  supportEmail: string;
  currencyLabel: string;
  dateCalendar: 'jalali' | 'gregorian';
  defaultRetailerMarkupPercent: number;
  defaultB2cPricePolicy: 'independent' | 'markup_based';
  defaultRetailerDeliveryMode: CustodyPolicyMode;
  defaultAgentCustodyMode: CustodyPolicyMode;
  defaultCommissionRatePercent: number;
  commissionAttributionPolicy: 'sales_agent' | 'collecting_agent' | 'split_50_50';
  settlementPeriodDays: number;
  lowStockWarningThreshold: number;
  defaultShippingFee: number;
  freeShippingThreshold: number;
  documentNumberPrefixYear: string;
  agentConsignmentDeclaration: string;
  agentCreditDeclaration: string;
  retailerConsignmentDeclaration: string;
  declarationVersion: number;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  packaging: string;
  netWeightGrams: number;
  unit: string;
  description: string;
  costPrice: number;
  baseRetailerPrice: number;
  retailerMarkupPercent: number;
  suggestedRetailPrice: number;
  directB2cPrice: number;
  campaignPrice?: number;
  priceEffectiveDate: string;
  priceExpirationDate?: string;
  minStockAlert: number;
  barcode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryRecord {
  id: string;
  productId: string;
  costPrice: number;
  baseRetailerPrice: number;
  retailerMarkupPercent: number;
  suggestedRetailPrice: number;
  directB2cPrice: number;
  campaignPrice?: number;
  effectiveDate: string;
  expirationDate?: string;
  createdBy: string;
}

export interface CommissionRule {
  id: string;
  name: string;
  agentId: string;
  productId?: string;
  channel: 'B2B' | 'B2C' | 'ALL';
  method:
    | 'verified_collections_percent'
    | 'reported_sales_percent'
    | 'fixed_per_package_sold'
    | 'fixed_per_package_settled'
    | 'fixed_per_new_retailer'
    | 'campaign_bonus';
  rateOrAmount: number;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  minThreshold: number;
  maxLimit?: number;
  isActive: boolean;
  notes: string;
}

export interface SalesAgent {
  id: string;
  code: string;
  fullName: string;
  mobile: string;
  nationalId?: string;
  address: string;
  startDate: string;
  status: AgentStatus;
  username: string;
  commissionRuleId: string;
  commissionRatePercent: number;
  custodyPolicyMode: CustodyPolicyMode;
  assignedRetailerIds: string[];
  notes: string;
}

export interface Retailer {
  id: string;
  code: string;
  storeName: string;
  ownerName: string;
  mobile: string;
  landline: string;
  address: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  gpsCoordinates?: string;
  businessLicenseId?: string;
  agentId: string;
  acquisitionAgentId: string;
  registrationDate: string;
  approvedDate?: string;
  approvedBy?: string;
  status: RetailerStatus;
  settlementIntervalDays: number;
  deliveryMode: CustodyPolicyMode;
  creditLimit: number;
  nextSettlementDate: string;
  hasOverdueReceivable: boolean;
  notes: string;
}

export interface Customer {
  id: string;
  fullName: string;
  mobile: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  referralAgentId?: string;
  createdAt: string;
}

export type InventoryMovementType =
  | 'initial_stock'
  | 'supplier_receipt'
  | 'warehouse_to_agent'
  | 'agent_to_retailer'
  | 'retailer_sale'
  | 'agent_return_to_warehouse'
  | 'retailer_return_to_agent'
  | 'retailer_return_to_warehouse'
  | 'b2c_reservation'
  | 'b2c_fulfillment'
  | 'damaged_stock'
  | 'stock_adjustment';

export interface InventoryTransaction {
  id: string;
  productId: string;
  movementType: InventoryMovementType;
  fromLocationType: 'external' | 'warehouse' | 'agent' | 'retailer' | 'b2c_reserved' | 'damaged';
  fromLocationId: string;
  toLocationType: 'warehouse' | 'agent' | 'retailer' | 'b2c_reserved' | 'customer' | 'damaged' | 'write_off';
  toLocationId: string;
  quantity: number;
  unitPriceSnapshot: number;
  referenceDocumentId?: string;
  createdAt: string;
  createdBy: string;
  notes: string;
}

export interface DocumentAttachment {
  id: string;
  documentId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  checksumSha256: string;
  storageKey: string;
  version: number;
  previewDataUrl?: string;
}

export interface OfficialDocument {
  id: string;
  documentNumber: string;
  documentType: DocumentType;
  title: string;
  issueDate: string;
  agentId?: string;
  retailerId?: string;
  productId: string;
  quantity: number;
  unitReferencePrice: number;
  retailerMarkupPercent?: number;
  suggestedRetailPrice?: number;
  totalReferenceValue: number;
  policyMode: CustodyPolicyMode;
  declarationText: string;
  verificationStatus: VerificationStatus;
  isDemoPlaceholder: boolean;
  signerAgentName?: string;
  signerRetailerName?: string;
  signerWarehouseName?: string;
  approvedByAdmin?: string;
  approvedAt?: string;
  rejectionReason?: string;
  emergencyDeadline?: string;
  attachments: DocumentAttachment[];
  notes: string;
}

export interface ConsignmentDelivery {
  id: string;
  documentId: string;
  documentNumber: string;
  agentId: string;
  retailerId: string;
  productId: string;
  quantityDelivered: number;
  quantitySold: number;
  quantityReturned: number;
  quantityDamaged: number;
  unitSettlementPriceSnapshot: number;
  retailerMarkupSnapshot: number;
  suggestedRetailPriceSnapshot: number;
  deliveryMode: CustodyPolicyMode;
  status: 'draft' | 'pending_verification' | 'verified' | 'rejected';
  deliveredAt: string;
  verifiedAt?: string;
}

export interface RetailerSalesReport {
  id: string;
  reportNumber: string;
  retailerId: string;
  agentId: string;
  productId: string;
  periodStart: string;
  periodEnd: string;
  openingStock: number;
  receivedQuantity: number;
  returnedQuantity: number;
  reportedSoldQuantity: number;
  damagedQuantity: number;
  calculatedClosingStock: number;
  physicalCountedStock: number;
  hasDiscrepancy: boolean;
  unitSettlementPriceSnapshot: number;
  receivableGenerated: number;
  status: 'draft' | 'submitted' | 'confirmed_by_retailer' | 'verified_by_admin' | 'rejected' | 'under_review';
  idempotencyKey: string;
  createdAt: string;
  verifiedAt?: string;
  notes: string;
}

export interface ReceivableInvoice {
  id: string;
  invoiceNumber: string;
  retailerId: string;
  agentId: string;
  sourceReportId?: string;
  sourceDeliveryId?: string;
  productId: string;
  quantity: number;
  unitPriceSnapshot: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  isOverdue: boolean;
  status: 'open' | 'partially_paid' | 'paid' | 'reversed';
  createdAt: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  retailerId: string;
  agentId: string;
  allocatedAmount: number;
  createdAt: string;
}

export interface RetailerPayment {
  id: string;
  paymentNumber: string;
  retailerId: string;
  collectingAgentId?: string;
  salesAttributionAgentId: string;
  paymentDate: string;
  amount: number;
  method: 'bank_transfer' | 'pos' | 'cash_to_agent' | 'other';
  bankName?: string;
  referenceNumber: string;
  collectedByAgentDirectly: boolean;
  status: 'pending' | 'verified' | 'rejected' | 'reversed';
  allocations: PaymentAllocation[];
  receiptDocumentId?: string;
  idempotencyKey: string;
  notes: string;
}

export interface AgentCashCollection {
  id: string;
  receiptNumber: string;
  agentId: string;
  retailerId: string;
  paymentId: string;
  amount: number;
  collectedAt: string;
  method: 'cash' | 'pos_slip' | 'cheque';
  holdingStatus: 'held_by_agent' | 'remitted_to_owner' | 'verified_in_bank';
  notes: string;
}

export interface AgentRemittance {
  id: string;
  remittanceNumber: string;
  agentId: string;
  previousCashHeld: number;
  newlyCollectedAmount: number;
  remittedAmount: number;
  remainingCashHeld: number;
  remittanceDate: string;
  transferReference: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  notes: string;
}

export interface CommissionRecord {
  id: string;
  commissionNumber: string;
  agentId: string;
  sourcePaymentId: string;
  sourceAllocationId?: string;
  retailerId: string;
  productId: string;
  baseBasisAmount: number;
  ruleNameSnapshot: string;
  ratePercentSnapshot: number;
  commissionAmount: number;
  paidAmount: number;
  remainingPayable: number;
  status:
    | 'calculated'
    | 'pending_verification'
    | 'earned'
    | 'approved'
    | 'partially_paid'
    | 'paid'
    | 'cancelled'
    | 'reversed';
  createdAt: string;
  approvedAt?: string;
  notes: string;
}

export interface CommissionPayment {
  id: string;
  paymentNumber: string;
  commissionRecordId: string;
  agentId: string;
  amountPaid: number;
  paymentDate: string;
  referenceNumber: string;
  paidBy: string;
  notes: string;
}

export type VisitOutcome =
  | 'stock_sufficient'
  | 'stock_low'
  | 'stock_depleted'
  | 'restocking_requested'
  | 'payment_followup_required'
  | 'payment_received'
  | 'store_unavailable'
  | 'other';

export interface FieldVisitReport {
  id: string;
  visitNumber: string;
  agentId: string;
  retailerId: string;
  visitDate: string;
  gpsCoordinates?: string;
  observedStock: number;
  retailerReportedSales: number;
  outstandingBalanceSnapshot: number;
  paymentFollowupStatus: string;
  restockingNeededCount: number;
  competitorObservations: string;
  outcome: VisitOutcome;
  nextVisitDate: string;
  notes: string;
}

export interface RestockRequest {
  id: string;
  requestNumber: string;
  retailerId: string;
  requestedByRole: 'retailer' | 'agent' | 'admin';
  agentId: string;
  productId: string;
  currentEstimatedStock: number;
  requestedQuantity: number;
  approvedQuantity?: number;
  reason: string;
  urgency: 'normal' | 'high' | 'critical';
  preferredDeliveryDate: string;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'in_preparation' | 'delivered' | 'cancelled';
  createdAt: string;
  notes: string;
}

export interface InventoryDiscrepancy {
  id: string;
  reportNumber: string;
  reportedBy: string;
  locationType: 'warehouse' | 'agent' | 'retailer';
  locationId: string;
  productId: string;
  relatedDocumentNumber?: string;
  expectedQuantity: number;
  observedQuantity: number;
  differenceQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  reason: string;
  resolution:
    | 'pending_review'
    | 'no_discrepancy'
    | 'return_to_warehouse'
    | 'approved_damage_writeoff'
    | 'financial_claim'
    | 'further_investigation'
    | 'approved_stock_adjustment';
  financialLiabilityGenerated: number;
  createdAt: string;
  resolvedBy?: string;
  notes: string;
}

export interface InventoryCountRecord {
  id: string;
  countNumber: string;
  locationType: 'warehouse' | 'agent' | 'retailer';
  locationId: string;
  productId: string;
  expectedSystemQuantity: number;
  actualCountedQuantity: number;
  difference: number;
  countDate: string;
  countedBy: string;
  reviewerName: string;
  status: 'pending_approval' | 'approved_adjusted' | 'reconciled_exact';
  notes: string;
}

export type B2cOrderStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'payment_pending'
  | 'paid'
  | 'preparing'
  | 'ready_for_dispatch'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded';

export type B2cPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface B2cOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  province: string;
  city: string;
  deliveryAddress: string;
  postalCode: string;
  deliveryInstructions?: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  discountAmount: number;
  shippingFee: number;
  totalPayable: number;
  orderStatus: B2cOrderStatus;
  paymentStatus: B2cPaymentStatus;
  simulatedPaymentRef?: string;
  packingOperator?: string;
  courierName?: string;
  trackingCode?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  referralAgentId?: string;
  sourceChannel: 'qr_packaging' | 'direct_web' | 'agent_referral';
  idempotencyKey: string;
  createdAt: string;
}

export interface OrderRefundRecord {
  id: string;
  refundNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  reason: string;
  requestedAmount: number;
  approvedRefundAmount: number;
  paymentReference: string;
  returnedStockInspectionStatus: 'not_returned' | 'pending_inspection' | 'inspected_restocked' | 'inspected_damaged';
  refundDate: string;
  approvedBy: string;
  notes: string;
}

export interface OperatingExpense {
  id: string;
  expenseNumber: string;
  category: 'packaging' | 'transport' | 'warehousing' | 'marketing' | 'commission_payout' | 'other';
  title: string;
  amount: number;
  expenseDate: string;
  paidFromAccount: string;
  referenceNumber: string;
  recordedBy: string;
  notes: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  referenceType: 'delivery' | 'sale_report' | 'payment' | 'remittance' | 'commission' | 'b2c_order' | 'refund' | 'expense' | 'adjustment';
  referenceId: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
}

export interface AppNotification {
  id: string;
  targetRole: UserRole;
  targetEntityId?: string;
  title: string;
  message: string;
  category: 'delivery' | 'payment' | 'stock' | 'commission' | 'document' | 'order';
  isRead: boolean;
  createdAt: string;
}

export interface QrReferralLog {
  id: string;
  code: string;
  type: 'product_packaging_qr' | 'agent_referral_link';
  productId?: string;
  referralAgentId?: string;
  campaignId?: string;
  scansCount: number;
  pageViewsCount: number;
  retailerRegistrationsCount: number;
  b2cOrdersCount: number;
  lastScannedAt: string;
}

export interface AuditLog {
  id: string;
  actorRole: UserRole;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface SaberCommerceState {
  version: number;
  settings: BusinessSettings;
  products: Product[];
  priceHistory: PriceHistoryRecord[];
  commissionRules: CommissionRule[];
  agents: SalesAgent[];
  retailers: Retailer[];
  customers: Customer[];
  inventoryTransactions: InventoryTransaction[];
  documents: OfficialDocument[];
  consignmentDeliveries: ConsignmentDelivery[];
  salesReports: RetailerSalesReport[];
  invoices: ReceivableInvoice[];
  payments: RetailerPayment[];
  agentCashCollections: AgentCashCollection[];
  agentRemittances: AgentRemittance[];
  commissions: CommissionRecord[];
  commissionPayments: CommissionPayment[];
  visits: FieldVisitReport[];
  restockRequests: RestockRequest[];
  discrepancies: InventoryDiscrepancy[];
  inventoryCounts: InventoryCountRecord[];
  b2cOrders: B2cOrder[];
  refunds: OrderRefundRecord[];
  expenses: OperatingExpense[];
  journalEntries: JournalEntry[];
  notifications: AppNotification[];
  qrLogs: QrReferralLog[];
  auditLogs: AuditLog[];
}
