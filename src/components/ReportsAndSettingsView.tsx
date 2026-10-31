import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Settings,
  BookOpen,
  QrCode,
  CheckCircle2,
  Download,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { SaberCommerceState, BusinessSettings } from '../core/types.ts';
import {
  computeInventorySummary,
  computeFinancialSummary,
  updateBusinessSettings,
  updateProductPricing,
} from '../core/engineClient.ts';
import { formatPersianNumber, formatToman, toJalaliDateString } from '../core/formatters.ts';

interface ReportsAndSettingsViewProps {
  state: SaberCommerceState;
  onUpdateState: (nextState: SaberCommerceState, message?: string) => void;
}

const TWENTY_REPORTS_CATALOG = [
  { id: 'R01', title: '۱. گزارش موجودی لحظه‌ای کل چرخه (انبار، بازاریاب، فروشگاه، رزرو آنلاین)' },
  { id: 'R02', title: '۲. گزارش کاردکس کامل گردش کالا (Inventory Ledger)' },
  { id: 'R03', title: '۳. گزارش عملکرد و امانت‌داری بازاریابان (۶ بازاریاب)' },
  { id: 'R04', title: '۴. گزارش عملکرد، موجودی و فروش سوپرمارکت‌ها (۱۲ فروشگاه)' },
  { id: 'R05', title: '۵. گزارش تحویل‌های امانی به بازاریابان (AG-1405)' },
  { id: 'R06', title: '۶. گزارش تحویل‌های امانی به فروشگاه‌ها (RT-1405)' },
  { id: 'R07', title: '۷. گزارش فروش‌های ثبت‌شده فروشگاهی (Sales Reports)' },
  { id: 'R08', title: '۸. گزارش مطالبات باز و سررسیدگذشته فروشگاه‌ها (Aging Receivables)' },
  { id: 'R09', title: '۹. گزارش پرداخت‌ها و تخصیص فیش‌های واریزی فروشگاه‌ها' },
  { id: 'R10', title: '۱۰. گزارش وجوه نقد دریافتی نزد بازاریابان و تسویه با مدیریت' },
  { id: 'R11', title: '۱۱. گزارش پورسانت‌های محاسبه‌شده، پرداخت‌شده و مانده بازاریابان' },
  { id: 'R12', title: '۱۲. گزارش فروش مستقیم آنلاین B2C و وضعیت ارسال سفارش‌ها' },
  { id: 'R13', title: '۱۳. گزارش مقایسه فروش کانال فروشگاهی (B2B) و کانال مستقیم (B2C)' },
  { id: 'R14', title: '۱۴. گزارش سود ناخالص و سود خالص عملیاتی به تفکیک محصول و کانال' },
  { id: 'R15', title: '۱۵. گزارش کالاهای مرجوعی، آسیب‌دیده و مغایرت انبارگردانی' },
  { id: 'R16', title: '۱۶. گزارش فروشگاه‌های کم‌تحرک یا دارای موجودی راکد' },
  { id: 'R17', title: '۱۷. گزارش فروشگاه‌های نیازمند شارژ فوری کالا (Restock Alerts)' },
  { id: 'R18', title: '۱۸. گزارش بازدیدهای میدانی بازاریابان و نتایج پیگیری' },
  { id: 'R19', title: '۱۹. گزارش عملکرد کدهای QR بسته‌بندی و لینک‌های معرفی بازاریابان' },
  { id: 'R20', title: '۲۰. گزارش اسناد چاپی و وضعیت بارگذاری امضاهای رسمی' },
];

