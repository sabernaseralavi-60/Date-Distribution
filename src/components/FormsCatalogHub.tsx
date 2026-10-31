import React, { useState } from 'react';
import {
  SaberCommerceState,
  OfficialDocument,
  CustodyPolicyMode,
  VisitOutcome,
  B2cOrderStatus,
} from '../core/types';
import {
  computeInventorySummary,
  computeFinancialSummary,
  calculateSuggestedRetailPrice,
  createProduct,
  updateProductPricing,
  createSalesAgent,
  createRetailer,
  recordSupplierStockReceipt,
  createWarehouseToAgentDeliveryDraft,
  createAgentToRetailerDeliveryDraft,
  recordAgentReturnToWarehouse,
  recordRetailerReturn,
  submitAndVerifyRetailerSalesReport,
  submitRetailerPayment,
  verifyRetailerPayment,
  submitAndVerifyAgentRemittance,
  payAgentCommission,
  recordFieldVisit,
  createB2cOrderWithSimulatedPayment,
  updateB2cOrderFulfillment,
  updateBusinessSettings,
} from '../core/engine';
import { formatNumberFa, formatToman, toPersianDigits } from '../core/formatters';
import { CheckCircle2, FileText, Printer, Search } from 'lucide-react';

export interface FormCatalogMeta {
  id: number;
  titleFa: string;
  titleEn: string;
  category:
    | 'products_pricing'
    | 'agents_retailers'
    | 'warehouse_custody_docs'
    | 'sales_payments_commissions'
    | 'b2c_orders_shipping'
    | 'finance_system_admin';
  description: string;
}

