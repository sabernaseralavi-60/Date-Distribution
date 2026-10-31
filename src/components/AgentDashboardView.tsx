import React, { useState } from 'react';
import {
  Package,
  Store,
  Wallet,
  Award,
  MapPin,
  FileText,
  PlusCircle,
  ArrowUpRight,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Share2,
  Eye,
} from 'lucide-react';
import { SaberCommerceState, OfficialDocument, VisitOutcome } from '../core/types.ts';
import {
  computeInventorySummary,
  computeFinancialSummary,
  getScopedStateForRole,
  createAgentToRetailerDeliveryDraft,
  submitAndVerifyRetailerSalesReport,
  submitRetailerPayment,
  submitAndVerifyAgentRemittance,
  recordFieldVisit,
  recordAgentReturnToWarehouse,
} from '../core/engineClient.ts';
import { formatPersianNumber, formatToman, toJalaliDateString } from '../core/formatters.ts';

interface AgentDashboardViewProps {
  state: SaberCommerceState;
  activeAgentId: string;
  onSelectAgentId: (id: string) => void;
  onUpdateState: (nextState: SaberCommerceState, message?: string) => void;
  onInspectDocument: (doc: OfficialDocument) => void;
  onOpenReferralPreview: (agentCode: string) => void;
}

export const AgentDashboardView: React.FC<AgentDashboardViewProps> = ({
  state,
  activeAgentId,
  onSelectAgentId,
  onUpdateState,
  onInspectDocument,
  onOpenReferralPreview,
}) => {
  const scoped = getScopedStateForRole(state, 'agent', activeAgentId);
  const currentAgent = state.agents.find((a) => a.id === activeAgentId) || state.agents[0];
  const inv = computeInventorySummary(state);
  const fin = computeFinancialSummary(state);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'visit_plan' | 'retailers' | 'custody' | 'commissions' | 'actions'
  >('overview');
  const [selectedActionModal, setSelectedActionModal] = useState<
    'visit' | 'delivery' | 'sales_report' | 'collection' | 'remittance' | 'return' | null
  >(null);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>(
    scoped.retailers[0]?.id || ''
  );
  const [quantityInput, setQuantityInput] = useState<number>(3);
  const [amountInput, setAmountInput] = useState<number>(400000);
  const [referenceInput, setReferenceInput] = useState<string>('');
  const [visitOutcome, setVisitOutcome] = useState<VisitOutcome>('stock_low');
  const [restockNeededInput, setRestockNeededInput] = useState<number>(5);
  const [notesInput, setNotesInput] = useState<string>('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Scoped KPIs for this specific Agent (Part 35)
  const agentDeliveriesFromWarehouse = state.inventoryTransactions
    .filter((t) => t.movementType === 'warehouse_to_agent' && t.toLocationId === currentAgent.id)
    .reduce((s, t) => s + t.quantity, 0);

  const agentDeliveredToRetailers = state.inventoryTransactions
    .filter((t) => t.movementType === 'agent_to_retailer' && t.fromLocationId === currentAgent.id)
    .reduce((s, t) => s + t.quantity, 0);

  const agentCurrentCustody = inv.agentCustodyByAgent[currentAgent.id] ?? 0;

  const myRetailerCustodyTotal = scoped.retailers.reduce(
    (s, r) => s + (inv.retailerCustodyByRetailer[r.id] ?? 0),
    0
  );

  const myRetailerSoldTotal = scoped.salesReports
    .filter((sr) => sr.status === 'verified_by_admin' || sr.status === 'confirmed_by_retailer')
    .reduce((s, sr) => s + sr.reportedSoldQuantity, 0);

  const myOutstandingReceivables = scoped.invoices
    .filter((i) => i.status !== 'reversed')
    .reduce((s, i) => s + i.remainingAmount, 0);

  const myVerifiedCollections = scoped.payments
    .filter((p) => p.status === 'verified')
    .reduce((s, p) => s + p.amount, 0);

  const myCashStatus = fin.agentCashByAgent[currentAgent.id] ?? {
    collected: 0,
    remitted: 0,
    held: 0,
  };

  const myTotalCommissionEarned = scoped.commissions
    .filter((c) => c.status !== 'cancelled' && c.status !== 'reversed')
    .reduce((s, c) => s + c.commissionAmount, 0);

  const myCommissionPaid = scoped.commissions.reduce((s, c) => s + c.paidAmount, 0);
  const myCommissionRemaining = scoped.commissions.reduce((s, c) => s + c.remainingPayable, 0);

  // Prioritized Visit List (High / Medium / Low)
  const prioritizedRetailers = scoped.retailers
    .map((rt) => {
      const currentStock = inv.retailerCustodyByRetailer[rt.id] ?? 0;
      const openDebt = scoped.invoices
        .filter((i) => i.retailerId === rt.id && i.status !== 'reversed')
        .reduce((s, i) => s + i.remainingAmount, 0);
      const isOverdue = scoped.invoices.some(
        (i) => i.retailerId === rt.id && i.isOverdue && i.remainingAmount > 0
      );
      const hasOpenRestock = scoped.restockRequests.some(
        (req) => req.retailerId === rt.id && req.status !== 'delivered' && req.status !== 'rejected'
      );

      let priority: 'high' | 'medium' | 'low' = 'low';
      let reason = 'وضعیت پایدار — بازدید دوره‌ای منظم';
      if (isOverdue || currentStock <= 2 || hasOpenRestock) {
        priority = 'high';
        reason = isOverdue
          ? 'مطالبه سررسیدگذشته + نیاز پیگیری فوری تسویه'
          : currentStock <= 2
          ? `موجودی رو به اتمام (${formatPersianNumber(currentStock)} بسته) — شارژ فوری`
          : 'درخواست شارژ مجدد ثبت‌شده';
      } else if (openDebt > 0 || currentStock <= 4) {
        priority = 'medium';
        reason =
          openDebt > 0
            ? `مانده حساب باز (${formatToman(openDebt)})`
            : `موجودی متوسط (${formatPersianNumber(currentStock)} بسته)`;
      }

      return {
        retailer: rt,
        currentStock,
        openDebt,
        isOverdue,
        priority,
        reason,
      };
    })
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority];
    });

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    const targetRetailerId = selectedRetailerId || scoped.retailers[0]?.id;
    const product = state.products[0];

    try {
      if (selectedActionModal === 'delivery') {
        const { nextState, createdDocument } = createAgentToRetailerDeliveryDraft(state, {
          agentId: currentAgent.id,
          retailerId: targetRetailerId,
          productId: product.id,
          quantity: quantityInput,
          notes: notesInput || `تحویل میدانی توسط ${currentAgent.fullName}`,
        });
        onUpdateState(
          nextState,
          `پیش‌نویس رسید تحویل به فروشگاه (${createdDocument.documentNumber}) صادر شد. اکنون قابل چاپ و بارگذاری امضا است.`
        );
        setSelectedActionModal(null);
        onInspectDocument(createdDocument);
      } else if (selectedActionModal === 'sales_report') {
        const nextState = submitAndVerifyRetailerSalesReport(state, {
          retailerId: targetRetailerId,
          productId: product.id,
          reportedSoldQuantity: quantityInput,
          autoVerify: true,
          notes: notesInput || `ثبت گزارش فروش در بازدید میدانی توسط ${currentAgent.fullName}`,
        });
        onUpdateState(
          nextState,
          `گزارش فروش ${formatPersianNumber(quantityInput)} بسته ثبت و صورتحساب تسویه ایجاد شد.`
        );
        setSelectedActionModal(null);
      } else if (selectedActionModal === 'collection') {
        const nextState = submitRetailerPayment(state, {
          retailerId: targetRetailerId,
          amount: amountInput,
          method: 'cash_to_agent',
          referenceNumber: referenceInput || `CASH-${Date.now().toString().slice(-5)}`,
          collectingAgentId: currentAgent.id,
          collectedByAgentDirectly: true,
          autoVerify: true,
          notes: notesInput || `دریافت وجه در محل فروشگاه توسط ${currentAgent.fullName}`,
        });
        onUpdateState(
          nextState,
          `دریافت وجه به مبلغ ${formatToman(amountInput)} ثبت، پورسانت محاسبه و به مانده نزد بازاریاب افزوده شد.`
        );
        setSelectedActionModal(null);
      } else if (selectedActionModal === 'remittance') {
        const nextState = submitAndVerifyAgentRemittance(state, {
          agentId: currentAgent.id,
          remittedAmount: amountInput,
          transferReference: referenceInput || `SHABA-${Date.now().toString().slice(-6)}`,
          notes: notesInput || `واریز وجوه وصولی ${currentAgent.fullName} به حساب مدیریت`,
        });
        onUpdateState(
          nextState,
          `تسویه و واریز وجه نزد بازاریاب به مبلغ ${formatToman(amountInput)} با موفقیت ثبت شد.`
        );
        setSelectedActionModal(null);
      } else if (selectedActionModal === 'visit') {
        const currentStock = inv.retailerCustodyByRetailer[targetRetailerId] ?? 0;
        const nextState = recordFieldVisit(state, {
          agentId: currentAgent.id,
          retailerId: targetRetailerId,
          observedStock: currentStock,
          retailerReportedSales: quantityInput,
          paymentFollowupStatus: notesInput || 'پیگیری تسویه دوره‌ای انجام شد',
          restockingNeededCount: restockNeededInput,
          outcome: visitOutcome,
          nextVisitDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          notes: notesInput,
        });
        onUpdateState(nextState, 'گزارش بازدید میدانی و وضعیت شارژ فروشگاه ثبت شد.');
        setSelectedActionModal(null);
      } else if (selectedActionModal === 'return') {
        const nextState = recordAgentReturnToWarehouse(state, {
          agentId: currentAgent.id,
          productId: product.id,
          quantityReturned: quantityInput,
          condition: 'healthy',
          reason: notesInput || 'برگشت مازاد موجودی امانی بازاریاب به انبار مرکزی',
        });
        onUpdateState(
          nextState,
          `رسید برگشت ${formatPersianNumber(quantityInput)} بسته از بازاریاب به انبار مرکزی ثبت شد.`
        );
        setSelectedActionModal(null);
      }
    } catch (err: any) {
      setFeedbackError(err?.message || 'خطا در ثبت عملیات میدانی');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Agent Selector & Field Status Banner */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="px-3 h-12 min-w-[3.75rem] rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center font-mono font-bold text-sm whitespace-nowrap shrink-0">
            {currentAgent.code}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">
                پنل میدانی بازاریاب: {currentAgent.fullName}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                نرخ پورسانت وصول: {formatPersianNumber(currentAgent.commissionRatePercent)}٪
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              موبایل: <span className="tabular-nums font-medium">{currentAgent.mobile}</span> | محدوده فعالیت:{' '}
              {currentAgent.address} | دسترسی محدود به{' '}
              {formatPersianNumber(scoped.retailers.length)} فروشگاه تحت پوشش
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={() => onOpenReferralPreview(currentAgent.code)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            لینک اختصاصی معرفی (/ref/{currentAgent.code})
          </button>
        </div>
      </div>

      {/* Quick Mobile-First Action Buttons (Part 35) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setSelectedRetailerId(scoped.retailers[0]?.id || '');
            setQuantityInput(3);
            setFeedbackError(null);
            setSelectedActionModal('visit');
          }}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-800 text-white hover:bg-amber-900 text-xs font-semibold shadow-xs transition"
        >
          <MapPin className="w-4 h-4 shrink-0" />
          ثبت بازدید میدانی
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRetailerId(scoped.retailers[0]?.id || '');
            setQuantityInput(2);
            setFeedbackError(null);
            setSelectedActionModal('delivery');
          }}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-400 text-stone-800 text-xs font-semibold transition"
        >
          <Package className="w-4 h-4 text-amber-700 shrink-0" />
          تحویل به فروشگاه
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRetailerId(scoped.retailers[0]?.id || '');
            setQuantityInput(2);
            setFeedbackError(null);
            setSelectedActionModal('sales_report');
          }}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-400 text-stone-800 text-xs font-semibold transition"
        >
          <ClipboardCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          ثبت گزارش فروش
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedRetailerId(scoped.retailers[0]?.id || '');
            setAmountInput(400000);
            setFeedbackError(null);
            setSelectedActionModal('collection');
          }}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-400 text-stone-800 text-xs font-semibold transition"
        >
          <Wallet className="w-4 h-4 text-teal-700 shrink-0" />
          دریافت وجه از فروشگاه
        </button>

        <button
          type="button"
          onClick={() => {
            setAmountInput(myCashStatus.held || 200000);
            setFeedbackError(null);
            setSelectedActionModal('remittance');
          }}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-400 text-stone-800 text-xs font-semibold transition"
        >
          <ArrowUpRight className="w-4 h-4 text-indigo-700 shrink-0" />
          تحویل وجه به مدیریت
        </button>

        <button
          type="button"
          onClick={() => {
            setQuantityInput(1);
            setFeedbackError(null);
            setSelectedActionModal('return');
          }}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-stone-200 hover:border-amber-400 text-stone-800 text-xs font-semibold transition"
        >
          <RotateCcw className="w-4 h-4 text-rose-700 shrink-0" />
          برگشت کالا به انبار
        </button>
      </div>

      {/* 12 Scoped KPI Cards (Part 35) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4">
          <div className="text-xs text-stone-500">تحویل‌گرفته از انبار</div>
          <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">
            {formatPersianNumber(agentDeliveriesFromWarehouse)} <span className="text-xs font-normal">بسته</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            تحویل به فروشگاه‌ها: {formatPersianNumber(agentDeliveredToRetailers)} بسته
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
          <div className="text-xs text-amber-900 font-medium">موجودی امانی نزد بازاریاب</div>
          <div className="text-xl font-bold text-amber-950 mt-1 tabular-nums">
            {formatPersianNumber(agentCurrentCustody)} <span className="text-xs font-normal">بسته</span>
          </div>
          <div className="text-[11px] text-amber-800 mt-1">
            ارزش پایه: {formatToman(agentCurrentCustody * (state.products[0]?.baseRetailerPrice || 200000))}
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4">
          <div className="text-xs text-stone-500">موجودی نزد فروشگاه‌های من</div>
          <div className="text-xl font-bold text-stone-900 mt-1 tabular-nums">
            {formatPersianNumber(myRetailerCustodyTotal)} <span className="text-xs font-normal">بسته</span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            فروش ثبت‌شده: {formatPersianNumber(myRetailerSoldTotal)} بسته
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4">
          <div className="text-xs text-stone-500">مطالبات باز فروشگاه‌های من</div>
          <div className="text-lg font-bold text-rose-700 mt-1 tabular-nums">
            {formatToman(myOutstandingReceivables)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            وصول تاییدشده: {formatToman(myVerifiedCollections)}
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-4">
          <div className="text-xs text-stone-500">وجه نقد نزد بازاریاب</div>
          <div className="text-lg font-bold text-amber-800 mt-1 tabular-nums">
            {formatToman(myCashStatus.held)}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            تحویل به مدیریت: {formatToman(myCashStatus.remitted)}
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
          <div className="text-xs text-emerald-900 font-medium">پورسانت قطعی‌شده من</div>
          <div className="text-lg font-bold text-emerald-950 mt-1 tabular-nums">
            {formatToman(myTotalCommissionEarned)}
          </div>
          <div className="text-[11px] text-emerald-800 mt-1">
            پرداخت‌شده: {formatToman(myCommissionPaid)} | مانده: {formatToman(myCommissionRemaining)}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        {[
          { id: 'overview', label: 'فهرست اولویت‌بندی بازدید روزانه' },
          { id: 'retailers', label: `فروشگاه‌های تحت پوشش (${formatPersianNumber(scoped.retailers.length)})` },
          { id: 'custody', label: 'کاردکس تحویل، امانت و اسناد امضایی' },
          { id: 'commissions', label: 'ریز کارکرد پورسانت و وجوه نقدی' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === t.id
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Prioritized Visit List */}
      {activeTab === 'overview' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                فهرست هوشمند اولویت بازدید میدانی ({currentAgent.fullName})
              </h2>
              <p className="text-xs text-stone-500">
                مرتب‌شده بر اساس سررسید بدهی، افت موجودی امانی زیر حد هشدار و درخواست‌های شارژ مجدد
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prioritizedRetailers.map(({ retailer, currentStock, openDebt, priority, reason }) => (
              <div
                key={retailer.id}
                className="border border-stone-200 rounded-2xl p-4 flex flex-col justify-between gap-3 bg-stone-50/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-stone-500">
                        {retailer.code}
                      </span>
                      <h3 className="text-sm font-bold text-stone-900">{retailer.storeName}</h3>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">
                      مسئول: {retailer.ownerName} | تلفن:{' '}
                      <span className="tabular-nums">{retailer.mobile}</span>
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      منطقه: {retailer.district} — {retailer.address}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                      priority === 'high'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : priority === 'medium'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {priority === 'high'
                      ? 'اولویت بالا'
                      : priority === 'medium'
                      ? 'اولویت متوسط'
                      : 'اولویت عادی'}
                  </span>
                </div>

                <div className="bg-white border border-stone-200/70 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[11px] text-stone-500">موجودی امانی فعلی</div>
                    <div className="text-sm font-bold text-stone-900 tabular-nums mt-0.5">
                      {formatPersianNumber(currentStock)} بسته
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-500">بدهی باز تسویه‌نشده</div>
                    <div className="text-sm font-bold text-rose-700 tabular-nums mt-0.5">
                      {formatToman(openDebt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-500">موعد تسویه بعدی</div>
                    <div className="text-xs font-semibold text-stone-800 tabular-nums mt-1">
                      {toJalaliDateString(retailer.nextSettlementDate)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-stone-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    {reason}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRetailerId(retailer.id);
                        setQuantityInput(2);
                        setSelectedActionModal('visit');
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-800 text-white hover:bg-amber-900 transition"
                    >
                      ثبت بازدید
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRetailerId(retailer.id);
                        setQuantityInput(3);
                        setSelectedActionModal('delivery');
                      }}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-stone-200 text-stone-800 hover:bg-stone-300 transition"
                    >
                      تحویل کالا
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Assigned Retailers Table */}
      {activeTab === 'retailers' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs overflow-x-auto">
          <h2 className="text-base font-bold text-stone-900 mb-3">
            وضعیت تفصیلی فروشگاه‌های اختصاص‌یافته به {currentAgent.fullName}
          </h2>
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 bg-stone-50">
                <th className="py-3 px-3">کد</th>
                <th className="py-3 px-3">نام فروشگاه</th>
                <th className="py-3 px-3">مسئول / موبایل</th>
                <th className="py-3 px-3">تحویل‌شده</th>
                <th className="py-3 px-3">فروش تاییدشده</th>
                <th className="py-3 px-3">موجودی امانی فعلی</th>
                <th className="py-3 px-3">کل مطالبات ایجادشده</th>
                <th className="py-3 px-3">مانده بدهی باز</th>
                <th className="py-3 px-3">عملیات سریع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {scoped.retailers.map((rt) => {
                const delivered = scoped.consignmentDeliveries
                  .filter((d) => d.retailerId === rt.id && d.status === 'verified')
                  .reduce((s, d) => s + d.quantityDelivered, 0);
                const sold = scoped.salesReports
                  .filter(
                    (sr) =>
                      sr.retailerId === rt.id &&
                      (sr.status === 'verified_by_admin' || sr.status === 'confirmed_by_retailer')
                  )
                  .reduce((s, sr) => s + sr.reportedSoldQuantity, 0);
                const custody = inv.retailerCustodyByRetailer[rt.id] ?? 0;
                const totalBilled = scoped.invoices
                  .filter((i) => i.retailerId === rt.id && i.status !== 'reversed')
                  .reduce((s, i) => s + i.totalAmount, 0);
                const remaining = scoped.invoices
                  .filter((i) => i.retailerId === rt.id && i.status !== 'reversed')
                  .reduce((s, i) => s + i.remainingAmount, 0);

                return (
                  <tr key={rt.id} className="hover:bg-stone-50/80">
                    <td className="py-3 px-3 font-mono font-bold">{rt.code}</td>
                    <td className="py-3 px-3 font-bold text-stone-900">{rt.storeName}</td>
                    <td className="py-3 px-3">
                      {rt.ownerName}
                      <div className="text-stone-400 tabular-nums">{rt.mobile}</div>
                    </td>
                    <td className="py-3 px-3 tabular-nums font-semibold">
                      {formatPersianNumber(delivered)} بسته
                    </td>
                    <td className="py-3 px-3 tabular-nums text-emerald-700 font-semibold">
                      {formatPersianNumber(sold)} بسته
                    </td>
                    <td className="py-3 px-3 tabular-nums font-bold text-amber-900">
                      {formatPersianNumber(custody)} بسته
                    </td>
                    <td className="py-3 px-3 tabular-nums">{formatToman(totalBilled)}</td>
                    <td className="py-3 px-3 tabular-nums font-bold text-rose-700">
                      {formatToman(remaining)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRetailerId(rt.id);
                            setQuantityInput(2);
                            setSelectedActionModal('sales_report');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-semibold"
                        >
                          ثبت فروش
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRetailerId(rt.id);
                            setAmountInput(remaining || 400000);
                            setSelectedActionModal('collection');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-semibold"
                        >
                          وصول وجه
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Custody & Signed Documents */}
      {activeTab === 'custody' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-stone-900">
              اسناد رسمی تحویل امانی و رسیدهای امضایی مرتبط با {currentAgent.fullName}
            </h2>
          </div>
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 bg-stone-50">
                <th className="py-3 px-3">شماره سند</th>
                <th className="py-3 px-3">عنوان سند</th>
                <th className="py-3 px-3">تعداد</th>
                <th className="py-3 px-3">ارزش پایه مرجع</th>
                <th className="py-3 px-3">وضعیت تأیید و امضا</th>
                <th className="py-3 px-3">چاپ / بارگذاری تصویر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {scoped.documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-stone-50/80">
                  <td className="py-3 px-3 font-mono font-bold text-stone-800">
                    {doc.documentNumber}
                  </td>
                  <td className="py-3 px-3 font-medium text-stone-900">{doc.title}</td>
                  <td className="py-3 px-3 tabular-nums font-bold">
                    {formatPersianNumber(doc.quantity)} بسته
                  </td>
                  <td className="py-3 px-3 tabular-nums">{formatToman(doc.totalReferenceValue)}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                        doc.verificationStatus === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : doc.verificationStatus === 'uploaded'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {doc.verificationStatus === 'verified'
                        ? 'تأیید نهایی شده'
                        : doc.verificationStatus === 'uploaded'
                        ? 'تصویر بارگذاری‌شده — در انتظار تایید'
                        : 'در انتظار امضا و بارگذاری'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onInspectDocument(doc)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      مشاهده و چاپ A4
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Commissions & Cash Held Ledger */}
      {activeTab === 'commissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs overflow-x-auto">
            <h3 className="text-sm font-bold text-stone-900 mb-3">
              ریز رکوردهای پورسانت (محاسبه‌شده صرفاً پس از تأیید وصول وجه)
            </h3>
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 bg-stone-50">
                  <th className="py-2.5 px-2">کد پورسانت</th>
                  <th className="py-2.5 px-2">مبلغ وصول مبنا</th>
                  <th className="py-2.5 px-2">نرخ</th>
                  <th className="py-2.5 px-2">پورسانت</th>
                  <th className="py-2.5 px-2">مانده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {scoped.commissions.map((cm) => (
                  <tr key={cm.id}>
                    <td className="py-2.5 px-2 font-mono font-bold">{cm.commissionNumber}</td>
                    <td className="py-2.5 px-2 tabular-nums">{formatToman(cm.baseBasisAmount)}</td>
                    <td className="py-2.5 px-2 tabular-nums">
                      {formatPersianNumber(cm.ratePercentSnapshot)}٪
                    </td>
                    <td className="py-2.5 px-2 tabular-nums font-bold text-emerald-800">
                      {formatToman(cm.commissionAmount)}
                    </td>
                    <td className="py-2.5 px-2 tabular-nums font-semibold text-amber-800">
                      {formatToman(cm.remainingPayable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs overflow-x-auto">
            <h3 className="text-sm font-bold text-stone-900 mb-3">
              گردش وجوه دریافتی توسط بازاریاب و تسویه با مدیریت
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-200 text-center">
              <div>
                <div className="text-[11px] text-stone-500">جمع دریافت از فروشگاه‌ها</div>
                <div className="text-xs font-bold tabular-nums mt-0.5">
                  {formatToman(myCashStatus.collected)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-stone-500">تحویل به حساب مدیریت</div>
                <div className="text-xs font-bold text-emerald-700 tabular-nums mt-0.5">
                  {formatToman(myCashStatus.remitted)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-stone-500">مانده نقد نزد بازاریاب</div>
                <div className="text-xs font-bold text-rose-700 tabular-nums mt-0.5">
                  {formatToman(myCashStatus.held)}
                </div>
              </div>
            </div>
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 bg-stone-50">
                  <th className="py-2 px-2">شماره رسید</th>
                  <th className="py-2 px-2">مبلغ</th>
                  <th className="py-2 px-2">وضعیت</th>
                  <th className="py-2 px-2">توضیحات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {scoped.agentCashCollections.map((col) => (
                  <tr key={col.id}>
                    <td className="py-2 px-2 font-mono">{col.receiptNumber}</td>
                    <td className="py-2 px-2 tabular-nums font-bold">{formatToman(col.amount)}</td>
                    <td className="py-2 px-2">دریافت از فروشگاه</td>
                    <td className="py-2 px-2 text-stone-500">{col.notes}</td>
                  </tr>
                ))}
                {scoped.agentRemittances.map((rem) => (
                  <tr key={rem.id} className="bg-emerald-50/40">
                    <td className="py-2 px-2 font-mono">{rem.remittanceNumber}</td>
                    <td className="py-2 px-2 tabular-nums font-bold text-emerald-800">
                      {formatToman(rem.remittedAmount)}
                    </td>
                    <td className="py-2 px-2 text-emerald-800 font-semibold">واریز به مدیریت</td>
                    <td className="py-2 px-2 text-stone-500">{rem.transferReference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Field Action Modal */}
      {selectedActionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {selectedActionModal === 'visit' && 'ثبت گزارش بازدید میدانی (فرم ۱۰)'}
                {selectedActionModal === 'delivery' && 'صدور رسید تحویل امانی به فروشگاه (فرم ۲)'}
                {selectedActionModal === 'sales_report' && 'ثبت گزارش فروش امانی فروشگاه (فرم ۵)'}
                {selectedActionModal === 'collection' && 'ثبت دریافت وجه از فروشگاه در محل (فرم ۷)'}
                {selectedActionModal === 'remittance' && 'ثبت تحویل وجه وصولی به مدیریت (فرم ۸)'}
                {selectedActionModal === 'return' && 'ثبت برگشت کالا از بازاریاب به انبار (فرم ۳)'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedActionModal(null)}
                className="text-xs text-stone-500 hover:text-stone-800 font-bold"
              >
                بستن ✕
              </button>
            </div>

            {feedbackError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {feedbackError}
              </div>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-4 text-xs">
              {selectedActionModal !== 'remittance' && selectedActionModal !== 'return' && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    انتخاب فروشگاه تحت پوشش:
                  </label>
                  <select
                    value={selectedRetailerId}
                    onChange={(e) => setSelectedRetailerId(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 bg-stone-50 text-stone-900 font-medium"
                  >
                    {scoped.retailers.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.code} — {rt.storeName} (موجودی فعلی:{' '}
                        {formatPersianNumber(inv.retailerCustodyByRetailer[rt.id] ?? 0)} بسته)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(selectedActionModal === 'delivery' ||
                selectedActionModal === 'sales_report' ||
                selectedActionModal === 'return' ||
                selectedActionModal === 'visit') && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {selectedActionModal === 'visit'
                      ? 'فروش مشاهده‌شده از آخرین بازدید (بسته):'
                      : 'تعداد بسته (خرمای پیارم ۶۰۰ گرمی):'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(Number(e.target.value))}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
                  />
                </div>
              )}

              {selectedActionModal === 'visit' && (
                <>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      نتیجه بازدید میدانی:
                    </label>
                    <select
                      value={visitOutcome}
                      onChange={(e) => setVisitOutcome(e.target.value as VisitOutcome)}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 bg-stone-50"
                    >
                      <option value="stock_low">موجودی کم — نیازمند شارژ</option>
                      <option value="stock_sufficient">موجودی کافی</option>
                      <option value="restocking_requested">درخواست شارژ مجدد ثبت شد</option>
                      <option value="payment_followup_required">پیگیری تسویه حساب انجام شد</option>
                      <option value="payment_received">وجه تسویه دریافت شد</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      تعداد درخواستی برای شارژ مجدد (بسته):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={restockNeededInput}
                      onChange={(e) => setRestockNeededInput(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums"
                    />
                  </div>
                </>
              )}

              {(selectedActionModal === 'collection' || selectedActionModal === 'remittance') && (
                <>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      مبلغ (تومان):
                    </label>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={amountInput}
                      onChange={(e) => setAmountInput(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      شماره پیگیری / رسید فیش:
                    </label>
                    <input
                      type="text"
                      value={referenceInput}
                      onChange={(e) => setReferenceInput(e.target.value)}
                      placeholder="مثال: TRK-994812"
                      className="w-full border border-stone-300 rounded-xl px-3 py-2"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">توضیحات تکمیلی:</label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="یادداشت عملیاتی..."
                  className="w-full border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedActionModal(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white hover:bg-amber-900 font-bold"
                >
                  ثبت و اعمال در سیستم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
