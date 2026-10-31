import React, { useState } from 'react';
import {
  ShoppingBag,
  QrCode,
  ShieldCheck,
  Truck,
  Store,
  CheckCircle2,
  Search,
  MapPin,
  Sparkles,
  Phone,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { SaberCommerceState } from '../core/types.ts';
import { computeInventorySummary } from '../core/engine.ts';
import { api, newKey, type PublicCatalog, type PublicOrder } from '../api.ts';
import { formatPersianNumber, formatToman, toJalaliDateString } from '../core/formatters.ts';
import { QrCodeSvg } from './QrCodeSvg.tsx';

interface CustomerStorefrontViewProps {
  catalog: PublicCatalog;
  referralAgentCode: string | null;
}

/** The storefront only ever receives the public catalogue; it is turned into the minimal shape this view was written for. */
function catalogToState(c: PublicCatalog): SaberCommerceState {
  const products = c.products.map((p) => ({
    id: p.id, sku: p.sku, slug: p.slug, name: p.name, brand: p.brand, category: p.category, packaging: p.packaging, netWeightGrams: p.netWeightGrams, unit: 'بسته',
    description: p.description, costPrice: 0, baseRetailerPrice: p.baseRetailerPrice, retailerMarkupPercent: p.retailerMarkupPercent, suggestedRetailPrice: p.suggestedRetailPrice, directB2cPrice: p.directB2cPrice, priceEffectiveDate: '', minStockAlert: 0, barcode: '', isActive: true, createdAt: '', updatedAt: '',
  }));
  const stock = products.length ? [{ id: 'public-stock', productId: products[0].id, movementType: 'initial_stock', fromLocationType: 'external', fromLocationId: 'public', toLocationType: 'warehouse', toLocationId: 'main', quantity: c.products[0]?.available ?? 0, unitPriceSnapshot: 0, createdAt: '', createdBy: '', notes: '' }] : [];
  return {
    version: 0,
    settings: { ...({} as SaberCommerceState['settings']), ...c.business, defaultRetailerDeliveryMode: 'consignment' },
    products, agents: c.agents.map((a) => ({ id: a.id, code: a.code, fullName: a.fullName })) as unknown as SaberCommerceState['agents'],
    inventoryTransactions: stock, b2cOrders: [], retailers: [],
  } as unknown as SaberCommerceState;
}

export const CustomerStorefrontView: React.FC<CustomerStorefrontViewProps> = ({ catalog, referralAgentCode }) => {
  const state = React.useMemo(() => catalogToState(catalog), [catalog]);
  const product = state.products[0];
  const inv = computeInventorySummary(state, product.id);
  const referralAgent = referralAgentCode
    ? state.agents.find((a) => a.code.toLowerCase() === referralAgentCode.toLowerCase())
    : undefined;

  const [activePathway, setActivePathway] = useState<
    'qr_landing' | 'b2c_checkout' | 'b2b_onboarding' | 'track_order'
  >('qr_landing');

  // B2C Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [province, setProvince] = useState('تهران');
  const [city, setCity] = useState('تهران');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [quantity, setQuantity] = useState<number>(2);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<(PublicOrder & { customerName: string }) | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attemptKey, setAttemptKey] = useState(newKey());

  // B2B Store Partnership Form State
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [storeMobile, setStoreMobile] = useState('');
  const [storeDistrict, setStoreDistrict] = useState('');
  const [storeProvince, setStoreProvince] = useState('تهران');
  const [storeCity, setStoreCity] = useState('تهران');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePostalCode, setStorePostalCode] = useState('');
  const [b2bSuccessMsg, setB2bSuccessMsg] = useState<string | null>(null);
  const [b2bError, setB2bError] = useState<string | null>(null);

  // Order Tracking State
  const [trackNumber, setTrackNumber] = useState('');
  const [trackMobile, setTrackMobile] = useState('');
  const [tracked, setTracked] = useState<PublicOrder | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  const unitPrice = product.campaignPrice ?? product.directB2cPrice;
  const subtotal = unitPrice * quantity;
  const shippingFee =
    subtotal >= state.settings.freeShippingThreshold ? 0 : state.settings.defaultShippingFee;
  const totalPayable = subtotal + shippingFee;

  const handleB2cCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    setSubmitting(true);
    try {
      const r = await api.publicOrder({
        customerName, customerMobile, province, city, deliveryAddress, postalCode, productId: product.id, quantity,
        referralCode: referralAgent?.code, source: referralAgent ? 'agent_referral' : 'qr_packaging', idempotencyKey: attemptKey,
      });
      setCompletedOrder({ ...r.order, customerName });
      setAttemptKey(newKey());
    } catch (err: any) {
      setCheckoutError(err?.message || 'خطا در ثبت سفارش آنلاین');
    } finally {
      setSubmitting(false);
    }
  };

  const handleB2bSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setB2bError(null);
    setB2bSuccessMsg(null);
    setSubmitting(true);
    try {
      const r = await api.retailerRequest({
        storeName, ownerName, mobile: storeMobile, address: storeAddress, province: storeProvince, city: storeCity, district: storeDistrict,
        postalCode: storePostalCode, referralCode: referralAgent?.code,
      });
      setB2bSuccessMsg(r.message);
      setStoreName('');
      setOwnerName('');
      setStoreMobile('');
      setStoreAddress('');
    } catch (err: any) {
      setB2bError(err?.message || 'خطا در ثبت درخواست همکاری فروشگاهی');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTracked(null);
    try {
      setTracked((await api.trackOrder(trackNumber.trim(), trackMobile.trim())).order);
    } catch (err: any) {
      setTrackError(err?.message || 'سفارش پیدا نشد.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Channel & QR / Referral Simulator Bar */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-900 text-amber-100 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono bg-stone-100 text-stone-800 px-2 py-0.5 rounded-md border border-stone-200">
                /p/{product.slug}
              </span>
              <h2 className="text-sm font-bold text-stone-900">
                صفحه فرود بسته‌بندی هوشمند و فروشگاه مستقیم «خرمای صابر»
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {referralAgent ? (
                <span className="text-emerald-800 font-semibold">
                  ورود از طریق لینک اختصاصی بازاریاب معرف: {referralAgent.fullName} (
                  {referralAgent.code}) — ثبت امتیاز معرفی فعال است
                </span>
              ) : (
                <span>
                  ورود از طریق QR استاندارد روی بسته ۶۰۰ گرمی (بدون انتساب خودکار پورسانت به بازاریاب)
                </span>
              )}
            </p>
          </div>
        </div>

      </div>

      {/* Sub-navigation between QR Landing, B2C Checkout, B2B Onboarding, Order Tracking */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'qr_landing', label: 'معرفی محصول و اصالت نخلستان (/p/piarom-600)' },
          { id: 'b2c_checkout', label: '۱. خرید برای مصرف شخصی (فروشگاه آنلاین B2C)' },
          { id: 'b2b_onboarding', label: '۲. درخواست همکاری یا خرید فروشگاهی (B2B)' },
          { id: 'track_order', label: 'پیگیری سفارش‌های آنلاین' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActivePathway(tab.id as any);
              setCompletedOrder(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activePathway === tab.id
                ? 'bg-amber-900 text-white shadow-xs'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View 1: Packaging QR Landing Page & Product Story (Part 32) */}
      {activePathway === 'qr_landing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Product Visual & QR Verification Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-amber-50 rounded-3xl p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-400/20 text-amber-200 border border-amber-300/30">
                محصول ممتاز صادراتی — برداشت تازه ۱۴۰۵
              </span>
              <span className="font-mono text-xs text-amber-300">{product.sku}</span>
            </div>

            {/* Bespoke SVG Packaging Illustration */}
            <div className="bg-stone-950/50 border border-amber-400/20 rounded-2xl p-5 flex flex-col items-center text-center space-y-3">
              <svg
                viewBox="0 0 260 150"
                className="w-52 h-32"
                role="img"
                aria-label="بسته ۶۰۰ گرمی خرمای پیارم صابر"
              >
                <rect
                  x="20"
                  y="15"
                  width="220"
                  height="120"
                  rx="18"
                  fill="#291811"
                  stroke="#d97706"
                  strokeWidth="2.5"
                />
                <rect
                  x="34"
                  y="28"
                  width="192"
                  height="94"
                  rx="12"
                  fill="#451a03"
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                />
                {/* Stylized Piarom dates inside transparent window */}
                <ellipse cx="75" cy="75" rx="22" ry="11" fill="#78350f" />
                <ellipse cx="130" cy="75" rx="22" ry="11" fill="#92400e" />
                <ellipse cx="185" cy="75" rx="22" ry="11" fill="#78350f" />
                <text
                  x="130"
                  y="55"
                  textAnchor="middle"
                  fill="#fef3c7"
                  fontSize="13"
                  fontWeight="bold"
                >
                  خرمای پیارم ممتاز صابر
                </text>
                <text x="130" y="106" textAnchor="middle" fill="#fcd34d" fontSize="11">
                  وزن خالص: ۶۰۰ گرم | حاجی‌آباد هرمزگان
                </text>
              </svg>
              <div className="text-lg font-extrabold text-white">{product.name}</div>
              <p className="text-xs text-amber-200/90 leading-relaxed">{product.description}</p>
            </div>

            {/* Pricing Transparency Box */}
            <div className="bg-white/10 rounded-2xl p-4 grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[11px] text-amber-200">قیمت خرید مستقیم آنلاین (B2C)</div>
                <div className="text-lg font-extrabold text-white tabular-nums mt-0.5">
                  {formatToman(unitPrice)}
                </div>
              </div>
              <div className="border-r border-amber-200/20">
                <div className="text-[11px] text-amber-200">موجودی آماده ارسال انبار</div>
                <div className="text-lg font-extrabold text-emerald-300 tabular-nums mt-0.5">
                  {formatPersianNumber(inv.warehouseStock)} بسته
                </div>
              </div>
            </div>

            {/* Embedded QR Code for Packaging */}
            <div className="bg-white text-stone-900 rounded-2xl p-4 flex items-center gap-4">
              <QrCodeSvg value={`https://saber-dates.ir/p/${product.slug}`} size={84} />
              <div className="text-xs space-y-1">
                <div className="font-bold text-stone-900">کد QR اصالت و سفارش مجدد</div>
                <p className="text-stone-600 leading-relaxed">
                  چاپ‌شده روی تمام بسته‌های ۶۰۰ گرمی جهت خرید مستقیم مصرف‌کننده یا ثبت درخواست همکاری
                  سوپرمارکت‌ها.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Two Explicit Pathways (Part 32) & Product Specs */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-5">
              <div>
                <h1 className="text-xl font-extrabold text-stone-900">
                  انتخاب مسیر خرید یا همکاری تجاری
                </h1>
                <p className="text-xs text-stone-500 mt-1">
                  لطفاً متناسب با نیاز خود یکی از دو مسیر زیر را انتخاب نمایید:
                </p>
              </div>

              {/* Dual Pathway Cards (Part 32 requirement) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-amber-700 bg-amber-50/50 rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-800 text-white flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-extrabold text-stone-900">
                      ۱. خرید برای مصرف شخصی
                    </h2>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      ثبت سفارش آنلاین بدون نیاز به ثبت‌نام پیچیده و ارسال مستقیم از سردخانه مرکزی به
                      سراسر کشور.
                    </p>
                    <div className="pt-1 text-xs font-bold text-amber-950 tabular-nums">
                      قیمت هر بسته ۶۰۰ گرمی: {formatToman(unitPrice)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePathway('b2c_checkout')}
                    className="w-full py-3 rounded-xl bg-amber-800 text-white hover:bg-amber-900 font-bold text-xs shadow-xs transition"
                  >
                    شروع خرید مستقیم آنلاین ←
                  </button>
                </div>

                <div className="border-2 border-stone-800 bg-stone-50 rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center">
                      <Store className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-extrabold text-stone-900">
                      ۲. درخواست همکاری یا خرید فروشگاهی
                    </h2>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      ویژه سوپرمارکت‌ها، فروشگاه‌های پروتئینی و خشکبار جهت دریافت بار به صورت امانی
                      (Consignment) با حاشیه سود مصوب.
                    </p>
                    <div className="pt-1 text-xs font-bold text-stone-800 tabular-nums">
                      قیمت تسویه فروشگاه: {formatToman(product.baseRetailerPrice)} (حاشیه سود ۱۵٪)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePathway('b2b_onboarding')}
                    className="w-full py-3 rounded-xl bg-stone-900 text-white hover:bg-stone-800 font-bold text-xs shadow-xs transition"
                  >
                    ثبت درخواست همکاری فروشگاهی ←
                  </button>
                </div>
              </div>

              {/* Specifications & Quality Guarantee */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <div className="text-[11px] text-stone-500">خاستگاه محصول</div>
                  <div className="text-xs font-bold text-stone-900 mt-0.5">حاجی‌آباد هرمزگان</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <div className="text-[11px] text-stone-500">وزن خالص و بسته‌بندی</div>
                  <div className="text-xs font-bold text-stone-900 mt-0.5">۶۰۰ گرم کریستالی</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <div className="text-[11px] text-stone-500">شرایط نگهداری</div>
                  <div className="text-xs font-bold text-stone-900 mt-0.5">جای خشک و خنک (۴ تا ۱۵ درجه)</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70">
                  <div className="text-[11px] text-stone-500">ارسال رایگان</div>
                  <div className="text-xs font-bold text-emerald-800 mt-0.5 tabular-nums">
                    خرید بالای {formatToman(state.settings.freeShippingThreshold)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Direct B2C Guest Checkout & Simulated Payment Gateway (Parts 29 & 30) */}
      {activePathway === 'b2c_checkout' && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs max-w-3xl mx-auto">
          {completedOrder ? (
            <div className="space-y-4 text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-stone-900">
                سفارش شما ثبت شد (پرداخت آزمایشی)
              </h2>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                درگاه پرداخت این نسخه شبیه‌سازی است و پولی دریافت نشده است. شمارهٔ سفارش و موبایل خود را برای
                پیگیری نگه دارید.
              </p>
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 max-w-md mx-auto text-right text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">شماره سفارش:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {completedOrder.orderNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">خریدار:</span>
                  <span className="font-bold">{completedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">تعداد بسته:</span>
                  <span className="tabular-nums font-bold">
                    {formatPersianNumber(completedOrder.quantity)} بسته ۶۰۰ گرمی
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">مبلغ کل پرداخت‌شده:</span>
                  <span className="tabular-nums font-extrabold text-emerald-800">
                    {formatToman(completedOrder.totalPayable)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">پرداخت:</span>
                  <span className="font-semibold text-amber-800">آزمایشی (شبیه‌سازی‌شده) - {completedOrder.simulatedPaymentRef}</span>
                </div>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTrackNumber(completedOrder.orderNumber);
                    setTrackMobile(customerMobile);
                    setCompletedOrder(null);
                    setActivePathway('track_order');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold"
                >
                  مشاهده وضعیت ارسال سفارش
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold"
                >
                  ثبت سفارش جدید
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleB2cCheckout} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-stone-900">
                    ۱. خرید مستقیم برای مصرف شخصی (تحویل درب منزل)
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    ثبت سریع سفارش بدون نیاز به عضویت — موجودی فعلی انبار مرکزی:{' '}
                    <strong className="tabular-nums">{formatPersianNumber(inv.warehouseStock)} بسته</strong>
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                  درگاه پرداخت آزمایشی (Simulated Gateway)
                </span>
              </div>

              {checkoutError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {checkoutError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    نام و نام خانوادگی تحویل‌گیرنده *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="مثال: سارا محمدی"
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    شماره موبایل (۱۱ رقم با 09) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="09123456789"
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">استان و شهر *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="استان"
                      className="w-full border border-stone-300 rounded-xl px-3 py-2.5"
                    />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="شهر"
                      className="w-full border border-stone-300 rounded-xl px-3 py-2.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    کد پستی ۱۰ رقمی (بدون خط تیره) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="1456789123"
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">نشانی دقیق پستی *</label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="خیابان، کوچه، پلاک، واحد..."
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    تعداد بسته ۶۰۰ گرمی درخواستی:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={inv.warehouseStock || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 tabular-nums font-bold"
                  />
                </div>
              </div>

              {/* Order Cost Breakdown */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-600">
                    مبلغ کالا ({formatPersianNumber(quantity)} بسته × {formatToman(unitPrice)}):
                  </span>
                  <span className="font-bold tabular-nums">{formatToman(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">هزینه بسته‌بندی و ارسال پستی:</span>
                  <span className="font-bold tabular-nums text-emerald-700">
                    {shippingFee === 0 ? 'رایگان' : formatToman(shippingFee)}
                  </span>
                </div>
                <div className="border-t border-stone-200 pt-2 flex justify-between text-sm font-extrabold text-stone-900">
                  <span>مبلغ نهایی قابل پرداخت:</span>
                  <span className="tabular-nums text-amber-900">{formatToman(totalPayable)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-amber-800 text-white hover:bg-amber-900 font-extrabold text-sm shadow-xs transition"
              >
                پرداخت آنلاین آزمایشی و ثبت قطعی سفارش ({formatToman(totalPayable)})
              </button>
            </form>
          )}
        </div>
      )}

      {/* View 3: B2B Store Partnership Request Form (Part 32 Pathway 2) */}
      {activePathway === 'b2b_onboarding' && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-stone-200 pb-4">
            <h2 className="text-lg font-extrabold text-stone-900">
              ۲. فرم درخواست همکاری و دریافت بار امانی ویژه فروشگاه‌ها و سوپرمارکت‌ها
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              پس از ثبت اطلاعات فروشگاه شما، بازاریاب منطقه جهت تحویل نمونه و پارت اول امانی هماهنگی
              خواهد کرد.
            </p>
          </div>

          {b2bSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
              {b2bSuccessMsg}
            </div>
          )}
          {b2bError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              {b2bError}
            </div>
          )}

          <form onSubmit={handleB2bSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">نام فروشگاه / سوپرمارکت *</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="مثال: هایپرمارکت نگین نیاوران"
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">نام مسئول / مالک فروشگاه *</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="مثال: آقای حمیدرضا کمالی"
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">شماره موبایل هماهنگی *</label>
                <input
                  type="tel"
                  required
                  value={storeMobile}
                  onChange={(e) => setStoreMobile(e.target.value)}
                  placeholder="09121112233"
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 tabular-nums"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">محله / منطقه فعالیت *</label>
                <input
                  type="text"
                  required
                  value={storeDistrict}
                  onChange={(e) => setStoreDistrict(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">استان *</label>
                <input type="text" required value={storeProvince} onChange={(e) => setStoreProvince(e.target.value)} className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5" />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">شهر *</label>
                <input type="text" required value={storeCity} onChange={(e) => setStoreCity(e.target.value)} className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-stone-700 mb-1">نشانی کامل فروشگاه *</label>
                <input
                  type="text"
                  required
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="نشانی دقیق فروشگاه جهت مراجعه بازاریاب..."
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-stone-900 text-white hover:bg-stone-800 font-extrabold text-sm transition"
            >
              ثبت درخواست همکاری فروشگاهی (B2B)
            </button>
          </form>
        </div>
      )}

      {/* View 4: Customer Order Tracking (order number + the mobile used for the order) */}
      {activePathway === 'track_order' && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-5 max-w-3xl mx-auto">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">پیگیری سفارش آنلاین</h2>
            <p className="text-xs text-stone-500">شمارهٔ سفارش و موبایلی که با آن سفارش داده‌اید را وارد کنید.</p>
          </div>
          <form onSubmit={handleTrack} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <input required value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} placeholder="شمارهٔ سفارش" className="border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono" dir="ltr" />
            <input required value={trackMobile} onChange={(e) => setTrackMobile(e.target.value)} placeholder="موبایل (09...)" className="border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono" dir="ltr" />
            <button type="submit" className="rounded-xl bg-stone-900 text-white text-xs font-bold px-4 py-2.5">پیگیری</button>
          </form>
          {trackError && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold px-3 py-2">{trackError}</div>}
          {tracked && (
            <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-stone-900">{tracked.orderNumber}</span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  {tracked.orderStatus === 'delivered' ? 'تحویل‌شده به مشتری' : tracked.orderStatus === 'shipped' ? 'تحویل پست / پیک شده' : 'ثبت‌شده — در حال آماده‌سازی'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-stone-200/80">
                <span className="tabular-nums font-bold">{formatPersianNumber(tracked.quantity)} بسته | {formatToman(tracked.totalPayable)}</span>
                <span className="font-mono text-stone-500">{tracked.trackingCode ? `رهگیری: ${tracked.trackingCode}` : 'کد رهگیری پس از ارسال درج می‌شود'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