export const ALL_45_FORMS: FormCatalogMeta[] = [
  { id: 1, titleFa: 'ثبت محصول جدید', titleEn: 'Product registration', category: 'products_pricing', description: 'تعریف محصول جدید با SKU یکتا، وزن خالص، بسته‌بندی و قیمت‌های پایه' },
  { id: 2, titleFa: 'ویرایش مشخصات محصول', titleEn: 'Product editing', category: 'products_pricing', description: 'ویرایش اطلاعات توصیفی و وضعیت فعال/غیرفعال محصول بدون تغییر اسناد قبلی' },
  { id: 3, titleFa: 'مدیریت پویا و تاریخچه قیمت محصول', titleEn: 'Product pricing', category: 'products_pricing', description: 'تنظیم قیمت تمام‌شده، پایه تسویه سوپرمارکت، درصد سود فروشگاه و قیمت مستقیم B2C' },
  { id: 4, titleFa: 'ثبت بازاریاب جدید', titleEn: 'Agent registration', category: 'agents_retailers', description: 'ایجاد حساب بازاریاب، کد خودکار، نرخ پورسانت و تخصیص فروشگاه‌ها' },
  { id: 5, titleFa: 'ویرایش و تغییر وضعیت بازاریاب', titleEn: 'Agent editing', category: 'agents_retailers', description: 'فعال/غیرفعال‌سازی و بروزرسانی اطلاعات بازاریاب (عدم حذف بازاریاب دارای سابقه)' },
  { id: 6, titleFa: 'ثبت سوپرمارکت جدید', titleEn: 'Retailer registration', category: 'agents_retailers', description: 'ثبت فروشگاه، مالک، نشانی، بازاریاب معرف و رژیم تسویه امانی/نسیه' },
  { id: 7, titleFa: 'ویرایش پروفایل و سقف اعتبار فروشگاه', titleEn: 'Retailer editing', category: 'agents_retailers', description: 'بروزرسانی بازه تسویه، سقف اعتبار و وضعیت فعالیت فروشگاه' },
  { id: 8, titleFa: 'تخصیص و جابجایی فروشگاه بین بازاریابان', titleEn: 'Retailer-agent assignment', category: 'agents_retailers', description: 'انتساب سوپرمارکت به بازاریاب مسئول با حفظ بازاریاب جذب اولیه' },
  { id: 9, titleFa: 'ثبت موجودی اولیه انبار', titleEn: 'Initial inventory entry', category: 'warehouse_custody_docs', description: 'ثبت موجودی آغازین کالا در انبار مرکزی با سند حسابداری' },
  { id: 10, titleFa: 'رسید ورود کالا از تأمین‌کننده / نخلستان', titleEn: 'Supplier stock receipt', category: 'warehouse_custody_docs', description: 'افزایش موجودی انبار مرکزی از محل تأمین جدید' },
  { id: 11, titleFa: 'رسید تحویل کالا و تعهد نگهداری بازاریاب (فرم ۱)', titleEn: 'Warehouse-to-agent delivery', category: 'warehouse_custody_docs', description: 'صدور سند رسمی AG-1405 چاپی جهت تحویل کالا از انبار به بازاریاب' },
  { id: 12, titleFa: 'تأییدیه دریافت و بارگذاری رسید امضاشده بازاریاب', titleEn: 'Agent delivery acknowledgment', category: 'warehouse_custody_docs', description: 'بارگذاری تصویر امضاشده رسید بازاریاب و تأیید نهایی انتقال' },
  { id: 13, titleFa: 'رسید تحویل امانی محصول به فروشگاه (فرم ۲)', titleEn: 'Agent-to-retailer delivery', category: 'warehouse_custody_docs', description: 'صدور سند رسمی RT-1405 جهت تحویل کالا از بازاریاب به سوپرمارکت' },
  { id: 14, titleFa: 'بارگذاری رسید ممهور و امضاشده فروشگاه', titleEn: 'Retailer signed receipt', category: 'warehouse_custody_docs', description: 'پیوست تصویر مهر و امضای فروشگاه و انتقال موجودی به حساب امانی فروشگاه' },
  { id: 15, titleFa: 'رسید برگشت کالای بازاریاب به انبار (فرم ۳)', titleEn: 'Agent return to warehouse', category: 'warehouse_custody_docs', description: 'کاهش موجودی نزد بازاریاب و بازگشت به انبار مرکزی (سند AR-1405)' },
  { id: 16, titleFa: 'رسید مرجوعی کالا از فروشگاه (فرم ۴)', titleEn: 'Retailer return', category: 'warehouse_custody_docs', description: 'برگشت کالای فروش‌نرفته از سوپرمارکت به بازاریاب یا انبار مرکزی (سند RR-1405)' },
  { id: 17, titleFa: 'گزارش فروش و موجودی فروشگاه (فرم ۵)', titleEn: 'Retailer sales report', category: 'sales_payments_commissions', description: 'ثبت تعداد فروخته‌شده، کنترل فرمول موجودی پایانی و ایجاد مطالبات امانی' },
  { id: 18, titleFa: 'فرم شمارش موجودی قفسه فروشگاه', titleEn: 'Retailer stock count', category: 'sales_payments_commissions', description: 'ثبت موجودی فیزیکی شمارش‌شده در فروشگاه و تطبیق با موجودی سیستمی' },
  { id: 19, titleFa: 'گزارش بازدید بازاریاب از فروشگاه (فرم ۱۰)', titleEn: 'Field visit report', category: 'sales_payments_commissions', description: 'ثبت مشاهدات میدانی، موجودی قفسه، پیگیری بدهی و تاریخ بازدید بعدی' },
  { id: 20, titleFa: 'درخواست تأمین مجدد کالا (فرم ۹)', titleEn: 'Retailer restocking request', category: 'sales_payments_commissions', description: 'ثبت درخواست شارژ مجدد خرما توسط فروشگاه یا بازاریاب' },
  { id: 21, titleFa: 'ثبت واریزی فروشگاه (فرم ۶)', titleEn: 'Retailer payment submission', category: 'sales_payments_commissions', description: 'ثبت فیش بانکی، کارتخوان یا پرداخت نقدی توسط فروشگاه' },
  { id: 22, titleFa: 'بررسی، تأیید و تخصیص واریزی فروشگاه (FIFO)', titleEn: 'Payment verification', category: 'sales_payments_commissions', description: 'تأیید مدیریت، کسر از بدهی فاکتورها و محاسبه خودکار پورسانت بازاریاب' },
  { id: 23, titleFa: 'رسید دریافت وجه توسط بازاریاب (فرم ۷)', titleEn: 'Field payment collection', category: 'sales_payments_commissions', description: 'ثبت دریافت وجه نقد در محل فروشگاه و صدور رسید PAY-1405-C' },
  { id: 24, titleFa: 'فرم تحویل وجوه وصول‌شده به مدیریت (فرم ۸)', titleEn: 'Agent remittance', category: 'sales_payments_commissions', description: 'تسویه وجه نقد نزد بازاریاب با حساب بانکی مدیریت و تطبیق مانده نقد' },
  { id: 25, titleFa: 'تعریف قوانین پورسانت بازاریاب (فرم ۱۳)', titleEn: 'Agent commission policy', category: 'sales_payments_commissions', description: 'پیکربندی درصد یا مبلغ ثابت پورسانت به تفکیک بازاریاب و کانال' },
  { id: 26, titleFa: 'تأیید محاسبات پورسانت بازاریابان (فرم ۱۴ الف)', titleEn: 'Commission approval', category: 'sales_payments_commissions', description: 'بررسی و تأیید پورسانت‌های کسب‌شده از محل وصول مطالبات' },
  { id: 27, titleFa: 'ثبت پرداخت پورسانت بازاریاب (فرم ۱۴ ب)', titleEn: 'Commission payment', category: 'sales_payments_commissions', description: 'پرداخت کامل یا علی‌الحساب پورسانت و کاهش مانده قابل پرداخت' },
  { id: 28, titleFa: 'گزارش کسری و مغایرت موجودی (فرم ۱۱ الف)', titleEn: 'Inventory discrepancy', category: 'warehouse_custody_docs', description: 'ثبت و تعیین تکلیف اختلاف بین موجودی مورد انتظار و شمارش‌شده' },
  { id: 29, titleFa: 'گزارش آسیب یا ضایعات بسته کالا (فرم ۱۱ ب)', titleEn: 'Damage/loss report', category: 'warehouse_custody_docs', description: 'انتقال بسته‌های آسیب‌دیده به قرنطینه با تصمیم مدیریت' },
  { id: 30, titleFa: 'فرم شمارش موجودی و تعدیل مجاز انبار (فرم ۱۲)', titleEn: 'Stock adjustment', category: 'warehouse_custody_docs', description: 'انبارگردانی رسمی و ثبت سند تعدیل موجودی با تایید مدیر' },
  { id: 31, titleFa: 'ثبت مشتری مستقیم (B2C)', titleEn: 'Customer registration', category: 'b2c_orders_shipping', description: 'ثبت مشخصات خریدار مستقیم و نشانی پستی' },
  { id: 32, titleFa: 'ثبت سفارش و پرداخت مستقیم آنلاین (B2C Checkout)', titleEn: 'B2C checkout', category: 'b2c_orders_shipping', description: 'ثبت سفارش مستقیم به همراه درگاه پرداخت آزمایشی و رزرو موجودی' },
  { id: 33, titleFa: 'فرم آماده‌سازی و بسته‌بندی سفارش مشتری (فرم ۱۵ الف)', titleEn: 'Order fulfillment', category: 'b2c_orders_shipping', description: 'تخصیص مسئول بسته‌بندی و آماده‌سازی سفارش برای ارسال' },
  { id: 34, titleFa: 'ثبت مرسوله پستی و کد رهگیری مشتری (فرم ۱۵ ب)', titleEn: 'Shipment registration', category: 'b2c_orders_shipping', description: 'ثبت شرکت حامل (پست/پیک) و کد رهگیری مرسوله' },
  { id: 35, titleFa: 'فرم لغو سفارش مشتری (فرم ۱۶ الف)', titleEn: 'Order cancellation', category: 'b2c_orders_shipping', description: 'لغو سفارش پیش از تحویل و بررسی بازگشت کالا به انبار' },
  { id: 36, titleFa: 'فرم استرداد وجه به مشتری (فرم ۱۶ ب)', titleEn: 'Refund request', category: 'b2c_orders_shipping', description: 'ثبت سند برگشت وجه و اصلاح حساب درآمد فروش مستقیم' },
  { id: 37, titleFa: 'ثبت هزینه‌های عملیاتی کسب‌وکار', titleEn: 'Expense registration', category: 'finance_system_admin', description: 'ثبت هزینه بسته‌بندی، حمل‌ونقل، انبارداری و بازاریابی' },
  { id: 38, titleFa: 'ثبت تراکنش خزانه و بانک', titleEn: 'Cash/bank transaction', category: 'finance_system_admin', description: 'ثبت واریز و برداشت مستقیم در دفتر کل مالی' },
  { id: 39, titleFa: 'ثبت سند اصلاحی و تعدیل مالی', titleEn: 'Financial adjustment', category: 'finance_system_admin', description: 'ثبت یادداشت بستانکاری یا تعدیل مجاز حساب فروشگاه/بازاریاب' },
  { id: 40, titleFa: 'مرکز بررسی و تأیید نهایی اسناد امضاشده', titleEn: 'Document review and approval', category: 'warehouse_custody_docs', description: 'بررسی اصالت تصویر اسناد بارگذاری‌شده و تأیید یا رد با ذکر علت' },
  { id: 41, titleFa: 'مدیریت حساب‌های کاربری سامانه', titleEn: 'User account management', category: 'finance_system_admin', description: 'مدیریت کاربران، وضعیت دسترسی و بازنشانی رمز عبور' },
  { id: 42, titleFa: 'مدیریت نقش‌ها و سطوح دسترسی (RBAC)', titleEn: 'Role and permission management', category: 'finance_system_admin', description: 'کنترل مجوزهای مدیر، بازاریاب، فروشگاه و مشتری' },
  { id: 43, titleFa: 'مدیریت اعلان‌ها و هشدارهای سامانه', titleEn: 'Notification management', category: 'finance_system_admin', description: 'ارسال اعلان به بازاریابان و فروشگاه‌ها (یادآوری تسویه و موجودی)' },
  { id: 44, titleFa: 'تنظیمات مرکزی کسب‌وکار و متون قراردادها', titleEn: 'Business settings', category: 'finance_system_admin', description: 'پیکربندی نام تجاری، لوگو، سیاست‌های پیش‌فرض و متن تعهدنامه‌ها' },
  { id: 45, titleFa: 'فیلتر و استخراج گزارش‌های اکسل و چاپی', titleEn: 'Report filters and export', category: 'finance_system_admin', description: 'تولید ۲۰ گزارش استاندارد مدیریتی با خروجی CSV و چاپ A4' },
];

