import React, { useState } from 'react';
import { SaberCommerceState, OfficialDocument } from '../core/types';
import { computeInventorySummary, computeFinancialSummary } from '../core/engine';
import {
  formatNumberFa,
  formatToman,
  toJalaliDate,
  toPersianDigits,
} from '../core/formatters';
import {
  CheckCircle2,
  Printer,
  Filter,
  ArrowUpLeft,
  FileText,
  CreditCard,
  PackageCheck,
} from 'lucide-react';

interface AdminDashboardViewProps {
  state: SaberCommerceState;
  onOpenDocument: (doc: OfficialDocument) => void;
  onVerifyPayment: (paymentId: string) => void;
  onPayCommission: (commissionId: string, amount: number) => void;
  onNavigateToForms: (initialFormId?: number) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  state,
  onOpenDocument,
  onVerifyPayment,
  onPayCommission,
  onNavigateToForms,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('ALL');
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('ALL');
  const [activeTableTab, setActiveTableTab] = useState<
    'agents_retailers' | 'approvals_payments' | 'documents_movements' | 'b2c_orders'
  >('agents_retailers');

  const inv = computeInventorySummary(
    state,
    selectedProductId === 'ALL' ? undefined : selectedProductId
  );
  const fin = computeFinancialSummary(state);

  const activeAgentsCount = state.agents.filter((a) => a.status === 'active').length;
  const activeRetailersCount = state.retailers.filter((r) => r.status === 'active').length;

  const filteredRetailers = state.retailers.filter((r) => {
    if (selectedAgentId !== 'ALL' && r.agentId !== selectedAgentId) return false;
    if (selectedRetailerId !== 'ALL' && r.id !== selectedRetailerId) return false;
    return true;
  });

  // Compute per-agent performance
  const agentStats = state.agents
    .filter((ag) => selectedAgentId === 'ALL' || ag.id === selectedAgentId)
    .map((ag) => {
      const custody = inv.agentCustodyByAgent[ag.id] ?? 0;
      const myRetailers = state.retailers.filter((r) => r.agentId === ag.id);
      const soldPackages = state.salesReports
        .filter((sr) => sr.agentId === ag.id && sr.status === 'verified_by_admin')
        .reduce((s, sr) => s + sr.reportedSoldQuantity, 0);
      const verifiedCollections = state.payments
        .filter((p) => p.salesAttributionAgentId === ag.id && p.status === 'verified')
        .reduce((s, p) => s + p.amount, 0);
      const outstandingReceivables = state.invoices
        .filter((i) => i.agentId === ag.id && i.status !== 'reversed')
        .reduce((s, i) => s + i.remainingAmount, 0);
      const earnedCommission = state.commissions
        .filter((c) => c.agentId === ag.id && c.status !== 'cancelled')
        .reduce((s, c) => s + c.commissionAmount, 0);
      const unpaidCommission = state.commissions
        .filter((c) => c.agentId === ag.id && c.status !== 'cancelled')
        .reduce((s, c) => s + c.remainingPayable, 0);
      return {
        agent: ag,
        retailersCount: myRetailers.length,
        custody,
        soldPackages,
        verifiedCollections,
        outstandingReceivables,
        earnedCommission,
        unpaidCommission,
      };
    });

  // Compute per-retailer performance
  const retailerStats = filteredRetailers.map((rt) => {
    const stock = inv.retailerCustodyByRetailer[rt.id] ?? 0;
    const sold = state.salesReports
      .filter((sr) => sr.retailerId === rt.id && sr.status === 'verified_by_admin')
      .reduce((s, sr) => s + sr.reportedSoldQuantity, 0);
    const totalInvoiced = state.invoices
      .filter((i) => i.retailerId === rt.id && i.status !== 'reversed')
      .reduce((s, i) => s + i.totalAmount, 0);
    const remainingDebt = state.invoices
      .filter((i) => i.retailerId === rt.id && i.status !== 'reversed')
      .reduce((s, i) => s + i.remainingAmount, 0);
    const agent = state.agents.find((a) => a.id === rt.agentId);
    return {
      retailer: rt,
      agentName: agent?.fullName ?? '—',
      stock,
      sold,
      totalInvoiced,
      remainingDebt,
    };
  });

