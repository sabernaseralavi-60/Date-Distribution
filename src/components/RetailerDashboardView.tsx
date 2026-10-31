import React, { useState } from 'react';
import {
  Store,
  Package,
  CreditCard,
  ClipboardList,
  RefreshCw,
  FileText,
  Calendar,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SaberCommerceState, OfficialDocument } from '../core/types.ts';
import {
  computeInventorySummary,
  getScopedStateForRole,
  submitAndVerifyRetailerSalesReport,
  submitRetailerPayment,
  recordRetailerReturn,
  submitRestockRequest,
} from '../core/engineClient.ts';
import { formatPersianNumber, formatToman, toJalaliDateString } from '../core/formatters.ts';

interface RetailerDashboardViewProps {
  state: SaberCommerceState;
  activeRetailerId: string;
  onSelectRetailerId: (id: string) => void;
  onUpdateState: (nextState: SaberCommerceState, message?: string) => void;
  onInspectDocument: (doc: OfficialDocument) => void;
}

export const RetailerDashboardView: React.FC<RetailerDashboardViewProps> = ({
  state,
  activeRetailerId,
  onSelectRetailerId,
  onUpdateState,
  onInspectDocument,
}) => {
  const scoped = getScopedStateForRole(state, 'retailer', activeRetailerId);
  const currentRetailer =
    state.retailers.find((r) => r.id === activeRetailerId) || state.retailers[0];
  const assignedAgent = state.agents.find((a) => a.id === currentRetailer.agentId);
  const inv = computeInventorySummary(state);
  const product = state.products[0];

  const [activeModal, setActiveModal] = useState<
    'sales_report' | 'payment' | 'restock' | 'return' | null
  >(null);
  const [soldQty, setSoldQty] = useState<number>(2);
  const [physicalStockQty, setPhysicalStockQty] = useState<number>(2);
  const [paymentAmount, setPaymentAmount] = useState<number>(400000);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'pos' | 'cash_to_agent'>(
    'bank_transfer'
  );
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [restockQty, setRestockQty] = useState<number>(10);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scoped metrics for this store only (Part 36)
  const receivedPackages = scoped.consignmentDeliveries
    .filter((d) => d.status === 'verified')
    .reduce((s, d) => s + d.quantityDelivered, 0);

  const soldPackages = scoped.salesReports
    .filter((sr) => sr.status === 'verified_by_admin' || sr.status === 'confirmed_by_retailer')
    .reduce((s, sr) => s + sr.reportedSoldQuantity, 0);

  const currentCustodyStock = inv.retailerCustodyByRetailer[currentRetailer.id] ?? 0;

  const totalPayableGenerated = scoped.invoices
    .filter((i) => i.status !== 'reversed')
    .reduce((s, i) => s + i.totalAmount, 0);

  const totalPaidVerified = scoped.payments
    .filter((p) => p.status === 'verified')
    .reduce((s, p) => s + p.amount, 0);

  const totalPendingPayments = scoped.payments
    .filter((p) => p.status === 'pending')
    .reduce((s, p) => s + p.amount, 0);

  const remainingDebt = scoped.invoices
    .filter((i) => i.status !== 'reversed')
    .reduce((s, i) => s + i.remainingAmount, 0);

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (activeModal === 'sales_report') {
        const nextState = submitAndVerifyRetailerSalesReport(state, {
          retailerId: currentRetailer.id,
          productId: product.id,
          reportedSoldQuantity: soldQty,
          physicalCountedStock: physicalStockQty,
          autoVerify: true,
          notes: notes || `گزارش فروش ثبت‌شده در پنل اختصاصی ${currentRetailer.storeName}`,
        });
        onUpdateState(
          nextState,
          `گزارش فروش ${formatPersianNumber(soldQty)} بسته ثبت شد و مانده موجودی و بدهی شما به‌روزرسانی گردید.`
        );
        setActiveModal(null);
      } else if (activeModal === 'payment') {
        const nextState = submitRetailerPayment(state, {
          retailerId: currentRetailer.id,
          amount: paymentAmount,
          method: paymentMethod,
          referenceNumber: paymentRef || `STORE-PAY-${Date.now().toString().slice(-6)}`,
          collectedByAgentDirectly: paymentMethod === 'cash_to_agent',
          autoVerify: false,
          notes: notes || `ثبت فیش پرداخت توسط ${currentRetailer.storeName}`,
        });
        onUpdateState(
          nextState,
          `اطلاعات پرداخت به مبلغ ${formatToman(paymentAmount)} ثبت شد و جهت تأیید نهایی برای مدیریت ارسال گردید.`
        );
        setActiveModal(null);
      } else if (activeModal === 'restock') {
        const nextState = submitRestockRequest(state, {
          retailerId: currentRetailer.id,
          productId: product.id,
          requestedQuantity: restockQty,
          reason: notes || 'درخواست شارژ مجدد از پنل اختصاصی فروشگاه',
        });
        onUpdateState(
          nextState,
          `درخواست شارژ مجدد (${formatPersianNumber(restockQty)} بسته) ثبت شد.`
        );
        setActiveModal(null);
      } else if (activeModal === 'return') {
        const nextState = recordRetailerReturn(state, {
          retailerId: currentRetailer.id,
          destination: 'agent',
          productId: product.id,
          quantityReturned: soldQty,
          reason: notes || 'مرجوعی ثبت‌شده از پنل فروشگاه',
        });
        onUpdateState(
          nextState,
          `درخواست مرجوعی ${formatPersianNumber(soldQty)} بسته ثبت و از موجودی امانی کسر شد.`
        );
        setActiveModal(null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در ثبت درخواست فروشگاه');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner: پنل اختصاصی فروشگاه */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-300 flex items-center justify-center font-bold text-base shrink-0">
            {currentRetailer.code}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">
                پنل اختصاصی فروشگاه: {currentRetailer.storeName}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                مدل همکاری: امانی (Consignment)
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              مدیریت: {currentRetailer.ownerName} | منطقه: {currentRetailer.district} (
              {currentRetailer.address}) | بازاریاب پشتیبان:{' '}
              <span className="font-semibold text-stone-800">
                {assignedAgent?.fullName} ({assignedAgent?.mobile})
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        </div>
      </div>

      {/* Quick Action Bar for Store Owner (Part 36) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            setSoldQty(1);
            setPhysicalStockQty(Math.max(0, currentCustodyStock - 1));
            setErrorMsg(null);
            setActiveModal('sales_report');
          }}
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-amber-800 text-white hover:bg-amber-900 text-xs font-bold shadow-xs transition"
        >
          <ClipboardList className="w-4 h-4" />
          ثبت فروش و شمارش موجودی
        </button>

        <button
          type="button"
          onClick={() => {
            setPaymentAmount(remainingDebt || 200000);
            setErrorMsg(null);
            setActiveModal('payment');
          }}
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-800 text-white hover:bg-emerald-900 text-xs font-bold shadow-xs transition"
        >
          <CreditCard className="w-4 h-4" />
          ثبت پرداخت / فیش واریزی
        </button>

        <button
          type="button"
          onClick={() => {
            setRestockQty(10);
            setErrorMsg(null);
            setActiveModal('restock');
          }}
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 text-stone-800 text-xs font-bold transition"
        >
          <RefreshCw className="w-4 h-4 text-amber-700" />
          درخواست شارژ مجدد کالا
        </button>

        <button
          type="button"
          onClick={() => {
            setSoldQty(1);
            setErrorMsg(null);
            setActiveModal('return');
          }}
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-rose-400 text-stone-800 text-xs font-bold transition"
        >
          <Package className="w-4 h-4 text-rose-700" />
          ثبت مرجوعی کالا
        </button>
      </div>

      {/* Store Summary Cards (Part 36) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4">
          <div className="text-xs text-stone-500">تحویل‌گرفته امانی</div>
          <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">
            {formatPersianNumber(receivedPackages)} <span className="text-xs font-normal">بسته</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            قیمت تسویه هر بسته: {formatToman(product.baseRetailerPrice)}
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4">
          <div className="text-xs text-stone-500">فروش ثبت‌شده فروشگاه</div>
          <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
            {formatPersianNumber(soldPackages)} <span className="text-xs font-normal">بسته</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            فروش پیشنهادی مصرف‌کننده: {formatToman(product.suggestedRetailPrice)}
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
          <div className="text-xs text-amber-900 font-medium">موجودی امانی فعلی فروشگاه</div>
          <div className="text-xl font-bold text-amber-950 mt-1 tabular-nums">
            {formatPersianNumber(currentCustodyStock)} <span className="text-xs font-normal">بسته</span>
          </div>
          <div className="text-[11px] text-amber-800 mt-1">
            سود خالص هر بسته فروش: {formatToman(product.suggestedRetailPrice - product.baseRetailerPrice)}
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4">
          <div className="text-xs text-stone-500">کل بدهی ایجادشده (فروش‌ها)</div>
          <div className="text-lg font-bold text-stone-900 mt-1 tabular-nums">
            {formatToman(totalPayableGenerated)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            پرداخت تاییدشده: {formatToman(totalPaidVerified)}
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4">
          <div className="text-xs text-rose-900 font-medium">مانده بدهی قابل پرداخت</div>
          <div className="text-lg font-bold text-rose-800 mt-1 tabular-nums">
            {formatToman(remainingDebt)}
          </div>
          {totalPendingPayments > 0 && (
            <div className="text-[11px] text-amber-700 mt-1">
              در انتظار تأیید مدیریت: {formatToman(totalPendingPayments)}
            </div>
          )}
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4">
          <div className="text-xs text-stone-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            موعد تسویه دوره‌ای بعدی
          </div>
          <div className="text-base font-bold text-stone-900 mt-1 tabular-nums">
            {toJalaliDateString(currentRetailer.nextSettlementDate)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            دوره تسویه: هر {formatPersianNumber(currentRetailer.settlementIntervalDays)} روز
          </div>
        </div>
      </div>

      {/* Invoices, Payments & Signed Consignment Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Invoices & Payments History */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-stone-900">
            صورتحساب‌های فروش امانی و سوابق پرداخت فروشگاه
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 bg-stone-50">
                  <th className="py-2.5 px-2">شماره فاکتور</th>
                  <th className="py-2.5 px-2">تعداد فروش</th>
                  <th className="py-2.5 px-2">مبلغ کل</th>
                  <th className="py-2.5 px-2">پرداخت‌شده</th>
                  <th className="py-2.5 px-2">مانده باز</th>
                  <th className="py-2.5 px-2">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {scoped.invoices.map((invItem) => (
                  <tr key={invItem.id}>
                    <td className="py-2.5 px-2 font-mono font-bold">{invItem.invoiceNumber}</td>
                    <td className="py-2.5 px-2 tabular-nums">
                      {formatPersianNumber(invItem.quantity)} بسته
                    </td>
                    <td className="py-2.5 px-2 tabular-nums">{formatToman(invItem.totalAmount)}</td>
                    <td className="py-2.5 px-2 tabular-nums text-emerald-700">
                      {formatToman(invItem.paidAmount)}
                    </td>
                    <td className="py-2.5 px-2 tabular-nums font-bold text-rose-700">
                      {formatToman(invItem.remainingAmount)}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold ${
                          invItem.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800'
                            : invItem.status === 'partially_paid'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {invItem.status === 'paid'
                          ? 'تسویه‌شده'
                          : invItem.status === 'partially_paid'
                          ? 'تسویه جزئی'
                          : 'باز'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <h3 className="text-xs font-bold text-stone-700 mb-2">واریزی‌ها و پرداخت‌های ثبت‌شده:</h3>
            <div className="space-y-2">
              {scoped.payments.map((pay) => (
                <div
                  key={pay.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-stone-800">{pay.paymentNumber}</span>
                    <span className="text-stone-500 mr-2">({pay.referenceNumber})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold tabular-nums">{formatToman(pay.amount)}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        pay.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {pay.status === 'verified' ? 'تأییدشده' : 'در انتظار تأیید مدیریت'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Official Consignment Receipts for Store */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-stone-900">
            رسیدهای رسمی تحویل امانی کالا به فروشگاه (نسخه قابل چاپ A4)
          </h2>
          <div className="space-y-3">
            {scoped.documents.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-800" />
                    <span className="font-mono font-bold text-xs text-stone-900">
                      {doc.documentNumber}
                    </span>
                    <span className="text-xs font-semibold text-stone-800">{doc.title}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    تعداد: <strong className="tabular-nums">{formatPersianNumber(doc.quantity)}</strong> بسته | ارزش پایه تسویه:{' '}
                    <strong className="tabular-nums">{formatToman(doc.totalReferenceValue)}</strong> | تاریخ:{' '}
                    {toJalaliDateString(doc.issueDate)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onInspectDocument(doc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  مشاهده رسید و تعهدنامه
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Store Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {activeModal === 'sales_report' && 'ثبت فروش امانی و شمارش موجودی فروشگاه'}
                {activeModal === 'payment' && 'ثبت فیش پرداخت / تسویه حساب فروشگاه'}
                {activeModal === 'restock' && 'ثبت درخواست شارژ مجدد خرمای پیارم'}
                {activeModal === 'return' && 'ثبت مرجوعی کالا از فروشگاه'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-xs text-stone-500 hover:text-stone-800 font-bold"
              >
                بستن ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="space-y-4 text-xs">
              {activeModal === 'sales_report' && (
                <>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    موجودی امانی فعلی شما در سیستم:{' '}
                    <strong className="tabular-nums">{formatPersianNumber(currentCustodyStock)} بسته</strong>
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      تعداد بسته‌های فروش‌رفته در این دوره:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={currentCustodyStock || 1}
                      value={soldQty}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSoldQty(val);
                        setPhysicalStockQty(Math.max(0, currentCustodyStock - val));
                      }}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      تعداد موجودی فیزیکی شمارش‌شده در قفسه (بسته):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={physicalStockQty}
                      onChange={(e) => setPhysicalStockQty(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
                    />
                  </div>
                </>
              )}

              {activeModal === 'payment' && (
                <>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      مبلغ پرداختی (تومان):
                    </label>
                    <input
                      type="number"
                      min={10000}
                      step={1000}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">روش پرداخت:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 bg-stone-50"
                    >
                      <option value="bank_transfer">کارت به کارت / حواله پایا به حساب مدیریت</option>
                      <option value="pos">کارتخوان (POS)</option>
                      <option value="cash_to_agent">تحویل وجه نقد به بازاریاب پشتیبان</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      شماره پیگیری بانکی / شماره فیش:
                    </label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="مثال: PAYA-778120"
                      className="w-full border border-stone-300 rounded-xl px-3 py-2"
                    />
                  </div>
                </>
              )}

              {activeModal === 'restock' && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    تعداد بسته درخواستی جهت شارژ مجدد:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
                  />
                </div>
              )}

              {activeModal === 'return' && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    تعداد بسته مرجوعی (حداکثر {formatPersianNumber(currentCustodyStock)} بسته):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={currentCustodyStock || 1}
                    value={soldQty}
                    onChange={(e) => setSoldQty(Number(e.target.value))}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">توضیحات:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white hover:bg-amber-900 font-bold"
                >
                  ثبت نهایی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