interface FormsCatalogHubProps {
  state: SaberCommerceState;
  initialSelectedFormId?: number;
  onUpdateState: (nextState: SaberCommerceState) => void;
  onOpenDocument: (doc: OfficialDocument) => void;
}

export const FormsCatalogHub: React.FC<FormsCatalogHubProps> = ({
  state,
  initialSelectedFormId = 1,
  onUpdateState,
  onOpenDocument,
}) => {
  const [selectedFormId, setSelectedFormId] = useState<number>(initialSelectedFormId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Form states for key interactive workflows
  // Form 1 & 2: Product
  const [prodName, setProdName] = useState('خرمای مضافتی بم ممتاز');
  const [prodSku, setProdSku] = useState('MZF-800');
  const [prodBrand, setProdBrand] = useState(state.settings.businessName);
  const [prodCategory, setProdCategory] = useState('خرمای تر و نیمه‌تر صادراتی');
  const [prodPackaging, setProdPackaging] = useState('بسته شفاف کریستالی بهداشتی');
  const [prodWeight, setProdWeight] = useState(800);
  const [prodCost, setProdCost] = useState(115000);
  const [prodBasePrice, setProdBasePrice] = useState(150000);
  const [prodMarkup, setProdMarkup] = useState(15);
  const [prodB2cPrice, setProdB2cPrice] = useState(185000);
  const [prodMinAlert, setProdMinAlert] = useState(20);
  const [prodBarcode, setProdBarcode] = useState('6260458900802');
  const [prodInitStock, setProdInitStock] = useState(0);

  // Form 3: Dynamic Pricing
  const [pricingProductId, setPricingProductId] = useState(state.products[0]?.id ?? '');
  const [editCostPrice, setEditCostPrice] = useState(state.products[0]?.costPrice ?? 155000);
  const [editBasePrice, setEditBasePrice] = useState(state.products[0]?.baseRetailerPrice ?? 200000);
  const [editMarkup, setEditMarkup] = useState(state.products[0]?.retailerMarkupPercent ?? 15);
  const [editB2cPrice, setEditB2cPrice] = useState(state.products[0]?.directB2cPrice ?? 240000);

  // Form 4: Agent Registration
  const [agentName, setAgentName] = useState('');
  const [agentMobile, setAgentMobile] = useState('09128887766');
  const [agentNationalId, setAgentNationalId] = useState('0019876543');
  const [agentAddress, setAgentAddress] = useState('تهران، خیابان شریعتی، بالاتر از میرداماد');
  const [agentRate, setAgentRate] = useState(6);
  const [agentCustodyMode, setAgentCustodyMode] = useState<CustodyPolicyMode>('consignment');

  // Form 6: Retailer Registration
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [storeMobile, setStoreMobile] = useState('09124445566');
  const [storeAddress, setStoreAddress] = useState('تهران، بلوار فردوس شرق، پلاک ۱۱۰');
  const [storeDistrict, setStoreDistrict] = useState('فردوس شرق');
  const [storeAgentId, setStoreAgentId] = useState(state.agents[0]?.id ?? 'ag-1');
  const [storeMode, setStoreMode] = useState<CustodyPolicyMode>('consignment');

  // Form 9 & 10: Supplier Receipt
  const [supProductId, setSupProductId] = useState(state.products[0]?.id ?? '');
  const [supQty, setSupQty] = useState(25);
  const [supName, setSupName] = useState('نخلستان نمونه حاجی‌آباد هرمزگان');

  // Form 11..16: Deliveries & Returns
  const [delivAgentId, setDelivAgentId] = useState(state.agents[0]?.id ?? 'ag-1');
  const [delivRetailerId, setDelivRetailerId] = useState(state.retailers[0]?.id ?? 'rt-1');
  const [delivProductId, setDelivProductId] = useState(state.products[0]?.id ?? '');
  const [delivQty, setDelivQty] = useState(5);
  const [delivMode, setDelivMode] = useState<CustodyPolicyMode>('consignment');
  const [returnReason, setReturnReason] = useState('تعدیل موجودی پایان دوره');

  // Form 17..24: Sales Report, Payment, Visit, Remittance
  const [srRetailerId, setSrRetailerId] = useState('rt-11');
  const [srSoldQty, setSrSoldQty] = useState(2);
  const [payRetailerId, setPayRetailerId] = useState('rt-6');
  const [payAmount, setPayAmount] = useState(300000);
  const [payRef, setPayRef] = useState('TRX-1405-8891');
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'pos' | 'cash_to_agent'>('bank_transfer');
  const [remAgentId, setRemAgentId] = useState('ag-3');
  const [remAmount, setRemAmount] = useState(100000);
  const [visAgentId, setVisAgentId] = useState('ag-1');
  const [visRetailerId, setVisRetailerId] = useState('rt-1');
  const [visObservedStock, setVisObservedStock] = useState(2);
  const [visRestockQty, setVisRestockQty] = useState(10);
  const [visOutcome, setVisOutcome] = useState<VisitOutcome>('restocking_requested');

  // Form 32..36: B2C & Fulfillment
  const [b2cName, setB2cName] = useState('نگین فرجاد');
  const [b2cMobile, setB2cMobile] = useState('09125556677');
  const [b2cAddress, setB2cAddress] = useState('تهران، میدان محسنی، خیابان بهروز، پلاک ۱۸');
  const [b2cPostal, setB2cPostal] = useState('1911789451');
  const [b2cQty, setB2cQty] = useState(2);
  const [selectedOrderId, setSelectedOrderId] = useState(state.b2cOrders[0]?.id ?? '');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<B2cOrderStatus>('shipped');
  const [trackingInput, setTrackingInput] = useState('POST-1405-77123');

  // Form 37..44: Expense & Settings
  const [expTitle, setExpTitle] = useState('چاپ لیبل QR و بسته‌بندی تکمیلی');
  const [expAmount, setExpAmount] = useState(450000);
  const [bizNameInput, setBizNameInput] = useState(state.settings.businessName);
  const [bizPhoneInput, setBizPhoneInput] = useState(state.settings.phone);

  const selectedFormMeta =
    ALL_45_FORMS.find((f) => f.id === selectedFormId) || ALL_45_FORMS[0];

  const filteredForms = ALL_45_FORMS.filter((f) => {
    if (categoryFilter !== 'ALL' && f.category !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      f.titleFa.includes(q) ||
      f.titleEn.toLowerCase().includes(q) ||
      String(f.id) === q
    );
  });

  const inv = computeInventorySummary(state);
  const fin = computeFinancialSummary(state);

  const showSuccess = (msg: string) => {
    setFeedback({ type: 'success', message: msg });
  };
  const showError = (err: unknown) => {
    setFeedback({
      type: 'error',
      message: err instanceof Error ? err.message : 'خطا در ثبت اطلاعات فرم',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <p className="text-xs font-medium text-stone-500">
            کاتالوگ کامل فرم‌های عملیاتی و مدیریتی (بخش ۳۸ — ۴۵ فرم تعاملی)
          </p>
          <h1 className="text-2xl font-extrabold text-stone-900 mt-1">
            مرکز فرم‌های عملیاتی، اسناد رسمی و تراکنش‌ها
          </h1>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-200/70 rounded-lg">
          {[
            { id: 'ALL', label: 'همه (۴۵ فرم)' },
            { id: 'products_pricing', label: 'محصول و قیمت' },
            { id: 'agents_retailers', label: 'بازاریاب و فروشگاه' },
            { id: 'warehouse_custody_docs', label: 'انبار و اسناد امانی' },
            { id: 'sales_payments_commissions', label: 'فروش، وصول و پورسانت' },
            { id: 'b2c_orders_shipping', label: 'فروش مستقیم B2C' },
            { id: 'finance_system_admin', label: 'مالی و تنظیمات' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === tab.id
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: 45 Forms Directory */}
        <div className="lg:col-span-4 rounded-xl bg-white border border-stone-200 overflow-hidden">
          <div className="p-3.5 border-b border-stone-200 bg-stone-50">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در ۴۵ فرم (شماره یا عنوان فارسی)..."
                aria-label="جستجو در فرم‌ها"
                className="w-full rounded-lg border border-stone-300 bg-white pr-9 pl-3 py-1.5 text-xs text-stone-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[640px] overflow-y-auto divide-y divide-stone-100">
            {filteredForms.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSelectedFormId(f.id);
                  setFeedback(null);
                }}
                className={`w-full text-right px-4 py-3 transition-colors flex items-start justify-between gap-2 ${
                  selectedFormId === f.id
                    ? 'bg-emerald-950/5 border-r-2 border-emerald-800'
                    : 'hover:bg-stone-50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    فرم {formatNumberFa(f.id)}: {f.titleFa}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                    {f.description}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-stone-400 shrink-0">
                  #{f.id}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Workspace: Active Interactive Form */}
        <div className="lg:col-span-8 rounded-xl bg-white border border-stone-200 p-6 space-y-6">
          <div className="border-b border-stone-200 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-emerald-800">
                فرم شماره {formatNumberFa(selectedFormMeta.id)} از ۴۵ · {selectedFormMeta.titleEn}
              </div>
              <h2 className="text-xl font-extrabold text-stone-900 mt-1">
                {selectedFormMeta.titleFa}
              </h2>
              <p className="text-xs text-stone-500 mt-1">{selectedFormMeta.description}</p>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-lg px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* FORM 1 & 2: Product Registration / Editing (Part 7) */}
          {(selectedFormId === 1 || selectedFormId === 2) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const next = createProduct(state, {
                    name: prodName,
                    sku: prodSku,
                    brand: prodBrand,
                    category: prodCategory,
                    packaging: prodPackaging,
                    netWeightGrams: Number(prodWeight),
                    unit: 'بسته',
                    description: 'محصول ثبت‌شده در کاتالوگ چندمحصولی خرمای صابر',
                    costPrice: Number(prodCost),
                    baseRetailerPrice: Number(prodBasePrice),
                    retailerMarkupPercent: Number(prodMarkup),
                    directB2cPrice: Number(prodB2cPrice),
                    minStockAlert: Number(prodMinAlert),
                    barcode: prodBarcode,
                    initialWarehouseStock: Number(prodInitStock),
                  });
                  onUpdateState(next);
                  showSuccess(`محصول «${prodName}» با کد ${prodSku} با موفقیت در کاتالوگ ثبت شد.`);
                } catch (err) {
                  showError(err);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    ۱. نام محصول (الزامی) *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    ۲. کد محصول (SKU یکتا — الزامی) *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">۳. نام تجاری</label>
                  <input
                    type="text"
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    ۴. دسته‌بندی (الزامی) *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">۵. نوع بسته‌بندی</label>
                  <input
                    type="text"
                    value={prodPackaging}
                    onChange={(e) => setProdPackaging(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    ۶. وزن خالص (گرم — عدد مثبت) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={prodWeight}
                    onChange={(e) => setProdWeight(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    ۱۱. قیمت خرید یا بهای تمام‌شده (تومان)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={prodCost}
                    onChange={(e) => setProdCost(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    ۱۲. قیمت پایه تسویه با سوپرمارکت (تومان) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodBasePrice}
                    onChange={(e) => setProdBasePrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    درصد حاشیه سود سوپرمارکت (٪) — قیمت پیشنهادی:{' '}
                    {formatToman(calculateSuggestedRetailPrice(prodBasePrice, prodMarkup))}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={prodMarkup}
                    onChange={(e) => setProdMarkup(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    ۱۳. قیمت فروش مستقیم به مشتری B2C (تومان) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prodB2cPrice}
                    onChange={(e) => setProdB2cPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    ۱۴. حداقل موجودی هشدار (بسته)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={prodMinAlert}
                    onChange={(e) => setProdMinAlert(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    موجودی اولیه ورودی به انبار مرکزی (اختیاری)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={prodInitStock}
                    onChange={(e) => setProdInitStock(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-200">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
                >
                  ذخیره محصول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProdName('خرمای کبکاب بهبهان');
                    setProdSku(`KBK-${Math.floor(100 + Math.random() * 899)}`);
                  }}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  ذخیره و افزودن محصول جدید
                </button>
              </div>
            </form>
          )}

          {/* FORM 3: Dynamic Pricing Management (Part 8) */}
          {selectedFormId === 3 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const next = updateProductPricing(state, {
                    productId: pricingProductId,
                    costPrice: editCostPrice,
                    baseRetailerPrice: editBasePrice,
                    retailerMarkupPercent: editMarkup,
                    directB2cPrice: editB2cPrice,
                  });
                  onUpdateState(next);
                  showSuccess(
                    'قیمت‌های جدید محصول ثبت شد. کلیه سفارش‌ها و حواله‌های قبلی با قیمت snapshot زمان ثبت خود محفوظ ماندند.'
                  );
                } catch (err) {
                  showError(err);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">انتخاب محصول</label>
                  <select
                    value={pricingProductId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setPricingProductId(pid);
                      const p = state.products.find((x) => x.id === pid);
                      if (p) {
                        setEditCostPrice(p.costPrice);
                        setEditBasePrice(p.baseRetailerPrice);
                        setEditMarkup(p.retailerMarkupPercent);
                        setEditB2cPrice(p.directB2cPrice);
                      }
                    }}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    بهای تمام‌شده هر بسته (تومان)
                  </label>
                  <input
                    type="number"
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    قیمت پایه تسویه با سوپرمارکت (تومان)
                  </label>
                  <input
                    type="number"
                    value={editBasePrice}
                    onChange={(e) => setEditBasePrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    درصد حاشیه سود سوپرمارکت (٪)
                  </label>
                  <input
                    type="number"
                    value={editMarkup}
                    onChange={(e) => setEditMarkup(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
                  <div className="text-stone-500">قیمت پیشنهادی فروش در سوپرمارکت (محاسبه خودکار):</div>
                  <div className="text-base font-extrabold text-emerald-900 mt-1 tabular-nums">
                    {formatToman(calculateSuggestedRetailPrice(editBasePrice, editMarkup))}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    قیمت فروش مستقیم به مصرف‌کننده B2C (تومان)
                  </label>
                  <input
                    type="number"
                    value={editB2cPrice}
                    onChange={(e) => setEditB2cPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
              >
                ثبت قیمت جدید و حفظ تاریخچه
              </button>
            </form>
          )}

          {/* FORM 4, 5, 8: Sales Agent Management (Part 9) */}
          {(selectedFormId === 4 || selectedFormId === 5 || selectedFormId === 8) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const next = createSalesAgent(state, {
                    fullName: agentName,
                    mobile: agentMobile,
                    nationalId: agentNationalId,
                    address: agentAddress,
                    commissionRatePercent: agentRate,
                    custodyPolicyMode: agentCustodyMode,
                  });
                  onUpdateState(next);
                  setAgentName('');
                  showSuccess('بازاریاب جدید با کد اختصاصی و قانون پورسانت ثبت گردید.');
                } catch (err) {
                  showError(err);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    نام و نام خانوادگی بازاریاب (الزامی) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: بهرام صادقی"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    شماره موبایل (یکتا — الزامی) *
                  </label>
                  <input
                    type="text"
                    required
                    value={agentMobile}
                    onChange={(e) => setAgentMobile(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    نرخ پورسانت وصول مطالبات (٪)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={agentRate}
                    onChange={(e) => setAgentRate(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    رژیم تحویل کالا به بازاریاب
                  </label>
                  <select
                    value={agentCustodyMode}
                    onChange={(e) => setAgentCustodyMode(e.target.value as CustodyPolicyMode)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    <option value="consignment">تحویل امانی با تعهد نگهداری و تسویه (پیش‌فرض)</option>
                    <option value="credit_sale">فروش نسیه به بازاریاب (تعهد مالی قطعی)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">نشانی و منطقه پوشش</label>
                  <input
                    type="text"
                    value={agentAddress}
                    onChange={(e) => setAgentAddress(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
              >
                ثبت و فعال‌سازی بازاریاب
              </button>
            </form>
          )}

          {/* FORM 6 & 7: Retailer Registration (Part 10) */}
          {(selectedFormId === 6 || selectedFormId === 7) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const next = createRetailer(state, {
                    storeName,
                    ownerName,
                    mobile: storeMobile,
                    address: storeAddress,
                    province: 'تهران',
                    city: 'تهران',
                    district: storeDistrict,
                    postalCode: '1456789123',
                    agentId: storeAgentId,
                    deliveryMode: storeMode,
                  });
                  onUpdateState(next);
                  setStoreName('');
                  showSuccess('سوپرمارکت جدید ثبت و به بازاریاب مربوطه تخصیص داده شد.');
                } catch (err) {
                  showError(err);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    نام فروشگاه / سوپرمارکت (الزامی) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: سوپرمارکت بهار قلهک"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    نام مالک یا مسئول فروشگاه *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: حاج علی شریفی"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">شماره موبایل *</label>
                  <input
                    type="text"
                    required
                    value={storeMobile}
                    onChange={(e) => setStoreMobile(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">بازاریاب مسئول</label>
                  <select
                    value={storeAgentId}
                    onChange={(e) => setStoreAgentId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fullName} ({a.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">محله / منطقه</label>
                  <input
                    type="text"
                    value={storeDistrict}
                    onChange={(e) => setStoreDistrict(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">مدل همکاری</label>
                  <select
                    value={storeMode}
                    onChange={(e) => setStoreMode(e.target.value as CustodyPolicyMode)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    <option value="consignment">فروش امانی (تسویه بر اساس گزارش فروش)</option>
                    <option value="credit_sale">فروش نسیه (ایجاد بدهی در زمان تحویل)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">نشانی دقیق</label>
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
              >
                ثبت و تأیید سوپرمارکت
              </button>
            </form>
          )}

          {/* FORM 9, 10, 30: Warehouse Stock Entry & Supplier Receipt */}
          {(selectedFormId === 9 || selectedFormId === 10 || selectedFormId === 30) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const next = recordSupplierStockReceipt(state, {
                    productId: supProductId,
                    quantity: supQty,
                    supplierName: supName,
                  });
                  onUpdateState(next);
                  showSuccess(
                    `${formatNumberFa(supQty)} بسته به موجودی انبار مرکزی اضافه شد (تراکنش غیرقابل‌تغییر انبار ثبت گردید).`
                  );
                } catch (err) {
                  showError(err);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">محصول</label>
                  <select
                    value={supProductId}
                    onChange={(e) => setSupProductId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">تعداد بسته ورودی *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={supQty}
                    onChange={(e) => setSupQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">مبدأ / تأمین‌کننده</label>
                  <input
                    type="text"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
              >
                ثبت رسید ورود به انبار مرکزی
              </button>
            </form>
          )}

          {/* FORM 11, 12, 40: Warehouse-to-Agent Delivery Receipt (Official Form 1) */}
          {(selectedFormId === 11 || selectedFormId === 12 || selectedFormId === 40) && (
            <div className="space-y-5 text-xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    const res = createWarehouseToAgentDeliveryDraft(state, {
                      agentId: delivAgentId,
                      productId: delivProductId,
                      quantity: delivQty,
                      policyMode: delivMode,
                    });
                    onUpdateState(res.nextState);
                    showSuccess(
                      `سند رسمی «${res.createdDocument.documentNumber}» صادر شد. اکنون می‌توانید آن را چاپ کرده، تصویر امضاشده را بارگذاری و تأیید نهایی کنید.`
                    );
                    onOpenDocument(res.createdDocument);
                  } catch (err) {
                    showError(err);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      انتخاب بازاریاب تحویل‌گیرنده *
                    </label>
                    <select
                      value={delivAgentId}
                      onChange={(e) => setDelivAgentId(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    >
                      {state.agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullName} ({a.code}) — موجودی فعلی:{' '}
                          {formatNumberFa(inv.agentCustodyByAgent[a.id] ?? 0)} بسته
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      محصول (موجودی انبار مرکزی: {formatNumberFa(inv.warehouseStock)} بسته)
                    </label>
                    <select
                      value={delivProductId}
                      onChange={(e) => setDelivProductId(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    >
                      {state.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      تعداد بسته تحویلی به بازاریاب *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={inv.warehouseStock}
                      value={delivQty}
                      onChange={(e) => setDelivQty(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      حالت تحویل و مسئولیت بازاریاب
                    </label>
                    <select
                      value={delivMode}
                      onChange={(e) => setDelivMode(e.target.value as CustodyPolicyMode)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    >
                      <option value="consignment">
                        امانی (مسئولیت نگهداری و توزیع — بدون ایجاد بدهی نقدی فوری)
                      </option>
                      <option value="credit_sale">فروش نسیه به بازاریاب</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-950"
                >
                  <Printer className="w-4 h-4" />
                  <span>صدور و پیش‌نمایش چاپی رسید تحویل به بازاریاب (AG-1405)</span>
                </button>
              </form>
            </div>
          )}

          {/* FORM 13 & 14: Agent-to-Retailer Delivery Receipt (Official Form 2) */}
          {(selectedFormId === 13 || selectedFormId === 14) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const res = createAgentToRetailerDeliveryDraft(state, {
                    agentId: delivAgentId,
                    retailerId: delivRetailerId,
                    productId: delivProductId,
                    quantity: delivQty,
                    deliveryMode: delivMode,
                  });
                  onUpdateState(res.nextState);
                  showSuccess(
                    `سند تحویل امانی به فروشگاه «${res.createdDocument.documentNumber}» صادر شد.`
                  );
                  onOpenDocument(res.createdDocument);
                } catch (err) {
                  showError(err);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">بازاریاب تحویل‌دهنده</label>
                  <select
                    value={delivAgentId}
                    onChange={(e) => setDelivAgentId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fullName} ({a.code}) — موجودی نزد بازاریاب:{' '}
                        {formatNumberFa(inv.agentCustodyByAgent[a.id] ?? 0)} بسته
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    سوپرمارکت تحویل‌گیرنده
                  </label>
                  <select
                    value={delivRetailerId}
                    onChange={(e) => setDelivRetailerId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.retailers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.storeName} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">تعداد بسته تحویلی *</label>
                  <input
                    type="number"
                    min={1}
                    value={delivQty}
                    onChange={(e) => setDelivQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">مدل تحویل به فروشگاه</label>
                  <select
                    value={delivMode}
                    onChange={(e) => setDelivMode(e.target.value as CustodyPolicyMode)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    <option value="consignment">امانی (پیش‌فرض)</option>
                    <option value="credit_sale">فروش نسیه</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-950"
              >
                <Printer className="w-4 h-4" />
                <span>صدور رسید تحویل امانی به فروشگاه (RT-1405)</span>
              </button>
            </form>
          )}

          {/* FORM 15 & 16 & 28 & 29: Returns & Discrepancies */}
          {(selectedFormId === 15 ||
            selectedFormId === 16 ||
            selectedFormId === 28 ||
            selectedFormId === 29) && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">بازاریاب</label>
                  <select
                    value={delivAgentId}
                    onChange={(e) => setDelivAgentId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fullName} (موجودی: {formatNumberFa(inv.agentCustodyByAgent[a.id] ?? 0)}{' '}
                        بسته)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">فروشگاه (در صورت مرجوعی فروشگاه)</label>
                  <select
                    value={delivRetailerId}
                    onChange={(e) => setDelivRetailerId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.retailers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.storeName} (موجودی: {formatNumberFa(inv.retailerCustodyByRetailer[r.id] ?? 0)} بسته)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">تعداد بسته برگشتی / آسیب‌دیده</label>
                  <input
                    type="number"
                    min={1}
                    value={delivQty}
                    onChange={(e) => setDelivQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">علت برگشت / شرح کسری</label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const next = recordAgentReturnToWarehouse(state, {
                        agentId: delivAgentId,
                        productId: delivProductId,
                        quantityReturned: delivQty,
                        condition: selectedFormId === 29 ? 'damaged' : 'healthy',
                        reason: returnReason,
                      });
                      onUpdateState(next);
                      showSuccess('برگشت کالای بازاریاب به انبار ثبت شد و تراز موجودی بروزرسانی گردید.');
                    } catch (err) {
                      showError(err);
                    }
                  }}
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-950"
                >
                  ثبت برگشت از بازاریاب به انبار (AR-1405)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const next = recordRetailerReturn(state, {
                        retailerId: delivRetailerId,
                        destination: 'warehouse',
                        productId: delivProductId,
                        quantityReturned: delivQty,
                        reason: returnReason,
                      });
                      onUpdateState(next);
                      showSuccess('مرجوعی کالا از فروشگاه ثبت و از موجودی امانی فروشگاه کسر شد.');
                    } catch (err) {
                      showError(err);
                    }
                  }}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                >
                  ثبت مرجوعی از فروشگاه (RR-1405)
                </button>
              </div>
            </div>
          )}

          {/* FORM 17 & 18: Retailer Sales Report & Stock Count (Part 18) */}
          {(selectedFormId === 17 || selectedFormId === 18) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const next = submitAndVerifyRetailerSalesReport(state, {
                    retailerId: srRetailerId,
                    productId: delivProductId,
                    reportedSoldQuantity: srSoldQty,
                    autoVerify: true,
                  });
                  onUpdateState(next);
                  showSuccess(
                    `گزارش فروش ${formatNumberFa(srSoldQty)} بسته تأیید شد، موجودی امانی فروشگاه کاهش یافت و فاکتور مطالبات صادر گردید.`
                  );
                } catch (err) {
                  showError(err);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">انتخاب فروشگاه</label>
                  <select
                    value={srRetailerId}
                    onChange={(e) => setSrRetailerId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.retailers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.storeName} ({r.code}) — موجودی فعلی:{' '}
                        {formatNumberFa(inv.retailerCustodyByRetailer[r.id] ?? 0)} بسته
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    تعداد بسته‌های فروخته‌شده در این دوره *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={srSoldQty}
                    onChange={(e) => setSrSoldQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
              </div>
              <div className="rounded-lg bg-stone-50 p-3 border border-stone-200 tabular-nums">
                فرمول کنترلی سیستم: موجودی اول دوره (
                {formatNumberFa(inv.retailerCustodyByRetailer[srRetailerId] ?? 0)}) − فروش گزارش‌شده (
                {formatNumberFa(srSoldQty)}) = موجودی پایانی جدید (
                {formatNumberFa(
                  Math.max(0, (inv.retailerCustodyByRetailer[srRetailerId] ?? 0) - srSoldQty)
                )}{' '}
                بسته) · مبلغ ایجاد مطالبات:{' '}
                {formatToman(srSoldQty * (state.products[0]?.baseRetailerPrice ?? 200000))}
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
              >
                ثبت و تأیید گزارش فروش فروشگاه
              </button>
            </form>
          )}

          {/* FORM 19 & 20: Field Visit & Restocking Request */}
          {(selectedFormId === 19 || selectedFormId === 20) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const next = recordFieldVisit(state, {
                    agentId: visAgentId,
                    retailerId: visRetailerId,
                    observedStock: visObservedStock,
                    retailerReportedSales: 0,
                    paymentFollowupStatus: 'پیگیری حضوری در بازدید دوره‌ای',
                    restockingNeededCount: visRestockQty,
                    outcome: visOutcome,
                    nextVisitDate: new Date(Date.now() + 7 * 86400000).toISOString(),
                  });
                  onUpdateState(next);
                  showSuccess('گزارش بازدید میدانی و درخواست تأمین مجدد کالا با موفقیت ثبت شد.');
                } catch (err) {
                  showError(err);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">بازاریاب بازدیدکننده</label>
                  <select
                    value={visAgentId}
                    onChange={(e) => setVisAgentId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fullName} ({a.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">فروشگاه</label>
                  <select
                    value={visRetailerId}
                    onChange={(e) => setVisRetailerId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.retailers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.storeName} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    موجودی مشاهده‌شده در قفسه (بسته)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={visObservedStock}
                    onChange={(e) => setVisObservedStock(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    تعداد درخواستی جهت شارژ مجدد (بسته)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={visRestockQty}
                    onChange={(e) => setVisRestockQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">نتیجه بازدید</label>
                  <select
                    value={visOutcome}
                    onChange={(e) => setVisOutcome(e.target.value as VisitOutcome)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  >
                    <option value="restocking_requested">درخواست شارژ مجدد کالا</option>
                    <option value="stock_depleted">اتمام کامل موجودی قفسه</option>
                    <option value="payment_followup_required">نیازمند پیگیری تسویه حساب</option>
                    <option value="payment_received">دریافت وجه در محل</option>
                    <option value="stock_sufficient">موجودی کافی است</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
              >
                ثبت گزارش بازدید و درخواست تأمین
              </button>
            </form>
          )}

          {/* FORM 21, 22, 23, 24, 25, 26, 27: Payments, Remittances & Commissions */}
          {selectedFormId >= 21 && selectedFormId <= 27 && (
            <div className="space-y-6 text-xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    const next = submitRetailerPayment(state, {
                      retailerId: payRetailerId,
                      amount: payAmount,
                      method: payMethod,
                      referenceNumber: payRef,
                      collectedByAgentDirectly: payMethod === 'cash_to_agent',
                      autoVerify: true,
                    });
                    onUpdateState(next);
                    showSuccess(
                      `پرداخت به مبلغ ${formatToman(payAmount)} ثبت و تأیید شد، از بدهی فروشگاه کسر گردید و پورسانت بازاریاب محاسبه شد.`
                    );
                  } catch (err) {
                    showError(err);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">فروشگاه پرداخت‌کننده</label>
                    <select
                      value={payRetailerId}
                      onChange={(e) => setPayRetailerId(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    >
                      {state.retailers.map((r) => {
                        const debt = state.invoices
                          .filter((i) => i.retailerId === r.id)
                          .reduce((s, i) => s + i.remainingAmount, 0);
                        return (
                          <option key={r.id} value={r.id}>
                            {r.storeName} — مانده بدهی: {formatNumberFa(debt)} تومان
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      مبلغ پرداخت (تومان) *
                    </label>
                    <input
                      type="number"
                      min={1000}
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">روش پرداخت</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    >
                      <option value="bank_transfer">انتقال بانکی / شبا به حساب مدیریت</option>
                      <option value="pos">کارتخوان (POS)</option>
                      <option value="cash_to_agent">تحویل وجه نقد به بازاریاب در محل (فرم ۷)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">شماره پیگیری / فیش</label>
                    <input
                      type="text"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
                >
                  ثبت و تأیید پرداخت + محاسبه پورسانت
                </button>
              </form>

              {/* Agent Remittance Subform (Form 24) */}
              <div className="pt-4 border-t border-stone-200">
                <h4 className="font-bold text-stone-800 mb-2">
                  فرم ۸ (شماره ۲۴): تحویل وجوه نقد وصولی بازاریاب به مدیریت
                </h4>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">بازاریاب</label>
                    <select
                      value={remAgentId}
                      onChange={(e) => setRemAgentId(e.target.value)}
                      className="rounded-lg border border-stone-300 px-3 py-2"
                    >
                      {state.agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullName} — نقد نزد بازاریاب:{' '}
                          {formatNumberFa(fin.agentCashByAgent[a.id]?.held ?? 0)} تومان
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">مبلغ واریزی به مدیریت (تومان)</label>
                    <input
                      type="number"
                      value={remAmount}
                      onChange={(e) => setRemAmount(Number(e.target.value))}
                      className="rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const next = submitAndVerifyAgentRemittance(state, {
                          agentId: remAgentId,
                          remittedAmount: remAmount,
                          transferReference: `REM-${Date.now()}`,
                        });
                        onUpdateState(next);
                        showSuccess('وجه نقد تحویلی بازاریاب تأیید و به حساب بانکی مدیریت منتقل شد.');
                      } catch (err) {
                        showError(err);
                      }
                    }}
                    className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                  >
                    تأیید تحویل وجه به مدیریت
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FORM 31..36: B2C Checkout, Fulfillment & Refund */}
          {selectedFormId >= 31 && selectedFormId <= 36 && (
            <div className="space-y-6 text-xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    const res = createB2cOrderWithSimulatedPayment(state, {
                      customerName: b2cName,
                      customerMobile: b2cMobile,
                      province: 'تهران',
                      city: 'تهران',
                      deliveryAddress: b2cAddress,
                      postalCode: b2cPostal,
                      productId: state.products[0].id,
                      quantity: b2cQty,
                      sourceChannel: 'direct_web',
                    });
                    onUpdateState(res.nextState);
                    showSuccess(
                      `سفارش مستقیم مشتری «${res.createdOrder.orderNumber}» ثبت و موجودی از انبار رزرو گردید.`
                    );
                  } catch (err) {
                    showError(err);
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">نام و نام خانوادگی مشتری *</label>
                  <input
                    type="text"
                    required
                    value={b2cName}
                    onChange={(e) => setB2cName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">شماره موبایل *</label>
                  <input
                    type="text"
                    required
                    value={b2cMobile}
                    onChange={(e) => setB2cMobile(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">کد پستی ۱۰ رقمی *</label>
                  <input
                    type="text"
                    required
                    value={b2cPostal}
                    onChange={(e) => setB2cPostal(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">تعداد بسته *</label>
                  <input
                    type="number"
                    min={1}
                    value={b2cQty}
                    onChange={(e) => setB2cQty(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">نشانی تحویل *</label>
                  <input
                    type="text"
                    required
                    value={b2cAddress}
                    onChange={(e) => setB2cAddress(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
                  >
                    ثبت سفارش B2C و پرداخت آزمایشی
                  </button>
                </div>
              </form>

              {/* Order Shipment Update (Forms 33 & 34) */}
              <div className="pt-4 border-t border-stone-200 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">انتخاب سفارش مشتری</label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2"
                  >
                    {state.b2cOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} — {o.customerName} ({o.quantity} بسته)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">وضعیت ارسال</label>
                  <select
                    value={selectedOrderStatus}
                    onChange={(e) => setSelectedOrderStatus(e.target.value as B2cOrderStatus)}
                    className="rounded-lg border border-stone-300 px-3 py-2"
                  >
                    <option value="preparing">در حال بسته‌بندی</option>
                    <option value="shipped">تحویل به پست/پیک (Shipped)</option>
                    <option value="delivered">تحویل‌شده به مشتری (Delivered)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">کد رهگیری پستی</label>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const next = updateB2cOrderFulfillment(state, {
                        orderId: selectedOrderId,
                        orderStatus: selectedOrderStatus,
                        trackingCode: trackingInput,
                      });
                      onUpdateState(next);
                      showSuccess('وضعیت ارسال و کد رهگیری مرسوله بروزرسانی شد.');
                    } catch (err) {
                      showError(err);
                    }
                  }}
                  className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                >
                  بروزرسانی وضعیت ارسال
                </button>
              </div>
            </div>
          )}

          {/* FORM 37..45: Finance, Expenses, RBAC, Settings */}
          {selectedFormId >= 37 && selectedFormId !== 40 && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    نام تجاری کسب‌وکار (قابل ویرایش در سراسر سامانه)
                  </label>
                  <input
                    type="text"
                    value={bizNameInput}
                    onChange={(e) => setBizNameInput(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">تلفن پشتیبانی</label>
                  <input
                    type="text"
                    value={bizPhoneInput}
                    onChange={(e) => setBizPhoneInput(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    شرح هزینه عملیاتی جدید (فرم ۳۷)
                  </label>
                  <input
                    type="text"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    مبلغ هزینه (تومان)
                  </label>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 tabular-nums"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = updateBusinessSettings(state, {
                      businessName: bizNameInput,
                      phone: bizPhoneInput,
                    });
                    onUpdateState(next);
                    showSuccess('تنظیمات مرکزی کسب‌وکار با موفقیت ذخیره شد.');
                  }}
                  className="rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
                >
                  ذخیره تنظیمات کسب‌وکار
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateState({
                      ...state,
                      version: state.version + 1,
                      expenses: [
                        {
                          id: `exp-${Date.now()}`,
                          expenseNumber: `EXP-1405-000${state.expenses.length + 1}`,
                          category: 'packaging',
                          title: expTitle,
                          amount: expAmount,
                          expenseDate: new Date().toISOString(),
                          paidFromAccount: 'حساب جاری بانک ملت',
                          referenceNumber: `EXP-REF-${Date.now()}`,
                          recordedBy: 'مدیر سیستم',
                          notes: '',
                        },
                        ...state.expenses,
                      ],
                    });
                    showSuccess('هزینه عملیاتی در دفتر کل مالی ثبت گردید.');
                  }}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                >
                  ثبت سند هزینه عملیاتی
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