  const pendingPayments = state.payments.filter((p) => p.status === 'pending');
  const unpaidCommissions = state.commissions.filter((c) => c.remainingPayable > 0);
  const unverifiedDocuments = state.documents.filter((d) => d.verificationStatus !== 'verified');

  // 13 KPI items required by Part 34
  const kpiCards = [
    {
      label: '۱. کل موجودی اولیه و ورودی',
      value: `${formatNumberFa(inv.initialAndInbound)} بسته`,
      sub: `تطبیق تراز انبار: ${inv.isReconciled ? 'تأییدشده (۱۰۰٪ منطبق)' : 'نیازمند بررسی'}`,
    },
    {
      label: '۲. موجودی فعلی انبار مرکزی',
      value: `${formatNumberFa(inv.warehouseStock)} بسته`,
      sub: `حد هشدار موجودی: ${formatNumberFa(state.settings.lowStockWarningThreshold)} بسته`,
    },
    {
      label: '۳. موجودی نزد بازاریاب‌ها (امانی)',
      value: `${formatNumberFa(inv.totalAgentCustody)} بسته`,
      sub: `ارزش مرجع: ${formatToman(inv.totalAgentCustody * (state.products[0]?.baseRetailerPrice ?? 200000))}`,
    },
    {
      label: '۴. موجودی نزد سوپرمارکت‌ها (امانی)',
      value: `${formatNumberFa(inv.totalRetailerCustody)} بسته`,
      sub: `ارزش مرجع: ${formatToman(inv.totalRetailerCustody * (state.products[0]?.baseRetailerPrice ?? 200000))}`,
    },
    {
      label: '۵. فروخته‌شده از طریق سوپرمارکت‌ها',
      value: `${formatNumberFa(inv.soldThroughRetailers)} بسته`,
      sub: `ایجاد مطالبات: ${formatToman(fin.totalB2bReceivablesGenerated)}`,
    },
    {
      label: '۶. فروش مستقیم به مشتریان (B2C)',
      value: `${formatNumberFa(inv.soldDirectB2c)} بسته`,
      sub: `درآمد مستقیم: ${formatToman(fin.totalB2cRevenue)}`,
    },
    {
      label: '۷. مانده مطالبات از فروشگاه‌ها',
      value: formatToman(fin.totalOutstandingReceivables),
      sub: `از کل مطالبات B2B: ${formatToman(fin.totalB2bReceivablesGenerated)}`,
    },
    {
      label: '۸. وجوه وصول‌شده تاییدشده (B2B)',
      value: formatToman(fin.totalVerifiedB2bCollections),
      sub: `در انتظار تأیید: ${formatToman(fin.totalPendingPaymentsAmount)}`,
    },
    {
      label: '۹. مطالبات سررسیدگذشته',
      value: formatToman(fin.totalOverdueReceivables),
      sub: `${formatNumberFa(retailerStats.filter((r) => r.retailer.hasOverdueReceivable && r.remainingDebt > 0).length)} فروشگاه دارای تاخیر تسویه`,
    },
    {
      label: '۱۰. کل پورسانت محاسبه‌شده',
      value: formatToman(fin.totalCommissionCalculated),
      sub: `پرداخت‌شده: ${formatToman(fin.totalCommissionPaid)}`,
    },
    {
      label: '۱۱. پورسانت پرداخت‌نشده',
      value: formatToman(fin.totalCommissionUnpaid),
      sub: `${formatNumberFa(unpaidCommissions.length)} رکورد آماده تسویه با بازاریاب`,
    },
    {
      label: '۱۲. تعداد سوپرمارکت‌های فعال',
      value: `${formatNumberFa(activeRetailersCount)} فروشگاه`,
      sub: `از مجموع ${formatNumberFa(state.retailers.length)} فروشگاه ثبت‌شده`,
    },
    {
      label: '۱۳. تعداد بازاریاب‌های فعال',
      value: `${formatNumberFa(activeAgentsCount)} بازاریاب`,
      sub: `وجه نقد نزد بازاریابان: ${formatToman(fin.totalAgentHeldCash)}`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <p className="text-xs font-medium text-stone-500">
            سامانه یکپارچه پخش مویرگی، امانی و فروش مستقیم · {state.settings.businessName}
          </p>
          <h1 className="text-2xl font-extrabold text-stone-900 mt-1">
            داشبورد مدیریت کسب‌وکار
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <Filter className="w-3.5 h-3.5" />
            <span>فیلترها:</span>
          </div>

          <select
            aria-label="فیلتر محصول"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 focus:border-emerald-800 focus:outline-none"
          >
            <option value="ALL">همه محصولات ({formatNumberFa(state.products.length)})</option>
            {state.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          <select
            aria-label="فیلتر بازاریاب"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 focus:border-emerald-800 focus:outline-none"
          >
            <option value="ALL">همه بازاریاب‌ها ({formatNumberFa(state.agents.length)})</option>
            {state.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName} ({a.code})
              </option>
            ))}
          </select>

