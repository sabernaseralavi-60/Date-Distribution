import {
  SaberCommerceState,
  BusinessSettings,
  Product,
  CommissionRule,
  SalesAgent,
  Retailer,
  Customer,
  InventoryTransaction,
  OfficialDocument,
  ConsignmentDelivery,
  RetailerSalesReport,
  ReceivableInvoice,
  RetailerPayment,
  CommissionRecord,
  FieldVisitReport,
  RestockRequest,
  B2cOrder,
  JournalEntry,
  AppNotification,
  QrReferralLog,
  AuditLog,
  AgentCashCollection,
  AgentRemittance,
  OperatingExpense,
} from './types.ts';

export const DEFAULT_AGENT_CONSIGNMENT_DECLARATION =
  'اینجانب دریافت تعداد و مشخصات کالای مندرج در این رسید را تأیید می‌کنم. متعهد می‌شوم کالاهای دریافتی را مطابق قرارداد همکاری و ضوابط تعیین‌شده نگهداری، توزیع و تعیین تکلیف کرده و کلیه تحویل‌های انجام‌شده به فروشگاه‌ها را با اسناد مربوط در سامانه ثبت نمایم. همچنین موظف هستم کالاهای توزیع‌نشده را مطابق ضوابط توافق‌شده بازگردانده یا تعیین تکلیف کنم.';

export const DEFAULT_AGENT_CREDIT_DECLARATION =
  'اینجانب دریافت تعداد و مشخصات کالای مندرج در این رسید را تحت شرایط فروش نسیه (تعهد مالی قطعی) تأیید می‌کنم و متعهد می‌شوم کل مبلغ توافق‌شده را در سررسید مقرر تسویه نمایم.';

export const DEFAULT_RETAILER_CONSIGNMENT_DECLARATION =
  'اینجانب دریافت تعداد و مشخصات کالاهای مندرج در این رسید را تأیید می‌کنم. کالاها مطابق شرایط فروش امانی در اختیار فروشگاه قرار گرفته‌اند. فروشگاه موظف است تعداد کالاهای فروخته‌شده، موجودی باقی‌مانده و کسری یا کالای آسیب‌دیده را در سامانه گزارش کند و مبالغ مربوط به کالاهای فروخته‌شده را طبق شرایط توافق‌شده تسویه نماید. کالاهای فروش‌نرفته نیز مطابق شرایط توافق‌شده قابل بازگشت یا تعیین تکلیف خواهند بود.';

export const createInitialSaberState = createInitialSeedState;