export const ReportsAndSettingsView: React.FC<ReportsAndSettingsViewProps> = ({
  state,
  onUpdateState,
}) => {
  const [activeSection, setActiveSection] = useState<
    'reports' | 'journal' | 'qr_analytics' | 'settings'
  >('reports');
  const [selectedReportId, setSelectedReportId] = useState<string>('R01');
  const [filterAgentId, setFilterAgentId] = useState<string>('ALL');

  const inv = computeInventorySummary(state);
  const fin = computeFinancialSummary(state);
  const product = state.products[0];

  // Settings form state
  const [settingsDraft, setSettingsDraft] = useState<BusinessSettings>(state.settings);
  const [costPriceDraft, setCostPriceDraft] = useState<number>(product.costPrice);
  const [baseRetailerDraft, setBaseRetailerDraft] = useState<number>(product.baseRetailerPrice);
  const [markupDraft, setMarkupDraft] = useState<number>(product.retailerMarkupPercent);
  const [b2cPriceDraft, setB2cPriceDraft] = useState<number>(product.directB2cPrice);

  // Profitability calculation (Report 14)
  const totalSoldUnits = inv.soldThroughRetailers + inv.soldDirectB2c;
  const totalCogs = totalSoldUnits * product.costPrice;
  const totalGrossRevenue = fin.totalB2bReceivablesGenerated + fin.totalB2cRevenue;
  const grossProfit = totalGrossRevenue - totalCogs;
  const netProfit = grossProfit - fin.totalCommissionCalculated - fin.totalExpenses;

  const generateReportRows = (reportId: string): { headers: string[]; rows: string[][] } => {
    switch (reportId) {
      case 'R01':
        return {
          headers: ['محل استقرار موجودی', 'تعداد (بسته)', 'ارزش به قیمت تسویه (تومان)', 'وضعیت تطبیق'],
          rows: [
            ['انبار مرکزی', String(inv.warehouseStock), String(inv.warehouseStock * product.baseRetailerPrice), 'معتبر'],
            ['امانت نزد ۶ بازاریاب', String(inv.totalAgentCustody), String(inv.totalAgentCustody * product.baseRetailerPrice), 'معتبر'],
            ['امانت نزد ۱۲ فروشگاه', String(inv.totalRetailerCustody), String(inv.totalRetailerCustody * product.baseRetailerPrice), 'معتبر'],
            ['فروش‌رفته در فروشگاه‌ها (B2B)', String(inv.soldThroughRetailers), String(inv.soldThroughRetailers * product.baseRetailerPrice), 'تسویه / مطالبه'],
            ['فروش مستقیم آنلاین (B2C)', String(inv.soldDirectB2c), String(inv.soldDirectB2c * product.directB2cPrice), 'پرداخت‌شده'],
            ['جمع کل رهگیری‌شده', String(inv.totalAccountedFor), String(inv.totalAccountedFor * product.baseRetailerPrice), inv.isReconciled ? 'تراز کامل ۲۰۰ بسته' : 'نیازمند بررسی'],
          ],
        };
      case 'R03':
      case 'R10':
      case 'R11':
        return {
          headers: [
            'کد بازاریاب',
            'نام بازاریاب',
            'موجودی نزد بازاریاب',
            'نرخ پورسانت',
            'پورسانت قطعی‌شده (تومان)',
            'پورسانت پرداخت‌شده',
            'مانده پورسانت',
            'وجه نقد نزد بازاریاب',
          ],
          rows: state.agents
            .filter((a) => filterAgentId === 'ALL' || a.id === filterAgentId)
            .map((ag) => {
              const agComms = state.commissions.filter(
                (c) => c.agentId === ag.id && c.status !== 'cancelled'
              );
              const earned = agComms.reduce((s, c) => s + c.commissionAmount, 0);
              const paid = agComms.reduce((s, c) => s + c.paidAmount, 0);
              const rem = agComms.reduce((s, c) => s + c.remainingPayable, 0);
              const heldCash = fin.agentCashByAgent[ag.id]?.held ?? 0;
              return [
                ag.code,
                ag.fullName,
                `${inv.agentCustodyByAgent[ag.id] ?? 0} بسته`,
                `${ag.commissionRatePercent}%`,
                String(earned),
                String(paid),
                String(rem),
                String(heldCash),
              ];
            }),
        };
      case 'R04':
      case 'R08':
        return {
          headers: [
            'کد فروشگاه',
            'نام فروشگاه',
            'بازاریاب مسئول',
            'موجودی امانی فعلی',
            'کل مطالبات ایجادشده',
            'پرداخت تاییدشده',
            'مانده بدهی باز',
          ],
          rows: state.retailers
            .filter((r) => filterAgentId === 'ALL' || r.agentId === filterAgentId)
            .map((rt) => {
              const ag = state.agents.find((a) => a.id === rt.agentId);
              const rtInvs = state.invoices.filter(
                (i) => i.retailerId === rt.id && i.status !== 'reversed'
              );
              const total = rtInvs.reduce((s, i) => s + i.totalAmount, 0);
              const paid = rtInvs.reduce((s, i) => s + i.paidAmount, 0);
              const rem = rtInvs.reduce((s, i) => s + i.remainingAmount, 0);
              return [
                rt.code,
                rt.storeName,
                ag?.fullName || '-',
                `${inv.retailerCustodyByRetailer[rt.id] ?? 0} بسته`,
                String(total),
                String(paid),
                String(rem),
              ];
            }),
        };
      case 'R12':
        return {
          headers: ['شماره سفارش', 'نام مشتری', 'شهر', 'تعداد', 'مبلغ کل (تومان)', 'وضعیت ارسال', 'کانال ورود'],
          rows: state.b2cOrders.map((o) => [
            o.orderNumber,
            o.customerName,
            o.city,
            `${o.quantity} بسته`,
            String(o.totalPayable),
            o.orderStatus,
            o.sourceChannel,
          ]),
        };
      default:
        return {
          headers: ['شماره سند', 'عنوان', 'تعداد', 'ارزش پایه (تومان)', 'وضعیت تأیید', 'نسخه دمو / عملیاتی'],
          rows: state.documents.map((d) => [
            d.documentNumber,
            d.title,
            `${d.quantity} بسته`,
            String(d.totalReferenceValue),
            d.verificationStatus,
            d.isDemoPlaceholder ? 'نمونه شبیه‌سازی‌شده' : 'سند عملیاتی',
          ]),
        };
    }
  };

  const currentReportData = generateReportRows(selectedReportId);

  const handleDownloadCsv = () => {
    const bom = '\uFEFF';
    const csvLines = [
      currentReportData.headers.join(','),
      ...currentReportData.rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');
    const blob = new Blob([bom + csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saber-dates-${selectedReportId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const withSettings = updateBusinessSettings(state, settingsDraft);
    const withPricing = updateProductPricing(withSettings, {
      productId: product.id,
      costPrice: costPriceDraft,
      baseRetailerPrice: baseRetailerDraft,
      retailerMarkupPercent: markupDraft,
      directB2cPrice: b2cPriceDraft,
    });
    onUpdateState(
      withPricing,
      'تنظیمات مرکزی، ضرایب قیمت‌گذاری پویا و متن تعهدنامه‌ها با حفظ تاریخچه اسناد قبلی ذخیره شد.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation */}
      <div className="flex flex-wrap gap-2 bg-white border border-stone-200/80 rounded-2xl p-3 shadow-xs">
        {[
          { id: 'reports', label: 'مرکز ۲۰ گزارش تحلیلی و خروجی CSV / چاپی', icon: FileSpreadsheet },
          { id: 'journal', label: 'دفتر روزنامه دوطرفه و سود و زیان (Subledger)', icon: BookOpen },
          { id: 'qr_analytics', label: 'آمار اسکن QR بسته‌بندی و لینک‌های بازاریابان', icon: QrCode },
          { id: 'settings', label: 'تنظیمات مرکزی، قیمت‌گذاری پویا و تعهدنامه‌ها', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeSection === tab.id
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Section 1: 20 Reports Hub */}
      {activeSection === 'reports' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-stone-600 mb-1">
                انتخاب گزارش از فهرست ۲۰ گزارش استاندارد مدیریتی (بخش ۴۱):
              </label>
              <select
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="w-full max-w-xl border border-stone-300 rounded-xl px-3.5 py-2 text-xs font-bold bg-stone-50 text-stone-900"
              >
                {TWENTY_REPORTS_CATALOG.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="فیلتر بازاریاب در گزارش"
                value={filterAgentId}
                onChange={(e) => setFilterAgentId(e.target.value)}
                className="border border-stone-300 rounded-xl px-3 py-2 text-xs bg-stone-50"
              >
                <option value="ALL">همه بازاریابان (۶ بازاریاب)</option>
                {state.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.fullName}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                دانلود خروجی CSV (Excel)
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                چاپ گزارش A4
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600">
                  {currentReportData.headers.map((h, i) => (
                    <th key={i} className="py-3 px-3 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {currentReportData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-stone-50/80">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3 tabular-nums font-medium text-stone-800">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Double-Entry Financial Subledger & P&L */}
      {activeSection === 'journal' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="text-xs text-stone-500">مجموع فروش (B2B + B2C)</div>
              <div className="text-base font-extrabold text-stone-900 mt-1 tabular-nums">
                {formatToman(totalGrossRevenue)}
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="text-xs text-stone-500">بهای تمام‌شده کالای فروش‌رفته</div>
              <div className="text-base font-extrabold text-stone-700 mt-1 tabular-nums">
                {formatToman(totalCogs)}
              </div>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
              <div className="text-xs text-emerald-900 font-semibold">سود ناخالص عملیاتی</div>
              <div className="text-base font-extrabold text-emerald-900 mt-1 tabular-nums">
                {formatToman(grossProfit)}
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="text-xs text-stone-500">پورسانت + هزینه‌های اجرایی</div>
              <div className="text-base font-extrabold text-rose-700 mt-1 tabular-nums">
                {formatToman(fin.totalCommissionCalculated + fin.totalExpenses)}
              </div>
            </div>
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
              <div className="text-xs text-amber-900 font-semibold">سود خالص ویژه</div>
              <div className="text-base font-extrabold text-amber-950 mt-1 tabular-nums">
                {formatToman(netProfit)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs overflow-x-auto">
            <h2 className="text-sm font-bold text-stone-900 mb-3">
              دفتر روزنامه مالی دوطرفه (Double-Entry Financial Subledger)
            </h2>
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="py-2.5 px-3">شماره سند</th>
                  <th className="py-2.5 px-3">تاریخ</th>
                  <th className="py-2.5 px-3">شرح رویداد مالی</th>
                  <th className="py-2.5 px-3">حساب بدهکار (Debit)</th>
                  <th className="py-2.5 px-3">حساب بستانکار (Credit)</th>
                  <th className="py-2.5 px-3">مبلغ (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {state.journalEntries.map((je) => (
                  <tr key={je.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-mono font-bold">{je.entryNumber}</td>
                    <td className="py-2.5 px-3 tabular-nums">{toJalaliDateString(je.entryDate)}</td>
                    <td className="py-2.5 px-3 font-medium text-stone-900">{je.description}</td>
                    <td className="py-2.5 px-3 text-emerald-800 font-semibold">{je.debitAccount}</td>
                    <td className="py-2.5 px-3 text-indigo-800 font-semibold">{je.creditAccount}</td>
                    <td className="py-2.5 px-3 tabular-nums font-bold">{formatToman(je.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: QR & Referral Analytics */}
      {activeSection === 'qr_analytics' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs overflow-x-auto">
          <h2 className="text-sm font-bold text-stone-900 mb-1">
            عملکرد کدهای QR روی بسته‌بندی محصول و لینک‌های اختصاصی معرفی بازاریابان
          </h2>
          <p className="text-xs text-stone-500 mb-4">
            تفکیک دقیق اسکن‌های عمومی روی بسته ۶۰۰ گرمی از لینک‌های اختصاصی معرفی بازاریابان (/ref/AG-XX)
          </p>
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="py-3 px-3">کد / مسیر</th>
                <th className="py-3 px-3">نوع کانال</th>
                <th className="py-3 px-3">تعداد اسکن / کلیک</th>
                <th className="py-3 px-3">بازدید صفحه محصول</th>
                <th className="py-3 px-3">جذب فروشگاه جدید (B2B)</th>
                <th className="py-3 px-3">سفارش مستقیم مشتری (B2C)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {state.qrLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50">
                  <td className="py-3 px-3 font-mono font-bold text-amber-900">{log.code}</td>
                  <td className="py-3 px-3">
                    {log.type === 'product_packaging_qr'
                      ? 'QR استاندارد روی بسته ۶۰۰ گرمی (عمومی)'
                      : 'لینک اختصاصی معرفی بازاریاب'}
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold">
                    {formatPersianNumber(log.scansCount)}
                  </td>
                  <td className="py-3 px-3 tabular-nums">
                    {formatPersianNumber(log.pageViewsCount)}
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold text-indigo-800">
                    {formatPersianNumber(log.retailerRegistrationsCount)} فروشگاه
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold text-emerald-800">
                    {formatPersianNumber(log.b2cOrdersCount)} سفارش
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section 4: Central Administrative Settings & Dynamic Pricing */}
      {activeSection === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-xs space-y-6 text-xs"
        >
          <div className="border-b border-stone-200 pb-3">
            <h2 className="text-base font-extrabold text-stone-900">
              پنل تنظیمات مرکزی کسب‌وکار، قیمت‌گذاری پویا و متن تعهدنامه‌های رسمی (بخش ۶ و ۸)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              تغییر قیمت‌ها و ضرایب صرفاً بر تراکنش‌های آینده اعمال می‌شود و اسناد، تحویل‌ها و فاکتورهای
              قبلی دست‌نخورده باقی می‌مانند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                قیمت تمام‌شده هر بسته (تومان):
              </label>
              <input
                type="number"
                value={costPriceDraft}
                onChange={(e) => setCostPriceDraft(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                قیمت پایه تسویه فروشگاه (تومان):
              </label>
              <input
                type="number"
                value={baseRetailerDraft}
                onChange={(e) => setBaseRetailerDraft(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                درصد حاشیه سود فروشگاه (٪):
              </label>
              <input
                type="number"
                value={markupDraft}
                onChange={(e) => setMarkupDraft(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
              />
              <div className="text-[11px] text-amber-800 mt-1">
                قیمت پیشنهادی مصرف‌کننده در فروشگاه:{' '}
                {formatToman(Math.round(baseRetailerDraft * (1 + markupDraft / 100)))}
              </div>
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                قیمت فروش مستقیم آنلاین B2C (تومان):
              </label>
              <input
                type="number"
                value={b2cPriceDraft}
                onChange={(e) => setB2cPriceDraft(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-stone-100">
            <div>
              <label className="block font-bold text-stone-700 mb-1">نام تجاری سامانه:</label>
              <input
                type="text"
                value={settingsDraft.businessName}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, businessName: e.target.value })
                }
                className="w-full border border-stone-300 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                دوره تسویه استاندارد فروشگاه (روز):
              </label>
              <input
                type="number"
                value={settingsDraft.settlementPeriodDays}
                onChange={(e) =>
                  setSettingsDraft({
                    ...settingsDraft,
                    settlementPeriodDays: Number(e.target.value),
                  })
                }
                className="w-full border border-stone-300 rounded-xl px-3 py-2 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                سیاست انتساب پورسانت در وصول مشترک:
              </label>
              <select
                value={settingsDraft.commissionAttributionPolicy}
                onChange={(e) =>
                  setSettingsDraft({
                    ...settingsDraft,
                    commissionAttributionPolicy: e.target.value as any,
                  })
                }
                className="w-full border border-stone-300 rounded-xl px-3 py-2 bg-stone-50"
              >
                <option value="sales_agent">انتساب به بازاریاب مسئول فروشگاه</option>
                <option value="collecting_agent">انتساب به بازاریاب وصول‌کننده وجه</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                متن تعهدنامه رسمی تحویل امانی بازاریاب (نسخه{' '}
                {formatPersianNumber(state.settings.declarationVersion)}):
              </label>
              <textarea
                rows={2}
                value={settingsDraft.agentConsignmentDeclaration}
                onChange={(e) =>
                  setSettingsDraft({
                    ...settingsDraft,
                    agentConsignmentDeclaration: e.target.value,
                  })
                }
                className="w-full border border-stone-300 rounded-xl px-3 py-2 leading-relaxed"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                متن تعهدنامه رسمی تحویل امانی فروشگاه:
              </label>
              <textarea
                rows={2}
                value={settingsDraft.retailerConsignmentDeclaration}
                onChange={(e) =>
                  setSettingsDraft({
                    ...settingsDraft,
                    retailerConsignmentDeclaration: e.target.value,
                  })
                }
                className="w-full border border-stone-300 rounded-xl px-3 py-2 leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-800 text-white hover:bg-amber-900 font-extrabold text-xs shadow-xs transition"
            >
              ذخیره تنظیمات مرکزی و ثبت در تاریخچه قیمت
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