          <select
            aria-label="فیلتر فروشگاه"
            value={selectedRetailerId}
            onChange={(e) => setSelectedRetailerId(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 focus:border-emerald-800 focus:outline-none"
          >
            <option value="ALL">همه سوپرمارکت‌ها ({formatNumberFa(state.retailers.length)})</option>
            {state.retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.storeName} ({r.code})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onNavigateToForms(11)}
            className="rounded-lg bg-emerald-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-950 transition-colors whitespace-nowrap shrink-0"
          >
            + صدور حواله تحویل جدید
          </button>
        </div>
      </div>

      {/* 13 Executive KPI Grid — Balanced 6 + 7 Rows */}
      <section aria-label="شاخص‌های کلیدی عملکرد" className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpiCards.slice(0, 6).map((kpi, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-white p-3.5 border border-stone-200 flex flex-col justify-between"
            >
              <div className="text-xs font-medium text-stone-500">{kpi.label}</div>
              <div className="text-lg font-extrabold text-stone-900 tabular-nums mt-1.5">
                {kpi.value}
              </div>
              <div className="text-[11px] text-stone-500 mt-1 tabular-nums">{kpi.sub}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {kpiCards.slice(6).map((kpi, idx) => (
            <div
              key={idx + 6}
              className="rounded-xl bg-white p-3.5 border border-stone-200 flex flex-col justify-between"
            >
              <div className="text-xs font-medium text-stone-500">{kpi.label}</div>
              <div className="text-base font-extrabold text-stone-900 tabular-nums mt-1.5">
                {kpi.value}
              </div>
              <div className="text-[11px] text-stone-500 mt-1 tabular-nums">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Analytical Charts & Inventory/Financial Reconciliation Visuals */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Complete 200-Package Inventory Distribution & Reconciliation */}
        <div className="lg:col-span-7 rounded-xl bg-white p-6 border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  تطبیق و توزیع زنجیره موجودی کالا (از مبدأ انبار تا فروش نهایی)
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  محاسبه آنی بر اساس دفتر کل تراکنش‌های غیرقابل‌تغییر انبار
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-900 tabular-nums">
                مجموع کل: {formatNumberFa(inv.totalAccountedFor)} از{' '}
                {formatNumberFa(inv.initialAndInbound)} بسته
              </div>
            </div>

            {/* Proportional Stacked Bar */}
            <div className="h-7 w-full rounded-lg overflow-hidden flex border border-stone-200 my-4">
              <div
                style={{
                  width: `${(inv.warehouseStock / Math.max(1, inv.initialAndInbound)) * 100}%`,
                }}
                className="bg-emerald-900 h-full transition-all"
                title={`انبار مرکزی: ${inv.warehouseStock} بسته`}
              />
              <div
                style={{
                  width: `${(inv.totalAgentCustody / Math.max(1, inv.initialAndInbound)) * 100}%`,
                }}
                className="bg-amber-700 h-full transition-all"
                title={`نزد بازاریاب‌ها: ${inv.totalAgentCustody} بسته`}
              />
              <div
                style={{
                  width: `${(inv.totalRetailerCustody / Math.max(1, inv.initialAndInbound)) * 100}%`,
                }}
                className="bg-amber-500 h-full transition-all"
                title={`امانی نزد سوپرمارکت‌ها: ${inv.totalRetailerCustody} بسته`}
              />
              <div
                style={{
                  width: `${(inv.soldThroughRetailers / Math.max(1, inv.initialAndInbound)) * 100}%`,
                }}
                className="bg-emerald-600 h-full transition-all"
                title={`فروخته‌شده در سوپرمارکت‌ها: ${inv.soldThroughRetailers} بسته`}
              />
              <div
                style={{
                  width: `${(inv.soldDirectB2c / Math.max(1, inv.initialAndInbound)) * 100}%`,
                }}
                className="bg-stone-700 h-full transition-all"
                title={`فروش مستقیم B2C: ${inv.soldDirectB2c} بسته`}
              />
            </div>

            {/* Reconciliation Table matching Part 45 */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500">
                    <th className="py-2 font-semibold">محل استقرار / وضعیت کالا</th>
                    <th className="py-2 font-semibold">تعداد بسته</th>
                    <th className="py-2 font-semibold">سهم از کل</th>
                    <th className="py-2 font-semibold">ارزش مرجع (تومان)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 tabular-nums">
                  <tr>
                    <td className="py-2.5 font-medium text-stone-800">۱. موجودی فعلی انبار مرکزی</td>
                    <td className="py-2.5 font-bold text-stone-900">
                      {formatNumberFa(inv.warehouseStock)} بسته
                    </td>
                    <td className="py-2.5 text-stone-600">
                      {formatNumberFa(
                        Math.round((inv.warehouseStock / Math.max(1, inv.initialAndInbound)) * 100)
                      )}
                      ٪
                    </td>
                    <td className="py-2.5 text-stone-700">
                      {formatNumberFa(inv.warehouseStock * 200000)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-stone-800">
                      ۲. موجودی تحت مسئولیت بازاریاب‌ها (Custody)
                    </td>
                    <td className="py-2.5 font-bold text-stone-900">
                      {formatNumberFa(inv.totalAgentCustody)} بسته
                    </td>
                    <td className="py-2.5 text-stone-600">
                      {formatNumberFa(
                        Math.round(
                          (inv.totalAgentCustody / Math.max(1, inv.initialAndInbound)) * 100
                        )
                      )}
                      ٪
                    </td>
                    <td className="py-2.5 text-stone-700">
                      {formatNumberFa(inv.totalAgentCustody * 200000)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-stone-800">
                      ۳. موجودی امانی نزد سوپرمارکت‌ها (Retailer Custody)
                    </td>
                    <td className="py-2.5 font-bold text-stone-900">
                      {formatNumberFa(inv.totalRetailerCustody)} بسته
                    </td>
                    <td className="py-2.5 text-stone-600">
                      {formatNumberFa(
                        Math.round(
                          (inv.totalRetailerCustody / Math.max(1, inv.initialAndInbound)) * 100
                        )
                      )}
                      ٪
                    </td>
                    <td className="py-2.5 text-stone-700">
                      {formatNumberFa(inv.totalRetailerCustody * 200000)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-stone-800">
                      ۴. فروخته‌شده از طریق سوپرمارکت‌ها (B2B Consignment)
                    </td>
                    <td className="py-2.5 font-bold text-emerald-900">
                      {formatNumberFa(inv.soldThroughRetailers)} بسته
                    </td>
                    <td className="py-2.5 text-stone-600">
                      {formatNumberFa(
                        Math.round(
                          (inv.soldThroughRetailers / Math.max(1, inv.initialAndInbound)) * 100
                        )
                      )}
                      ٪
                    </td>
                    <td className="py-2.5 font-semibold text-emerald-900">
                      {formatNumberFa(fin.totalB2bReceivablesGenerated)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-stone-800">
                      ۵. فروش مستقیم به مصرف‌کننده نهایی (B2C Online/QR)
                    </td>
                    <td className="py-2.5 font-bold text-stone-900">
                      {formatNumberFa(inv.soldDirectB2c)} بسته
                    </td>
                    <td className="py-2.5 text-stone-600">
                      {formatNumberFa(
                        Math.round((inv.soldDirectB2c / Math.max(1, inv.initialAndInbound)) * 100)
                      )}
                      ٪
                    </td>
                    <td className="py-2.5 font-semibold text-stone-900">
                      {formatNumberFa(fin.totalB2cRevenue)}
                    </td>
                  </tr>
                  <tr className="bg-stone-50 font-extrabold border-t-2 border-stone-300">
                    <td className="py-2.5 px-2 text-stone-900">جمع کل تراز موجودی</td>
                    <td className="py-2.5 text-stone-900">
                      {formatNumberFa(inv.totalAccountedFor)} بسته
                    </td>
                    <td className="py-2.5 text-stone-900">۱۰۰٪</td>
                    <td className="py-2.5 text-emerald-950">تراز کامل و بدون مغایرت</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Financial Receivables, Collections & Channel Comparison */}
        <div className="lg:col-span-5 rounded-xl bg-white p-6 border border-stone-200 flex flex-col justify-between space-y-5">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              تراز مالی، مطالبات B2B و مقایسه کانال‌های فروش
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              تفکیک مطالبات ایجادشده، وجوه وصول‌شده بانکی، وجه نزد بازاریاب و پورسانت
            </p>

            <div className="mt-5 space-y-4">
              {/* B2B Receivables vs Verified Collections Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-stone-700">
                    نرخ وصول مطالبات فروش امانی سوپرمارکت‌ها
                  </span>
                  <span className="font-bold text-stone-900 tabular-nums">
                    {formatToman(fin.totalVerifiedB2bCollections)} از{' '}
                    {formatToman(fin.totalB2bReceivablesGenerated)}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-stone-100 overflow-hidden border border-stone-200">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        (fin.totalVerifiedB2bCollections /
                          Math.max(1, fin.totalB2bReceivablesGenerated)) *
                          100
                      )}%`,
                    }}
                    className="h-full bg-emerald-800"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 mt-1 tabular-nums">
                  <span>وصول‌شده قطعی: ۷۱.۴٪ ({formatNumberFa(fin.totalVerifiedB2bCollections)} تومان)</span>
                  <span>مانده طلب: {formatNumberFa(fin.totalOutstandingReceivables)} تومان</span>
                </div>
              </div>

              {/* Channel Comparison B2B vs B2C */}
              <div className="pt-3 border-t border-stone-100 space-y-2.5 text-xs tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">فروش کانال B2B (۱۲ سوپرمارکت امانی):</span>
                  <span className="font-bold text-stone-900">
                    {formatNumberFa(inv.soldThroughRetailers)} بسته ·{' '}
                    {formatToman(fin.totalB2bReceivablesGenerated)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">فروش کانال B2C (مستقیم آنلاین و QR):</span>
                  <span className="font-bold text-stone-900">
                    {formatNumberFa(inv.soldDirectB2c)} بسته · {formatToman(fin.totalB2cRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">وجه نقد در اختیار بازاریابان (تحویل‌نشده):</span>
                  <span className="font-bold text-amber-800">
                    {formatToman(fin.totalAgentHeldCash)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">هزینه‌های عملیاتی ثبت‌شده (بسته‌بندی و حمل):</span>
                  <span className="font-bold text-stone-700">
                    {formatToman(fin.totalExpenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                  <span className="font-bold text-stone-900">
                    موجودی نقد و بانک تأییدشده مدیریت:
                  </span>
                  <span className="font-extrabold text-emerald-900 text-sm">
                    {formatToman(fin.verifiedBankBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => onNavigateToForms(17)}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 text-center"
            >
              ثبت گزارش فروش فروشگاه
            </button>
            <button
              type="button"
              onClick={() => onNavigateToForms(21)}
              className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 text-center"
            >
              ثبت و تأیید واریزی جدید
            </button>
          </div>
        </div>
      </section>

      {/* Management Tables Navigation Tabs */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-3">
          <h2 className="text-base font-bold text-stone-900">
            جداول عملیاتی و کنترلی مدیریت (۱۲ جدول مدیریتی)
          </h2>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTableTab('agents_retailers')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTableTab === 'agents_retailers'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              عملکرد بازاریابان و فروشگاه‌ها
            </button>
            <button
              type="button"
              onClick={() => setActiveTableTab('approvals_payments')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTableTab === 'approvals_payments'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              تأیید واریزی‌ها، بدهکاران و پورسانت ({formatNumberFa(pendingPayments.length + unpaidCommissions.length)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTableTab('documents_movements')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTableTab === 'documents_movements'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              اسناد امضاشده و گردش انبار ({formatNumberFa(state.documents.length)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTableTab('b2c_orders')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTableTab === 'b2c_orders'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              سفارش‌های مستقیم مشتریان B2C ({formatNumberFa(state.b2cOrders.length)})
            </button>
          </div>
        </div>

        {/* Tab 1: Top Sales Agents & Retailers */}
        {activeTableTab === 'agents_retailers' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Table 1 & 5: Sales Agents Performance & Custody Inventory */}
            <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    عملکرد بازاریاب‌ها، موجودی امانی و پورسانت
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    مرتب‌شده بر اساس حجم فروش و وصول مطالبات
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToForms(4)}
                  className="text-xs font-semibold text-emerald-800 hover:underline"
                >
                  + ثبت بازاریاب جدید
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600">
                      <th className="py-2.5 px-3">کد و نام بازاریاب</th>
                      <th className="py-2.5 px-3">فروشگاه‌ها</th>
                      <th className="py-2.5 px-3">موجودی نزد بازاریاب</th>
                      <th className="py-2.5 px-3">فروش (بسته)</th>
                      <th className="py-2.5 px-3">وصول تاییدشده</th>
                      <th className="py-2.5 px-3">پورسانت (نرخ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 tabular-nums">
                    {agentStats.map((row) => (
                      <tr key={row.agent.id} className="hover:bg-stone-50/80">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-stone-900">{row.agent.fullName}</div>
                          <div className="text-[11px] text-stone-500">
                            {row.agent.code} · {toPersianDigits(row.agent.mobile)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {formatNumberFa(row.retailersCount)} فروشگاه
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-amber-900">
                          {formatNumberFa(row.custody)} بسته
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-900">
                          {formatNumberFa(row.soldPackages)} بسته
                        </td>
                        <td className="py-2.5 px-3">
                          {formatNumberFa(row.verifiedCollections)} تومان
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-stone-900">
                            {formatNumberFa(row.earnedCommission)} تومان
                          </div>
                          <div className="text-[11px] text-stone-500">
                            نرخ: {formatNumberFa(row.agent.commissionRatePercent)}٪ · مانده:{' '}
                            {formatNumberFa(row.unpaidCommission)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2, 3, 4: Retailers by Sales, Stock & Overdue Receivables */}
            <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    وضعیت سوپرمارکت‌ها، موجودی قفسه و مانده بدهی امانی
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    تفکیک فروش، موجودی باقیمانده و وضعیت سررسید تسویه
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToForms(6)}
                  className="text-xs font-semibold text-emerald-800 hover:underline"
                >
                  + ثبت سوپرمارکت جدید
                </button>
              </div>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600">
                      <th className="py-2.5 px-3">نام فروشگاه</th>
                      <th className="py-2.5 px-3">بازاریاب مسئول</th>
                      <th className="py-2.5 px-3">فروخته‌شده</th>
                      <th className="py-2.5 px-3">موجودی فعلی</th>
                      <th className="py-2.5 px-3">مانده بدهی</th>
                      <th className="py-2.5 px-3">وضعیت تسویه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 tabular-nums">
                    {retailerStats.map((row) => (
                      <tr key={row.retailer.id} className="hover:bg-stone-50/80">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-stone-900">
                            {row.retailer.storeName}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {row.retailer.code} · {row.retailer.district}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-stone-700">{row.agentName}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-900">
                          {formatNumberFa(row.sold)} بسته
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-stone-900">
                          {formatNumberFa(row.stock)} بسته
                        </td>
                        <td className="py-2.5 px-3 font-bold text-stone-900">
                          {formatNumberFa(row.remainingDebt)} تومان
                        </td>
                        <td className="py-2.5 px-3">
                          {row.remainingDebt === 0 ? (
                            <span className="text-emerald-800 font-semibold">تسویه کامل</span>
                          ) : row.retailer.hasOverdueReceivable ? (
                            <span className="text-red-700 font-bold">سررسیدگذشته</span>
                          ) : (
                            <span className="text-amber-800 font-medium">در مهلت تسویه</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Pending Payment Verification & Pending Commission Approvals */}
        {activeTableTab === 'approvals_payments' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Table 9: Pending Payment Verification */}
            <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-200">
                <h3 className="text-sm font-bold text-stone-900">
                  واریزی‌های در انتظار بررسی و تأیید مدیر (فرم ۲۲)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  فقط پس از تأیید مدیر، مبلغ از بدهی فروشگاه کسر و پورسانت بازاریاب محاسبه می‌شود.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600">
                      <th className="py-2.5 px-3">شماره پرداخت</th>
                      <th className="py-2.5 px-3">فروشگاه</th>
                      <th className="py-2.5 px-3">مبلغ (تومان)</th>
                      <th className="py-2.5 px-3">روش / رهگیری</th>
                      <th className="py-2.5 px-3">وضعیت / اقدام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 tabular-nums">
                    {state.payments.map((pay) => {
                      const rt = state.retailers.find((r) => r.id === pay.retailerId);
                      return (
                        <tr key={pay.id} className="hover:bg-stone-50/80">
                          <td className="py-2.5 px-3 font-mono font-semibold">
                            {pay.paymentNumber}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-stone-900">
                            {rt?.storeName ?? '—'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-stone-900">
                            {formatNumberFa(pay.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-stone-600">
                            {pay.bankName || pay.method} · {pay.referenceNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            {pay.status === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => onVerifyPayment(pay.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-900"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تأیید واریزی و تخصیص</span>
                              </button>
                            ) : (
                              <span className="text-emerald-800 font-semibold">
                                تأییدشده ({toJalaliDate(pay.paymentDate)})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 10: Commission Approvals & Payouts */}
            <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-200">
                <h3 className="text-sm font-bold text-stone-900">
                  تأیید و پرداخت پورسانت بازاریابان (فرم ۱۴)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  محاسبه‌شده بر اساس snapshot قانون پورسانت هر بازاریاب در لحظه وصول
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600">
                      <th className="py-2.5 px-3">کد پورسانت</th>
                      <th className="py-2.5 px-3">بازاریاب</th>
                      <th className="py-2.5 px-3">مبلغ وصول مبنا</th>
                      <th className="py-2.5 px-3">نرخ / پورسانت</th>
                      <th className="py-2.5 px-3">مانده / اقدام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 tabular-nums">
                    {state.commissions.map((comm) => {
                      const ag = state.agents.find((a) => a.id === comm.agentId);
                      return (
                        <tr key={comm.id} className="hover:bg-stone-50/80">
                          <td className="py-2.5 px-3 font-mono">{comm.commissionNumber}</td>
                          <td className="py-2.5 px-3 font-bold text-stone-900">
                            {ag?.fullName ?? '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            {formatNumberFa(comm.baseBasisAmount)} تومان
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-stone-900">
                              {formatNumberFa(comm.commissionAmount)} تومان
                            </span>{' '}
                            <span className="text-stone-500">
                              ({formatNumberFa(comm.ratePercentSnapshot)}٪)
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {comm.remainingPayable > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onPayCommission(comm.id, comm.remainingPayable)
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-800"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>
                                  پرداخت ({formatNumberFa(comm.remainingPayable)})
                                </span>
                              </button>
                            ) : (
                              <span className="text-emerald-800 font-semibold">
                                تسویه‌شده کامل
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Signed Official Documents & Warehouse Movements */}
        {activeTableTab === 'documents_movements' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Table 7 & 8: Official Signed Documents */}
            <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    اسناد رسمی تحویل کالا، رسیدهای امانی و تعهدنامه‌ها
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    در انتظار تأیید: {formatNumberFa(unverifiedDocuments.length)} سند · قابلیت چاپ A4 و بررسی اسکن امضاشده
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600">
                      <th className="py-2.5 px-3">شماره سند</th>
                      <th className="py-2.5 px-3">نوع سند و طرف حساب</th>
                      <th className="py-2.5 px-3">تعداد</th>
                      <th className="py-2.5 px-3">وضعیت تأیید</th>
                      <th className="py-2.5 px-3">چاپ / بررسی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 tabular-nums">
                    {state.documents.map((doc) => {
                      const ag = state.agents.find((a) => a.id === doc.agentId);
                      const rt = state.retailers.find((r) => r.id === doc.retailerId);
                      return (
                        <tr key={doc.id} className="hover:bg-stone-50/80">
                          <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                            {doc.documentNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-stone-900">{doc.title}</div>
                            <div className="text-[11px] text-stone-500">
                              {ag ? `بازاریاب: ${ag.fullName}` : ''}
                              {rt ? ` · فروشگاه: ${rt.storeName}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            {formatNumberFa(doc.quantity)} بسته
                          </td>
                          <td className="py-2.5 px-3">
                            {doc.verificationStatus === 'verified' ? (
                              <span className="text-emerald-800 font-semibold">تأیید نهایی</span>
                            ) : doc.verificationStatus === 'uploaded' ? (
                              <span className="text-amber-700 font-bold">آماده تأیید مدیر</span>
                            ) : (
                              <span className="text-stone-500">در انتظار امضا</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => onOpenDocument(doc)}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-100"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>مشاهده و چاپ A4</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 12: Latest Warehouse & Custody Movements */}
            <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-200">
                <h3 className="text-sm font-bold text-stone-900">
                  دفتر کل گردش موجودی انبار و کالاهای امانی (Immutable Stock Ledger)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  کلیه تغییرات موجودی صرفاً از طریق تراکنش‌های ثبت‌شده در این جدول انجام می‌شود.
                </p>
              </div>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600">
                      <th className="py-2.5 px-3">تاریخ</th>
                      <th className="py-2.5 px-3">نوع حرکت</th>
                      <th className="py-2.5 px-3">تعداد</th>
                      <th className="py-2.5 px-3">شرح و سند مرجع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 tabular-nums">
                    {state.inventoryTransactions
                      .slice()
                      .reverse()
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-stone-50/80">
                          <td className="py-2.5 px-3 text-stone-500">
                            {toJalaliDate(tx.createdAt)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-stone-800">
                            {tx.movementType === 'initial_stock'
                              ? 'موجودی اولیه انبار'
                              : tx.movementType === 'supplier_receipt'
                              ? 'ورود از تأمین‌کننده'
                              : tx.movementType === 'warehouse_to_agent'
                              ? 'تحویل انبار به بازاریاب'
                              : tx.movementType === 'agent_to_retailer'
                              ? 'تحویل امانی به فروشگاه'
                              : tx.movementType === 'retailer_sale'
                              ? 'فروش قطعی در فروشگاه'
                              : tx.movementType === 'agent_return_to_warehouse'
                              ? 'برگشت بازاریاب به انبار'
                              : tx.movementType === 'retailer_return_to_warehouse' ||
                                tx.movementType === 'retailer_return_to_agent'
                              ? 'مرجوعی از فروشگاه'
                              : 'ارسال سفارش مستقیم B2C'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-stone-900">
                            {formatNumberFa(tx.quantity)} بسته
                          </td>
                          <td className="py-2.5 px-3 text-stone-600">{tx.notes}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Latest B2C Orders */}
        {activeTableTab === 'b2c_orders' && (
          <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  سفارش‌های فروش مستقیم به مشتریان نهایی (B2C و اسکن QR بسته‌بندی)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  مجموع بسته‌های فروخته‌شده در کانال مستقیم: {formatNumberFa(inv.soldDirectB2c)} بسته
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToForms(33)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline"
              >
                <PackageCheck className="w-4 h-4" />
                <span>مدیریت ارسال و کد رهگیری مرسولات</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600">
                    <th className="py-2.5 px-3">شماره سفارش</th>
                    <th className="py-2.5 px-3">نام مشتری و موبایل</th>
                    <th className="py-2.5 px-3">شهر و نشانی</th>
                    <th className="py-2.5 px-3">تعداد</th>
                    <th className="py-2.5 px-3">مبلغ کل (تومان)</th>
                    <th className="py-2.5 px-3">کانال ورودی</th>
                    <th className="py-2.5 px-3">وضعیت ارسال و کد رهگیری</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 tabular-nums">
                  {state.b2cOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-stone-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                        {ord.orderNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-stone-900">{ord.customerName}</div>
                        <div className="text-[11px] text-stone-500">
                          {toPersianDigits(ord.customerMobile)}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">
                        {ord.city} — {ord.deliveryAddress}
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        {formatNumberFa(ord.quantity)} بسته
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-900">
                        {formatNumberFa(ord.totalPayable)}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">
                        {ord.sourceChannel === 'qr_packaging'
                          ? 'اسکن QR روی بسته'
                          : ord.sourceChannel === 'agent_referral'
                          ? 'لینک معرف بازاریاب'
                          : 'وب‌سایت مستقیم'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-stone-900">
                          {ord.orderStatus === 'delivered'
                            ? 'تحویل‌شده'
                            : ord.orderStatus === 'shipped'
                            ? 'ارسال‌شده با پست/پیک'
                            : 'در حال آماده‌سازی'}
                        </span>
                        {ord.trackingCode && (
                          <span className="block font-mono text-[11px] text-stone-500">
                            {ord.trackingCode}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