export function createInitialSeedState(): SaberCommerceState {
  const settings: BusinessSettings = {
    businessName: 'خرمای صابر',
    brandTitle: 'خرمای صابر — نخلستان‌های جنوب ایران',
    logoText: 'صابر',
    address: 'تهران، خیابان ولیعصر، بالاتر از میدان ونک، پلاک २४۸، واحد ۱۲',
    phone: '۰۲۱-۸۸۷۷۶۶۵۵',
    supportEmail: 'saber.naseralavi@gmail.com',
    currencyLabel: 'تومان',
    dateCalendar: 'jalali',
    defaultRetailerMarkupPercent: 15,
    defaultB2cPricePolicy: 'independent',
    defaultRetailerDeliveryMode: 'consignment',
    defaultAgentCustodyMode: 'consignment',
    defaultCommissionRatePercent: 6,
    commissionAttributionPolicy: 'sales_agent',
    settlementPeriodDays: 14,
    lowStockWarningThreshold: 25,
    defaultShippingFee: 35000,
    freeShippingThreshold: 500000,
    documentNumberPrefixYear: '1405',
    agentConsignmentDeclaration: DEFAULT_AGENT_CONSIGNMENT_DECLARATION,
    agentCreditDeclaration: DEFAULT_AGENT_CREDIT_DECLARATION,
    retailerConsignmentDeclaration: DEFAULT_RETAILER_CONSIGNMENT_DECLARATION,
    declarationVersion: 1,
  };

  const mainProduct: Product = {
    id: 'prod-piarom-600',
    sku: 'PRM-600',
    slug: 'piarom-600',
    name: 'خرمای پیارم ممتاز حاجی‌آباد',
    brand: 'خرمای صابر',
    category: 'خرمای خشک و نیمه‌خشک صادراتی',
    packaging: 'بسته پلاستیکی شفاف کریستالی بهداشتی',
    netWeightGrams: 600,
    unit: 'بسته',
    description:
      'خرمای پیارم درجه یک دست‌چین نخلستان‌های حاجی‌آباد هرمزگان، با پوست نازک قهوه‌ای تیره، بافت گوشتی کاراملی و قند طبیعی مناسب مصرف روزانه و پذیرایی در بسته‌بندی شفاف ۶۰۰ گرمی.',
    costPrice: 155000,
    baseRetailerPrice: 200000,
    retailerMarkupPercent: 15,
    suggestedRetailPrice: 230000,
    directB2cPrice: 240000,
    campaignPrice: undefined,
    priceEffectiveDate: '2026-10-01T08:00:00.000Z',
    minStockAlert: 25,
    barcode: '6260458900601',
    isActive: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  };

  const agentDefinitions = [
    { id: 'ag-1', code: 'AG-01', name: 'امیرحسین رضایی', mobile: '09121110001', rate: 6, retailers: ['rt-1', 'rt-2'], district: 'منطقه ۱ و ۳ (شمیرانات و ونک)' },
    { id: 'ag-2', code: 'AG-02', name: 'محمدمهدی کریمی', mobile: '09121110002', rate: 7, retailers: ['rt-3', 'rt-4'], district: 'منطقه ۲ (سعادت‌آباد و شهرک غرب)' },
    { id: 'ag-3', code: 'AG-03', name: 'سارا احمدی', mobile: '09121110003', rate: 8, retailers: ['rt-5', 'rt-6'], district: 'منطقه ۶ (یوسف‌آباد و امیرآباد)' },
    { id: 'ag-4', code: 'AG-04', name: 'علی‌اصغر محمدی', mobile: '09121110004', rate: 5, retailers: ['rt-7', 'rt-8'], district: 'منطقه ۴ و ۸ (تهرانپارس و نارمک)' },
    { id: 'ag-5', code: 'AG-05', name: 'نگار حسینی', mobile: '09121110005', rate: 6, retailers: ['rt-9', 'rt-10'], district: 'منطقه ۵ (پونک و جنت‌آباد)' },
    { id: 'ag-6', code: 'AG-06', name: 'رضا کاظمی', mobile: '09121110006', rate: 5, retailers: ['rt-11', 'rt-12'], district: 'منطقه ۷ و ۱۰ (مطهری و ستارخان)' },
  ];

  const commissionRules: CommissionRule[] = agentDefinitions.map((ag, idx) => ({
    id: `crule-${idx + 1}`,
    name: `قانون پورسانت وصول مطالبات (${ag.rate}٪) — ${ag.name}`,
    agentId: ag.id,
    productId: mainProduct.id,
    channel: 'B2B',
    method: 'verified_collections_percent',
    rateOrAmount: ag.rate,
    effectiveStartDate: '2026-10-01T08:00:00.000Z',
    minThreshold: 0,
    isActive: true,
    notes: `پورسانت استاندارد ${ag.rate} درصد بر مبنای مبالغ وصول و تأییدشده از فروشگاه‌ها`,
  }));

  const agents: SalesAgent[] = agentDefinitions.map((ag, idx) => ({
    id: ag.id,
    code: ag.code,
    fullName: ag.name,
    mobile: ag.mobile,
    nationalId: `001234567${idx + 1}`,
    address: `تهران، ${ag.district}`,
    startDate: '2026-10-01T08:00:00.000Z',
    status: 'active',
    username: `agent${idx + 1}`,
    commissionRuleId: `crule-${idx + 1}`,
    commissionRatePercent: ag.rate,
    custodyPolicyMode: 'consignment',
    assignedRetailerIds: ag.retailers,
    notes: `پوشش پخش مویرگی در محدوده ${ag.district}`,
  }));

  // 12 Retailers:
  // RT-01..RT-07 sell 8 packages each (56 total)
  // RT-08..RT-10 sell 4 packages each (12 total)
  // RT-11..RT-12 sell 1 package each (2 total)
  // Total = 70 packages sold.
  const retailerDefinitions = [
    { id: 'rt-1', code: 'RT-01', storeName: 'هایپرمارکت زعفرانیه', ownerName: 'حاج محمود توکلی', agentId: 'ag-1', district: 'زعفرانیه', sold: 8, paidVerified: 1600000, pendingPay: 0, overdue: false },
    { id: 'rt-2', code: 'RT-02', storeName: 'سوپرمارکت نمونه ونک', ownerName: 'بهرام شمس', agentId: 'ag-1', district: 'میدان ونک', sold: 8, paidVerified: 1600000, pendingPay: 0, overdue: false },
    { id: 'rt-3', code: 'RT-03', storeName: 'فروشگاه پروتئین و خشکبار سعادت', ownerName: 'کیوان نادری', agentId: 'ag-2', district: 'سعادت‌آباد', sold: 8, paidVerified: 1600000, pendingPay: 0, overdue: false },
    { id: 'rt-4', code: 'RT-04', storeName: 'سوپرمارکت کاج طلایی', ownerName: 'مرتضی عرب', agentId: 'ag-2', district: 'شهرک غرب', sold: 8, paidVerified: 1600000, pendingPay: 0, overdue: false },
    { id: 'rt-5', code: 'RT-05', storeName: 'مارکت ارگانیک یوسف‌آباد', ownerName: 'فرهاد امینی', agentId: 'ag-3', district: 'یوسف‌آباد', sold: 8, paidVerified: 1200000, pendingPay: 0, overdue: false },
    { id: 'rt-6', code: 'RT-06', storeName: 'فروشگاه مواد غذایی بهاران', ownerName: 'سعید جلالی', agentId: 'ag-3', district: 'امیرآباد شمالی', sold: 8, paidVerified: 1000000, pendingPay: 0, overdue: true },
    { id: 'rt-7', code: 'RT-07', storeName: 'سوپرمارکت فلکه اول تهرانپارس', ownerName: 'جواد حیدری', agentId: 'ag-4', district: 'تهرانپارس', sold: 8, paidVerified: 600000, pendingPay: 0, overdue: true },
    { id: 'rt-8', code: 'RT-08', storeName: 'سوپرمارکت هفت‌حوض', ownerName: 'حمیدرضا قاسمی', agentId: 'ag-4', district: 'نارمک', sold: 4, paidVerified: 800000, pendingPay: 0, overdue: false },
    { id: 'rt-9', code: 'RT-09', storeName: 'فروشگاه زنجیره‌ای پونک مال', ownerName: 'پیمان مرادی', agentId: 'ag-5', district: 'پونک', sold: 4, paidVerified: 0, pendingPay: 400000, overdue: true },
    { id: 'rt-10', code: 'RT-10', storeName: 'سوپرمارکت شاهین شمالی', ownerName: 'داوود رستمی', agentId: 'ag-5', district: 'جنت‌آباد', sold: 4, paidVerified: 0, pendingPay: 500000, overdue: false },
    { id: 'rt-11', code: 'RT-11', storeName: 'سوپرمارکت سهروردی', ownerName: 'مجید فلاح', agentId: 'ag-6', district: 'سهروردی شمالی', sold: 1, paidVerified: 0, pendingPay: 0, overdue: true },
    { id: 'rt-12', code: 'RT-12', storeName: 'مارکت سلامت ستارخان', ownerName: 'اشکان پورمند', agentId: 'ag-6', district: 'ستارخان', sold: 1, paidVerified: 0, pendingPay: 0, overdue: false },
  ];

  const retailers: Retailer[] = retailerDefinitions.map((rt, idx) => ({
    id: rt.id,
    code: rt.code,
    storeName: rt.storeName,
    ownerName: rt.ownerName,
    mobile: `091233300${String(idx + 1).padStart(2, '0')}`,
    landline: `021880010${String(idx + 1).padStart(2, '0')}`,
    address: `تهران، محله ${rt.district}، خیابان اصلی، پلاک ${idx * 12 + 14}`,
    province: 'تهران',
    city: 'تهران',
    district: rt.district,
    postalCode: `14567890${String(idx + 10)}`,
    gpsCoordinates: `35.${7200 + idx * 15}, 51.${3800 + idx * 20}`,
    businessLicenseId: `SENF-1402-${1000 + idx}`,
    agentId: rt.agentId,
    acquisitionAgentId: rt.agentId,
    registrationDate: '2026-10-02T09:00:00.000Z',
    approvedDate: '2026-10-02T11:00:00.000Z',
    approvedBy: 'صابر نصرعلوی (مدیر ارشد)',
    status: 'active',
    settlementIntervalDays: 14,
    deliveryMode: 'consignment',
    creditLimit: 5000000,
    nextSettlementDate: rt.overdue ? '2026-10-22T00:00:00.000Z' : '2026-11-08T00:00:00.000Z',
    hasOverdueReceivable: rt.overdue,
    notes: `فروشگاه فعال تحت پوشش ${rt.district}`,
  }));

  // 20 Direct B2C Customers
  const customerNames = [
    'مریم کاوه', 'سینا طاهری', 'الهام فرهادی', 'پویا یزدی', 'زهرا موسوی',
    'آرش بهرامی', 'مهسا سلیمانی', 'کاوه رحیمی', 'فاطمه نوری', 'امید شجاعی',
    'لیلا صادقی', 'بهزاد عباسی', 'نازنین اکبری', 'حامد گودرزی', 'شیما افشار',
    'رامین کرمی', 'سمیرا حاتمی', 'یاسر مقیمی', 'هدیه زارع', 'فرزاد نیک‌پی',
  ];

  const customers: Customer[] = customerNames.map((name, idx) => ({
    id: `cu-${idx + 1}`,
    fullName: name,
    mobile: `091277700${String(idx + 1).padStart(2, '0')}`,
    province: idx < 16 ? 'تهران' : 'البرز',
    city: idx < 16 ? 'تهران' : 'کرج',
    address: `خیابان آزادی، کوچه ${idx + 1}، پلاک ${idx + 5}`,
    postalCode: `13456789${String(idx + 10)}`,
    referralAgentId: idx % 5 === 0 ? 'ag-1' : undefined,
    createdAt: '2026-10-10T10:00:00.000Z',
  }));

  const inventoryTransactions: InventoryTransaction[] = [];
  const documents: OfficialDocument[] = [];
  const consignmentDeliveries: ConsignmentDelivery[] = [];
  const salesReports: RetailerSalesReport[] = [];
  const invoices: ReceivableInvoice[] = [];
  const payments: RetailerPayment[] = [];
  const commissions: CommissionRecord[] = [];
  const journalEntries: JournalEntry[] = [];

  // 1. Initial Warehouse Stock = 200 packages
  inventoryTransactions.push({
    id: 'inv-tx-init-200',
    productId: mainProduct.id,
    movementType: 'initial_stock',
    fromLocationType: 'external',
    fromLocationId: 'supplier-hajjiabad',
    toLocationType: 'warehouse',
    toLocationId: 'main-warehouse',
    quantity: 200,
    unitPriceSnapshot: mainProduct.costPrice,
    createdAt: '2026-10-01T09:00:00.000Z',
    createdBy: 'صابر نصرعلوی',
    notes: 'موجودی اولیه انبار مرکزی — ۲۰۰ بسته خرمای پیارم ۶۰۰ گرمی',
  });

  journalEntries.push({
    id: 'je-init-stock',
    entryNumber: 'JE-1405-0001',
    entryDate: '2026-10-01T09:00:00.000Z',
    description: 'ثبت موجودی اولیه انبار مرکزی (۲۰۰ بسته خرمای پیارم)',
    referenceType: 'adjustment',
    referenceId: 'inv-tx-init-200',
    debitAccount: 'موجودی کالای انبار مرکزی',
    creditAccount: 'سرمایه اولیه کالا',
    amount: 200 * mainProduct.costPrice,
  });

  // 2. Warehouse to Agent Deliveries: 6 agents × 25 packages = 150 packages
  agents.forEach((ag, idx) => {
    const docNum = `AG-1405-${String(idx + 1).padStart(5, '0')}`;
    const docId = `doc-ag-${idx + 1}`;
    documents.push({
      id: docId,
      documentNumber: docNum,
      documentType: 'agent_delivery',
      title: 'رسید تحویل کالا و تعهد نگهداری بازاریاب',
      issueDate: '2026-10-03T09:30:00.000Z',
      agentId: ag.id,
      productId: mainProduct.id,
      quantity: 25,
      unitReferencePrice: mainProduct.baseRetailerPrice,
      totalReferenceValue: 25 * mainProduct.baseRetailerPrice,
      policyMode: 'consignment',
      declarationText: settings.agentConsignmentDeclaration,
      verificationStatus: 'verified',
      isDemoPlaceholder: true,
      signerAgentName: ag.fullName,
      signerWarehouseName: 'حسین رضوان (سرپرست انبار)',
      approvedByAdmin: 'صابر نصرعلوی',
      approvedAt: '2026-10-03T11:00:00.000Z',
      attachments: [
        {
          id: `att-ag-${idx + 1}`,
          documentId: docId,
          originalFilename: `${docNum}-signed-scan.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: 342000,
          uploadedBy: ag.fullName,
          uploadedAt: '2026-10-03T10:15:00.000Z',
          checksumSha256: `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b80${idx + 1}`,
          storageKey: `private/documents/1405/${docNum}.jpg`,
          version: 1,
        },
      ],
      notes: `تحویل امانی ۲۵ بسته به بازاریاب ${ag.fullName}`,
    });

    inventoryTransactions.push({
      id: `inv-tx-w2a-${idx + 1}`,
      productId: mainProduct.id,
      movementType: 'warehouse_to_agent',
      fromLocationType: 'warehouse',
      fromLocationId: 'main-warehouse',
      toLocationType: 'agent',
      toLocationId: ag.id,
      quantity: 25,
      unitPriceSnapshot: mainProduct.baseRetailerPrice,
      referenceDocumentId: docId,
      createdAt: '2026-10-03T11:00:00.000Z',
      createdBy: 'صابر نصرعلوی',
      notes: `تحویل امانی به بازاریاب ${ag.code} به موجب سند ${docNum}`,
    });
  });

  // 3. Agent to Retailer Deliveries: 12 retailers × 10 packages = 120 packages
  retailerDefinitions.forEach((rtDef, idx) => {
    const rt = retailers[idx];
    const ag = agents.find((a) => a.id === rt.agentId)!;
    const docNum = `RT-1405-${String(idx + 1).padStart(5, '0')}`;
    const docId = `doc-rt-${idx + 1}`;
    const delivId = `deliv-${idx + 1}`;

    documents.push({
      id: docId,
      documentNumber: docNum,
      documentType: 'retailer_delivery',
      title: 'رسید تحویل امانی محصول به فروشگاه',
      issueDate: '2026-10-05T10:00:00.000Z',
      agentId: ag.id,
      retailerId: rt.id,
      productId: mainProduct.id,
      quantity: 10,
      unitReferencePrice: mainProduct.baseRetailerPrice,
      retailerMarkupPercent: mainProduct.retailerMarkupPercent,
      suggestedRetailPrice: mainProduct.suggestedRetailPrice,
      totalReferenceValue: 10 * mainProduct.baseRetailerPrice,
      policyMode: 'consignment',
      declarationText: settings.retailerConsignmentDeclaration,
      verificationStatus: 'verified',
      isDemoPlaceholder: true,
      signerAgentName: ag.fullName,
      signerRetailerName: rt.ownerName,
      approvedByAdmin: 'صابر نصرعلوی',
      approvedAt: '2026-10-05T14:00:00.000Z',
      attachments: [
        {
          id: `att-rt-${idx + 1}`,
          documentId: docId,
          originalFilename: `${docNum}-store-stamp.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: 418000,
          uploadedBy: ag.fullName,
          uploadedAt: '2026-10-05T12:30:00.000Z',
          checksumSha256: `sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a${String(idx + 1).padStart(2, '0')}`,
          storageKey: `private/documents/1405/${docNum}.jpg`,
          version: 1,
        },
      ],
      notes: `تحویل امانی ۱۰ بسته به ${rt.storeName}`,
    });

    consignmentDeliveries.push({
      id: delivId,
      documentId: docId,
      documentNumber: docNum,
      agentId: ag.id,
      retailerId: rt.id,
      productId: mainProduct.id,
      quantityDelivered: 10,
      quantitySold: rtDef.sold,
      quantityReturned: 0,
      quantityDamaged: 0,
      unitSettlementPriceSnapshot: mainProduct.baseRetailerPrice,
      retailerMarkupSnapshot: mainProduct.retailerMarkupPercent,
      suggestedRetailPriceSnapshot: mainProduct.suggestedRetailPrice,
      deliveryMode: 'consignment',
      status: 'verified',
      deliveredAt: '2026-10-05T10:00:00.000Z',
      verifiedAt: '2026-10-05T14:00:00.000Z',
    });

    inventoryTransactions.push({
      id: `inv-tx-a2r-${idx + 1}`,
      productId: mainProduct.id,
      movementType: 'agent_to_retailer',
      fromLocationType: 'agent',
      fromLocationId: ag.id,
      toLocationType: 'retailer',
      toLocationId: rt.id,
      quantity: 10,
      unitPriceSnapshot: mainProduct.baseRetailerPrice,
      referenceDocumentId: docId,
      createdAt: '2026-10-05T14:00:00.000Z',
      createdBy: ag.fullName,
      notes: `تحویل امانی ۱۰ بسته به فروشگاه ${rt.storeName} (${docNum})`,
    });

    // 4. Retailer Sales Reports (70 packages total across 12 retailers)
    const reportId = `sr-${idx + 1}`;
    const reportNum = `SR-1405-${String(idx + 1).padStart(5, '0')}`;
    const receivableAmount = rtDef.sold * mainProduct.baseRetailerPrice;
    const closingStock = 10 - rtDef.sold;

    salesReports.push({
      id: reportId,
      reportNumber: reportNum,
      retailerId: rt.id,
      agentId: ag.id,
      productId: mainProduct.id,
      periodStart: '2026-10-05T00:00:00.000Z',
      periodEnd: '2026-10-20T23:59:59.000Z',
      openingStock: 0,
      receivedQuantity: 10,
      returnedQuantity: 0,
      reportedSoldQuantity: rtDef.sold,
      damagedQuantity: 0,
      calculatedClosingStock: closingStock,
      physicalCountedStock: closingStock,
      hasDiscrepancy: false,
      unitSettlementPriceSnapshot: mainProduct.baseRetailerPrice,
      receivableGenerated: receivableAmount,
      status: 'verified_by_admin',
      idempotencyKey: `seed-sr-${rt.id}-p1`,
      createdAt: '2026-10-21T10:00:00.000Z',
      verifiedAt: '2026-10-21T12:00:00.000Z',
      notes: `گزارش فروش دوره‌ای تاییدشده — فروش ${rtDef.sold} بسته و باقیمانده ${closingStock} بسته`,
    });

    inventoryTransactions.push({
      id: `inv-tx-rsale-${idx + 1}`,
      productId: mainProduct.id,
      movementType: 'retailer_sale',
      fromLocationType: 'retailer',
      fromLocationId: rt.id,
      toLocationType: 'customer',
      toLocationId: 'b2b-end-consumers',
      quantity: rtDef.sold,
      unitPriceSnapshot: mainProduct.baseRetailerPrice,
      referenceDocumentId: reportId,
      createdAt: '2026-10-21T12:00:00.000Z',
      createdBy: rt.ownerName,
      notes: `فروش قطعی گزارش‌شده توسط ${rt.storeName} (${reportNum})`,
    });

    const invId = `inv-${idx + 1}`;
    const invNum = `INV-1405-${String(idx + 1).padStart(5, '0')}`;
    const remaining = receivableAmount - rtDef.paidVerified;

    invoices.push({
      id: invId,
      invoiceNumber: invNum,
      retailerId: rt.id,
      agentId: ag.id,
      sourceReportId: reportId,
      sourceDeliveryId: delivId,
      productId: mainProduct.id,
      quantity: rtDef.sold,
      unitPriceSnapshot: mainProduct.baseRetailerPrice,
      totalAmount: receivableAmount,
      paidAmount: rtDef.paidVerified,
      remainingAmount: remaining,
      dueDate: rtDef.overdue ? '2026-10-22T00:00:00.000Z' : '2026-11-05T00:00:00.000Z',
      isOverdue: rtDef.overdue,
      status: remaining === 0 ? 'paid' : rtDef.paidVerified > 0 ? 'partially_paid' : 'open',
      createdAt: '2026-10-21T12:00:00.000Z',
    });

    journalEntries.push({
      id: `je-sale-${idx + 1}`,
      entryNumber: `JE-1405-01${String(idx + 1).padStart(2, '0')}`,
      entryDate: '2026-10-21T12:00:00.000Z',
      description: `ایجاد مطالبات فروش امانی ${rt.storeName} (${rtDef.sold} بسته)`,
      referenceType: 'sale_report',
      referenceId: reportId,
      debitAccount: `حساب‌های دریافتنی فروشگاهی — ${rt.storeName}`,
      creditAccount: 'درآمد فروش امانی B2B',
      amount: receivableAmount,
    });

    // 5. Verified Payments & Commission Generation
    if (rtDef.paidVerified > 0) {
      const payId = `pay-ver-${idx + 1}`;
      const payNum = `PAY-1405-${String(idx + 1).padStart(5, '0')}`;
      const allocId = `alloc-${idx + 1}`;

      payments.push({
        id: payId,
        paymentNumber: payNum,
        retailerId: rt.id,
        collectingAgentId: ag.id,
        salesAttributionAgentId: ag.id,
        paymentDate: '2026-10-24T11:30:00.000Z',
        amount: rtDef.paidVerified,
        method: idx % 2 === 0 ? 'bank_transfer' : 'pos',
        bankName: 'بانک ملت',
        referenceNumber: `TRX-998877${idx + 10}`,
        collectedByAgentDirectly: false,
        status: 'verified',
        allocations: [
          {
            id: allocId,
            paymentId: payId,
            invoiceId: invId,
            retailerId: rt.id,
            agentId: ag.id,
            allocatedAmount: rtDef.paidVerified,
            createdAt: '2026-10-24T14:00:00.000Z',
          },
        ],
        idempotencyKey: `seed-pay-ver-${rt.id}`,
        notes: remaining === 0 ? 'تسویه کامل فاکتور فروش امانی' : 'پرداخت علی‌الحساب تاییدشده',
      });

      journalEntries.push({
        id: `je-pay-${idx + 1}`,
        entryNumber: `JE-1405-02${String(idx + 1).padStart(2, '0')}`,
        entryDate: '2026-10-24T14:00:00.000Z',
        description: `وصول و تایید واریزی ${rt.storeName} (${payNum})`,
        referenceType: 'payment',
        referenceId: payId,
        debitAccount: 'موجودی بانک مدیریت (تاییدشده)',
        creditAccount: `حساب‌های دریافتنی فروشگاهی — ${rt.storeName}`,
        amount: rtDef.paidVerified,
      });

      const commAmount = Math.round((rtDef.paidVerified * ag.commissionRatePercent) / 100);
      const isPaidOut = idx < 3; // First 3 commissions already paid out to demonstrate both Paid and Approved/Unpaid states
      const commId = `comm-${idx + 1}`;
      commissions.push({
        id: commId,
        commissionNumber: `COM-1405-${String(idx + 1).padStart(5, '0')}`,
        agentId: ag.id,
        sourcePaymentId: payId,
        sourceAllocationId: allocId,
        retailerId: rt.id,
        productId: mainProduct.id,
        baseBasisAmount: rtDef.paidVerified,
        ruleNameSnapshot: `قانون پورسانت وصول مطالبات (${ag.commissionRatePercent}٪)`,
        ratePercentSnapshot: ag.commissionRatePercent,
        commissionAmount: commAmount,
        paidAmount: isPaidOut ? commAmount : 0,
        remainingPayable: isPaidOut ? 0 : commAmount,
        status: isPaidOut ? 'paid' : idx < 6 ? 'approved' : 'earned',
        createdAt: '2026-10-24T14:05:00.000Z',
        approvedAt: idx < 6 ? '2026-10-25T09:00:00.000Z' : undefined,
        notes: `پورسانت ${ag.commissionRatePercent}٪ بابت وصول وجه تاییدشده از ${rt.storeName}`,
      });
    }

    // Pending payment submissions (awaiting admin verification - do NOT reduce confirmed receivables yet)
    if (rtDef.pendingPay > 0) {
      const pendingPayId = `pay-pend-${idx + 1}`;
      payments.push({
        id: pendingPayId,
        paymentNumber: `PAY-1405-P00${idx + 1}`,
        retailerId: rt.id,
        collectingAgentId: ag.id,
        salesAttributionAgentId: ag.id,
        paymentDate: '2026-10-29T16:20:00.000Z',
        amount: rtDef.pendingPay,
        method: 'bank_transfer',
        bankName: 'بانک سامان',
        referenceNumber: `PEND-7744${idx}`,
        collectedByAgentDirectly: false,
        status: 'pending',
        allocations: [],
        idempotencyKey: `seed-pay-pend-${rt.id}`,
        notes: 'فیش واریزی ثبت‌شده توسط فروشگاه — در انتظار بررسی و تأیید مدیریت',
      });
    }
  });

  // 6. Direct Consumer B2C Orders totaling exactly 20 packages
  const b2cPackageQuantities = [3, 4, 2, 3, 2, 3, 3]; // Sum = 20 packages
  const b2cOrders: B2cOrder[] = b2cPackageQuantities.map((qty, idx) => {
    const cust = customers[idx];
    const ordId = `ord-${idx + 1}`;
    const ordNum = `ORD-1405-${String(idx + 1).padStart(5, '0')}`;
    const subtotal = qty * mainProduct.directB2cPrice;
    const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.defaultShippingFee;
    const totalPayable = subtotal + shipping;

    inventoryTransactions.push({
      id: `inv-tx-b2c-${idx + 1}`,
      productId: mainProduct.id,
      movementType: 'b2c_fulfillment',
      fromLocationType: 'warehouse',
      fromLocationId: 'main-warehouse',
      toLocationType: 'customer',
      toLocationId: cust.id,
      quantity: qty,
      unitPriceSnapshot: mainProduct.directB2cPrice,
      referenceDocumentId: ordId,
      createdAt: `2026-10-${12 + idx}T15:00:00.000Z`,
      createdBy: 'سیستم فروش آنلاین B2C',
      notes: `ارسال سفارش مستقیم مشتری ${cust.fullName} (${ordNum})`,
    });

    journalEntries.push({
      id: `je-b2c-${idx + 1}`,
      entryNumber: `JE-1405-03${String(idx + 1).padStart(2, '0')}`,
      entryDate: `2026-10-${12 + idx}T15:00:00.000Z`,
      description: `فروش مستقیم آنلاین B2C به ${cust.fullName} (${qty} بسته)`,
      referenceType: 'b2c_order',
      referenceId: ordId,
      debitAccount: 'موجودی بانک مدیریت (تاییدشده)',
      creditAccount: 'درآمد فروش مستقیم B2C',
      amount: totalPayable,
    });

    return {
      id: ordId,
      orderNumber: ordNum,
      customerId: cust.id,
      customerName: cust.fullName,
      customerMobile: cust.mobile,
      province: cust.province,
      city: cust.city,
      deliveryAddress: cust.address,
      postalCode: cust.postalCode,
      deliveryInstructions: 'تحویل به نگهبانی ساختمان در ساعات اداری',
      productId: mainProduct.id,
      productNameSnapshot: mainProduct.name,
      quantity: qty,
      unitPriceSnapshot: mainProduct.directB2cPrice,
      discountAmount: 0,
      shippingFee: shipping,
      totalPayable,
      orderStatus: idx < 5 ? 'delivered' : idx === 5 ? 'shipped' : 'preparing',
      paymentStatus: 'paid',
      simulatedPaymentRef: `SIM-PAY-8800${idx + 1}`,
      packingOperator: 'مهدی اکبری (واحد بسته‌بندی)',
      courierName: idx % 2 === 0 ? 'پست پیشتاز ویژه' : 'پیک اختصاصی تهران',
      trackingCode: `POST-14059900${idx + 1}`,
      dispatchedAt: idx < 6 ? `2026-10-${13 + idx}T09:00:00.000Z` : undefined,
      deliveredAt: idx < 5 ? `2026-10-${14 + idx}T17:00:00.000Z` : undefined,
      referralAgentId: cust.referralAgentId,
      sourceChannel: idx % 2 === 0 ? 'qr_packaging' : 'direct_web',
      idempotencyKey: `seed-b2c-ord-${idx + 1}`,
      createdAt: `2026-10-${12 + idx}T14:30:00.000Z`,
    };
  });

  // 7. Field Visits & Restocking Requests
  const visits: FieldVisitReport[] = [
    {
      id: 'vis-1',
      visitNumber: 'VIS-1405-00001',
      agentId: 'ag-1',
      retailerId: 'rt-1',
      visitDate: '2026-10-26T10:30:00.000Z',
      gpsCoordinates: '35.7921, 51.4182',
      observedStock: 2,
      retailerReportedSales: 8,
      outstandingBalanceSnapshot: 0,
      paymentFollowupStatus: 'تسویه کامل انجام شده است',
      restockingNeededCount: 15,
      competitorObservations: 'تقاضا برای بسته‌بندی ۶۰۰ گرمی شفاف در زعفرانیه بسیار بالا است.',
      outcome: 'restocking_requested',
      nextVisitDate: '2026-11-02T10:00:00.000Z',
      notes: 'موجودی قفسه رو به اتمام است و فروشگاه درخواست ۱۵ بسته جدید دارد.',
    },
    {
      id: 'vis-2',
      visitNumber: 'VIS-1405-00002',
      agentId: 'ag-3',
      retailerId: 'rt-6',
      visitDate: '2026-10-27T11:15:00.000Z',
      gpsCoordinates: '35.7351, 51.3910',
      observedStock: 2,
      retailerReportedSales: 8,
      outstandingBalanceSnapshot: 600000,
      paymentFollowupStatus: 'وعده واریز الباقی بدهی (۶۰۰,۰۰۰ تومان) تا پایان هفته',
      restockingNeededCount: 10,
      competitorObservations: 'محصول در قفسه اصلی کنار صندوق چیدمان شده است.',
      outcome: 'payment_followup_required',
      nextVisitDate: '2026-11-01T11:00:00.000Z',
      notes: 'پیگیری مانده سررسیدگذشته انجام شد.',
    },
    {
      id: 'vis-3',
      visitNumber: 'VIS-1405-00003',
      agentId: 'ag-4',
      retailerId: 'rt-7',
      visitDate: '2026-10-28T16:00:00.000Z',
      gpsCoordinates: '35.7412, 51.5234',
      observedStock: 2,
      retailerReportedSales: 8,
      outstandingBalanceSnapshot: 1000000,
      paymentFollowupStatus: 'نیازمند پیگیری فوری ۱,۰۰۰,۰۰۰ تومان مانده بدهی',
      restockingNeededCount: 10,
      competitorObservations: 'فروش بالا در آخر هفته‌ها.',
      outcome: 'payment_followup_required',
      nextVisitDate: '2026-10-31T10:00:00.000Z',
      notes: 'مسئول فروشگاه قول تسویه در بازدید بعدی را داد.',
    },
  ];

  const restockRequests: RestockRequest[] = [
    {
      id: 'req-1',
      requestNumber: 'REQ-1405-00001',
      retailerId: 'rt-1',
      requestedByRole: 'agent',
      agentId: 'ag-1',
      productId: mainProduct.id,
      currentEstimatedStock: 2,
      requestedQuantity: 15,
      approvedQuantity: 15,
      reason: 'فروش سریع ۸ بسته اول و درخواست مشتریان وفادار فروشگاه',
      urgency: 'high',
      preferredDeliveryDate: '2026-11-02T00:00:00.000Z',
      status: 'approved',
      createdAt: '2026-10-26T11:00:00.000Z',
      notes: 'تأییدشده توسط مدیر — آماده تحویل از موجودی بازاریاب یا انبار',
    },
    {
      id: 'req-2',
      requestNumber: 'REQ-1405-00002',
      retailerId: 'rt-3',
      requestedByRole: 'retailer',
      agentId: 'ag-2',
      productId: mainProduct.id,
      currentEstimatedStock: 2,
      requestedQuantity: 12,
      reason: 'نیاز به شارژ مجدد قفسه خشکبار پیش از آخر هفته',
      urgency: 'normal',
      preferredDeliveryDate: '2026-11-04T00:00:00.000Z',
      status: 'submitted',
      createdAt: '2026-10-29T09:30:00.000Z',
      notes: 'ثبت‌شده از پنل اختصاصی فروشگاه سعادت',
    },
  ];

  // Sample Agent Cash Collection & Remittance (Reconciled: Collected 500,000, Remitted 300,000, Held 200,000)
  const agentCashCollections: AgentCashCollection[] = [
    {
      id: 'acash-1',
      receiptNumber: 'PAY-1405-C001',
      agentId: 'ag-3',
      retailerId: 'rt-5',
      paymentId: 'pay-ver-5',
      amount: 500000,
      collectedAt: '2026-10-24T10:00:00.000Z',
      method: 'cash',
      holdingStatus: 'held_by_agent',
      notes: 'دریافت نقدی بخشی از تسویه در محل فروشگاه به همراه رسید امضاشده',
    },
  ];

  const agentRemittances: AgentRemittance[] = [
    {
      id: 'arem-1',
      remittanceNumber: 'REM-1405-0001',
      agentId: 'ag-3',
      previousCashHeld: 0,
      newlyCollectedAmount: 500000,
      remittedAmount: 300000,
      remainingCashHeld: 200000,
      remittanceDate: '2026-10-25T13:00:00.000Z',
      transferReference: 'BANK-REM-3321',
      status: 'verified',
      verifiedBy: 'صابر نصرعلوی',
      notes: 'تحویل ۳۰۰,۰۰۰ تومان به حساب مدیریت؛ ۲۰۰,۰۰۰ تومان نزد بازاریاب جهت تطبیق بعدی',
    },
  ];

  const expenses: OperatingExpense[] = [
    {
      id: 'exp-1',
      expenseNumber: 'EXP-1405-0001',
      category: 'packaging',
      title: 'خرید ظروف پلاستیکی شفاف کریستالی و لیبل QR ضدآب',
      amount: 1850000,
      expenseDate: '2026-10-02T10:00:00.000Z',
      paidFromAccount: 'حساب جاری بانک ملت',
      referenceNumber: 'INV-PKG-401',
      recordedBy: 'صابر نصرعلوی',
      notes: 'بسته‌بندی بهداشتی ۶۰۰ گرمی با چاپ اختصاصی خرمای صابر',
    },
    {
      id: 'exp-2',
      expenseNumber: 'EXP-1405-0002',
      category: 'transport',
      title: 'حمل یخچالی بار خرمای پیارم از حاجی‌آباد به انبار تهران',
      amount: 2400000,
      expenseDate: '2026-10-01T07:30:00.000Z',
      paidFromAccount: 'حساب جاری بانک ملت',
      referenceNumber: 'BAR-9012',
      recordedBy: 'صابر نصرعلوی',
      notes: 'بارنامه رسمی حمل جاده‌ای',
    },
  ];

  const qrLogs: QrReferralLog[] = [
    {
      id: 'qr-prod-piarom',
      code: '/p/piarom-600',
      type: 'product_packaging_qr',
      productId: mainProduct.id,
      campaignId: 'PKG-QR-1405',
      scansCount: 148,
      pageViewsCount: 215,
      retailerRegistrationsCount: 2,
      b2cOrdersCount: 4,
      lastScannedAt: '2026-10-30T09:15:00.000Z',
    },
    ...agents.map((ag, idx) => ({
      id: `qr-ref-${ag.id}`,
      code: `/ref/${ag.code}`,
      type: 'agent_referral_link' as const,
      referralAgentId: ag.id,
      campaignId: `FIELD-REF-${ag.code}`,
      scansCount: 24 + idx * 5,
      pageViewsCount: 38 + idx * 7,
      retailerRegistrationsCount: 2,
      b2cOrdersCount: idx === 0 ? 2 : 0,
      lastScannedAt: '2026-10-29T18:00:00.000Z',
    })),
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-1',
      targetRole: 'admin',
      title: '۲ واریزی جدید فروشگاه در انتظار تأیید',
      message: 'فروشگاه‌های پونک مال (۴۰۰,۰۰۰ تومان) و شاهین شمالی (۵۰۰,۰۰۰ تومان) فیش واریزی ثبت کرده‌اند.',
      category: 'payment',
      isRead: false,
      createdAt: '2026-10-29T16:25:00.000Z',
    },
    {
      id: 'notif-2',
      targetRole: 'admin',
      title: '۴ فروشگاه دارای مطالبات سررسیدگذشته',
      message: 'مجموع مطالبات سررسیدگذشته از فروشگاه‌ها نیازمند پیگیری بازاریابان است.',
      category: 'payment',
      isRead: false,
      createdAt: '2026-10-28T09:00:00.000Z',
    },
    {
      id: 'notif-3',
      targetRole: 'agent',
      targetEntityId: 'ag-3',
      title: 'تأیید پورسانت وصول مطالبات',
      message: 'پورسانت شما بابت وصول مطالبات مارکت ارگانیک یوسف‌آباد محاسبه و تأیید شد.',
      category: 'commission',
      isRead: false,
      createdAt: '2026-10-25T09:05:00.000Z',
    },
    {
      id: 'notif-4',
      targetRole: 'retailer',
      targetEntityId: 'rt-1',
      title: 'تأیید درخواست تأمین مجدد ۱۵ بسته خرمای پیارم',
      message: 'درخواست تأمین مجدد شما توسط مدیریت تأیید شد و در نوبت تحویل بازاریاب قرار گرفت.',
      category: 'delivery',
      isRead: false,
      createdAt: '2026-10-26T12:00:00.000Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-1',
      actorRole: 'admin',
      actorName: 'صابر نصرعلوی',
      action: 'INITIAL_STOCK_ENTRY',
      entityType: 'Product',
      entityId: mainProduct.id,
      details: 'ثبت ۲۰۰ بسته اولیه خرمای پیارم ۶۰۰ گرمی در انبار مرکزی',
      timestamp: '2026-10-01T09:00:00.000Z',
    },
    {
      id: 'aud-2',
      actorRole: 'admin',
      actorName: 'صابر نصرعلوی',
      action: 'VERIFY_AGENT_DELIVERIES',
      entityType: 'OfficialDocument',
      entityId: 'AG-1405-00001..00006',
      details: 'تأیید اسناد امضاشده تحویل ۱۵۰ بسته (۶ بازاریاب × ۲۵ بسته)',
      timestamp: '2026-10-03T11:00:00.000Z',
    },
    {
      id: 'aud-3',
      actorRole: 'admin',
      actorName: 'صابر نصرعلوی',
      action: 'VERIFY_RETAILER_DELIVERIES',
      entityType: 'OfficialDocument',
      entityId: 'RT-1405-00001..00012',
      details: 'تأیید اسناد امضاشده تحویل امانی ۱۲۰ بسته به ۱۲ سوپرمارکت',
      timestamp: '2026-10-05T14:00:00.000Z',
    },
  ];

  return {
    version: 1,
    settings,
    products: [mainProduct],
    priceHistory: [
      {
        id: 'ph-1',
        productId: mainProduct.id,
        costPrice: mainProduct.costPrice,
        baseRetailerPrice: mainProduct.baseRetailerPrice,
        retailerMarkupPercent: mainProduct.retailerMarkupPercent,
        suggestedRetailPrice: mainProduct.suggestedRetailPrice,
        directB2cPrice: mainProduct.directB2cPrice,
        effectiveDate: '2026-10-01T08:00:00.000Z',
        createdBy: 'صابر نصرعلوی',
      },
    ],
    commissionRules,
    agents,
    retailers,
    customers,
    inventoryTransactions,
    documents,
    consignmentDeliveries,
    salesReports,
    invoices,
    payments,
    agentCashCollections,
    agentRemittances,
    commissions,
    commissionPayments: [
      {
        id: 'cpay-1',
        paymentNumber: 'CP-1405-0001',
        commissionRecordId: 'comm-1',
        agentId: 'ag-1',
        amountPaid: 96000,
        paymentDate: '2026-10-26T10:00:00.000Z',
        referenceNumber: 'SHABA-11001',
        paidBy: 'صابر نصرعلوی',
        notes: 'پرداخت کامل پورسانت امیرحسین رضایی بابت فروشگاه زعفرانیه',
      },
      {
        id: 'cpay-2',
        paymentNumber: 'CP-1405-0002',
        commissionRecordId: 'comm-2',
        agentId: 'ag-1',
        amountPaid: 96000,
        paymentDate: '2026-10-26T10:05:00.000Z',
        referenceNumber: 'SHABA-11002',
        paidBy: 'صابر نصرعلوی',
        notes: 'پرداخت کامل پورسانت امیرحسین رضایی بابت سوپرمارکت ونک',
      },
      {
        id: 'cpay-3',
        paymentNumber: 'CP-1405-0003',
        commissionRecordId: 'comm-3',
        agentId: 'ag-2',
        amountPaid: 112000,
        paymentDate: '2026-10-26T10:10:00.000Z',
        referenceNumber: 'SHABA-11003',
        paidBy: 'صابر نصرعلوی',
        notes: 'پرداخت کامل پورسانت محمدمهدی کریمی بابت فروشگاه سعادت',
      },
    ],
    visits,
    restockRequests,
    discrepancies: [],
    inventoryCounts: [],
    b2cOrders,
    refunds: [],
    expenses,
    journalEntries,
    notifications,
    qrLogs,
    auditLogs,
    cashBankTransactions: [],
    financialAdjustments: [],
  };
}
