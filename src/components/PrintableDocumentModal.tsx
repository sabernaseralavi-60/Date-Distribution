import React, { useState } from 'react';
import {
  OfficialDocument,
  SaberCommerceState,
} from '../core/types.ts';
import {
  formatNumberFa,
  formatToman,
  toJalaliDateTime,
  toPersianDigits,
} from '../core/formatters.ts';
import { QrCodeSvg } from './QrCodeSvg';
import { Printer, Upload, CheckCircle2, X, FileCheck2, ShieldAlert } from 'lucide-react';

interface PrintableDocumentModalProps {
  document: OfficialDocument;
  state: SaberCommerceState;
  canVerify: boolean;
  onClose: () => void;
  onUploadAttachment: (docId: string, file: { filename: string; dataBase64: string }) => Promise<void>;
  onVerifyDocument: (docId: string) => Promise<void>;
}

export const PrintableDocumentModal: React.FC<PrintableDocumentModalProps> = ({
  document: doc,
  state,
  canVerify,
  onClose,
  onUploadAttachment,
  onVerifyDocument,
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const agent = state.agents.find((a) => a.id === doc.agentId);
  const retailer = state.retailers.find((r) => r.id === doc.retailerId);
  const product = state.products.find((p) => p.id === doc.productId) || state.products[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setUploadError('فرمت فایل مجاز نیست. لطفاً تصویر (JPG/PNG/WebP) یا PDF بارگذاری کنید.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('حجم فایل بیش از حد مجاز (۳ مگابایت) است.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = typeof reader.result === 'string' ? reader.result : '';
        await onUploadAttachment(doc.id, { filename: file.name, dataBase64: data.slice(data.indexOf(',') + 1) });
        setUploadSuccess(`نسخهٔ امضاشدهٔ «${file.name}» روی سرور ذخیره شد و هش SHA-256 واقعی آن ثبت گردید.`);
      } catch (err: any) {
        setUploadError(err.message || 'خطا در بارگذاری سند.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden">
        {/* Top Action Toolbar (Hidden in Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-4 bg-stone-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <FileCheck2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold">{doc.title}</h3>
              <p className="text-xs text-stone-300 tabular-nums">
                شماره سند رسمی: {toPersianDigits(doc.documentNumber)} · وضعیت:{' '}
                {doc.verificationStatus === 'verified'
                  ? 'تأیید نهایی شده'
                  : doc.verificationStatus === 'uploaded'
                  ? 'اسکن امضاشده پیوست شد (در انتظار تأیید مدیر)'
                  : 'پیش‌نویس در انتظار چاپ و امضا'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ A4 / ذخیره PDF</span>
            </button>

            <label className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
              <Upload className="w-4 h-4" />
              <span>بارگذاری تصویر امضاشده</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {canVerify && doc.verificationStatus !== 'verified' && (
              <button
                type="button"
                onClick={async () => {
                  setUploadError(null);
                  try {
                    await onVerifyDocument(doc.id);
                    setUploadSuccess('سند توسط مدیر تأیید نهایی شد و موجودی انبار/امانی به‌روز گردید.');
                  } catch (err: any) {
                    setUploadError(err.message);
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأیید نهایی مدیر و ثبت در انبار</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="بستن پیش‌نمایش سند"
              className="rounded-lg p-2 text-stone-300 hover:bg-white/10 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="no-print bg-red-50 border-b border-red-200 px-6 py-2.5 text-xs font-semibold text-red-800">
            {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div className="no-print bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs font-semibold text-emerald-900">
            {uploadSuccess}
          </div>
        )}

        {doc.attachments.length > 0 && (
          <div className="no-print border-b border-stone-200 bg-stone-50 px-6 py-2.5 text-xs text-stone-700 flex flex-wrap gap-x-5 gap-y-1">
            {doc.attachments.map((att) => (
              <a key={att.id} href={`/api/attachments/${att.id}`} target="_blank" rel="noopener noreferrer" className="underline">
                نسخهٔ {toPersianDigits(String(att.version))}: {att.originalFilename} (SHA-256: {att.checksumSha256.slice(0, 10)}…)
              </a>
            ))}
          </div>
        )}

        {/* Printable A4 Official Document Sheet */}
        <div className="print-only-sheet relative p-8 md:p-10 bg-white text-stone-900 max-h-[80vh] overflow-y-auto">
          {/* Mandatory Demo Placeholder Watermark per Part 45 */}
          {doc.isDemoPlaceholder && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50/80 px-4 py-2 text-center text-xs font-bold text-amber-900">
              «نمونه شبیه‌سازی‌شده — فاقد امضا و اعتبار عملیاتی»
            </div>
          )}

          {/* Official Document Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b-2 border-stone-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-900 text-amber-400 font-extrabold text-xl border-2 border-amber-500">
                {state.settings.logoText}
              </div>
              <div>
                <div className="text-xs font-semibold text-stone-500">
                  {state.settings.brandTitle}
                </div>
                <h1 className="text-xl font-extrabold text-stone-900 mt-0.5">{doc.title}</h1>
                <p className="text-xs text-stone-600 mt-1">
                  نشانی: {state.settings.address} · تلفن: {state.settings.phone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end md:self-auto">
              <div className="text-left md:text-right text-xs space-y-1">
                <div>
                  <span className="text-stone-500">شماره سند: </span>
                  <span className="font-mono font-bold text-stone-900 tabular-nums">
                    {doc.documentNumber}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">تاریخ و ساعت صدور: </span>
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {toJalaliDateTime(doc.issueDate)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">رژیم حقوقی و مالی: </span>
                  <span className="font-bold text-emerald-900">
                    {doc.policyMode === 'consignment'
                      ? 'امانی (مسئولیت نگهداری و تسویه پس از فروش)'
                      : 'فروش نسیه (ایجاد بدهی مالی قطعی در زمان تحویل)'}
                  </span>
                </div>
              </div>
              <QrCodeSvg value={`https://saberdates.ir/verify/${doc.documentNumber}`} size={76} />
            </div>
          </div>

          {/* Parties Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            {agent && (
              <div className="rounded-lg border border-stone-300 p-4 bg-stone-50/60">
                <div className="text-xs font-bold text-stone-500 mb-2">
                  مشخصات بازاریاب / تحویل‌گیرنده یا تحویل‌دهنده
                </div>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-stone-500">نام و نام خانوادگی: </span>
                    <span className="font-bold text-stone-900">{agent.fullName}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">کد بازاریاب: </span>
                    <span className="font-mono font-semibold">{agent.code}</span>
                    <span className="mx-2 text-stone-300">·</span>
                    <span className="text-stone-500">موبایل: </span>
                    <span className="tabular-nums font-semibold">
                      {toPersianDigits(agent.mobile)}
                    </span>
                  </div>
                  {agent.nationalId && (
                    <div>
                      <span className="text-stone-500">شماره شناسایی/ملی: </span>
                      <span className="tabular-nums">{toPersianDigits(agent.nationalId)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-stone-500">محدوده فعالیت: </span>
                    <span>{agent.address}</span>
                  </div>
                </div>
              </div>
            )}

            {retailer ? (
              <div className="rounded-lg border border-stone-300 p-4 bg-stone-50/60">
                <div className="text-xs font-bold text-stone-500 mb-2">
                  مشخصات فروشگاه / سوپرمارکت تحویل‌گیرنده
                </div>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-stone-500">نام فروشگاه: </span>
                    <span className="font-bold text-stone-900">{retailer.storeName}</span>
                    <span className="mx-2 text-stone-300">·</span>
                    <span className="font-mono">{retailer.code}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">نام مالک / مسئول: </span>
                    <span className="font-semibold">{retailer.ownerName}</span>
                    <span className="mx-2 text-stone-300">·</span>
                    <span className="text-stone-500">تلفن: </span>
                    <span className="tabular-nums">{toPersianDigits(retailer.mobile)}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">نشانی دقیق: </span>
                    <span>{retailer.address}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-stone-300 p-4 bg-stone-50/60">
                <div className="text-xs font-bold text-stone-500 mb-2">
                  مشخصات مبدأ / انبار مرکزی
                </div>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-stone-500">واحد تحویل‌دهنده: </span>
                    <span className="font-bold text-stone-900">
                      انبار مرکزی {state.settings.businessName}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">مسئول انبار: </span>
                    <span className="font-semibold">
                      {doc.signerWarehouseName || 'سرپرست انبار مرکزی'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500">نشانی انبار: </span>
                    <span>{state.settings.address}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Items Table */}
          <div className="overflow-x-auto border border-stone-300 rounded-lg my-6">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-300 text-stone-700 font-bold">
                  <th className="py-2.5 px-3 border-l border-stone-300">ردیف</th>
                  <th className="py-2.5 px-3 border-l border-stone-300">نام محصول</th>
                  <th className="py-2.5 px-3 border-l border-stone-300">کد کالا (SKU)</th>
                  <th className="py-2.5 px-3 border-l border-stone-300">نوع بسته‌بندی</th>
                  <th className="py-2.5 px-3 border-l border-stone-300">وزن خالص</th>
                  <th className="py-2.5 px-3 border-l border-stone-300">تعداد بسته</th>
                  <th className="py-2.5 px-3 border-l border-stone-300">
                    قیمت پایه تسویه ({state.settings.currencyLabel})
                  </th>
                  {doc.documentType === 'retailer_delivery' && (
                    <>
                      <th className="py-2.5 px-3 border-l border-stone-300">سهم فروشگاه</th>
                      <th className="py-2.5 px-3 border-l border-stone-300">
                        قیمت پیشنهادی مصرف‌کننده
                      </th>
                    </>
                  )}
                  <th className="py-2.5 px-3">ارزش مرجع کل ({state.settings.currencyLabel})</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-stone-200">
                  <td className="py-3 px-3 border-l border-stone-200 tabular-nums">۱</td>
                  <td className="py-3 px-3 border-l border-stone-200 font-bold">
                    {product.name}
                  </td>
                  <td className="py-3 px-3 border-l border-stone-200 font-mono">
                    {product.sku}
                  </td>
                  <td className="py-3 px-3 border-l border-stone-200">{product.packaging}</td>
                  <td className="py-3 px-3 border-l border-stone-200 tabular-nums">
                    {formatNumberFa(product.netWeightGrams)} گرم
                  </td>
                  <td className="py-3 px-3 border-l border-stone-200 font-bold tabular-nums">
                    {formatNumberFa(doc.quantity)} {product.unit}
                  </td>
                  <td className="py-3 px-3 border-l border-stone-200 tabular-nums">
                    {formatNumberFa(doc.unitReferencePrice)}
                  </td>
                  {doc.documentType === 'retailer_delivery' && (
                    <>
                      <td className="py-3 px-3 border-l border-stone-200 tabular-nums">
                        {formatNumberFa(
                          doc.retailerMarkupPercent ?? product.retailerMarkupPercent
                        )}
                        ٪
                      </td>
                      <td className="py-3 px-3 border-l border-stone-200 tabular-nums">
                        {formatNumberFa(
                          doc.suggestedRetailPrice ?? product.suggestedRetailPrice
                        )}
                      </td>
                    </>
                  )}
                  <td className="py-3 px-3 font-bold tabular-nums text-emerald-950">
                    {formatNumberFa(doc.totalReferenceValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-stone-100 px-4 py-3 text-xs border border-stone-300 mb-6">
            <div>
              <span className="text-stone-600">جمع کل تعداد بسته‌ها: </span>
              <span className="font-extrabold text-stone-900 tabular-nums">
                {formatNumberFa(doc.quantity)} بسته
              </span>
            </div>
            <div>
              <span className="text-stone-600">ارزش مرجع کل محموله: </span>
              <span className="font-extrabold text-emerald-900 tabular-nums">
                {formatToman(doc.totalReferenceValue, state.settings.currencyLabel)}
              </span>
            </div>
            <div>
              <span className="text-stone-600">نوع تعهد: </span>
              <span className="font-bold text-stone-900">
                {doc.policyMode === 'consignment'
                  ? 'تحویل امانی (بدون ایجاد بدهی نقدی فوری در لحظه تحویل)'
                  : 'فروش نسیه (تعهد پرداخت در سررسید)'}
              </span>
            </div>
          </div>

          {/* Mandatory Legal Declaration */}
          <div className="rounded-lg border border-stone-300 p-4 bg-[#FAF8F5] mb-6">
            <div className="text-xs font-bold text-stone-800 mb-1.5">
              متن تعهدنامه و شرایط تحویل کالا (نسخه {formatNumberFa(state.settings.declarationVersion)}):
            </div>
            <p className="text-xs leading-6 text-stone-800 text-justify">
              {doc.declarationText}
            </p>
          </div>

          {/* Designated Signature & Stamp Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="rounded-lg border border-dashed border-stone-400 p-4 min-h-[120px] flex flex-col justify-between">
              <div className="text-xs font-bold text-stone-700">
                {doc.documentType === 'retailer_delivery'
                  ? '۱. مهر و امضای مالک / نماینده مجاز فروشگاه'
                  : '۱. نام و امضای تحویل‌دهنده (انباردار)'}
              </div>
              <div className="text-xs text-stone-600 mt-4">
                نام: {doc.signerRetailerName || doc.signerWarehouseName || '........................'}
              </div>
              <div className="text-[11px] text-stone-400 mt-2">محل امضا و اثر مهر فروشگاه / تاریخ</div>
            </div>

            <div className="rounded-lg border border-dashed border-stone-400 p-4 min-h-[120px] flex flex-col justify-between">
              <div className="text-xs font-bold text-stone-700">
                ۲. نام و امضای بازاریاب ({agent?.code || 'نماینده پخش'})
              </div>
              <div className="text-xs text-stone-600 mt-4">
                نام: {doc.signerAgentName || agent?.fullName || '........................'}
              </div>
              <div className="text-[11px] text-stone-400 mt-2">محل امضای بازاریاب و تاریخ تحویل</div>
            </div>

            <div className="rounded-lg border border-dashed border-stone-400 p-4 min-h-[120px] flex flex-col justify-between">
              <div className="text-xs font-bold text-stone-700">
                ۳. تأیید نهایی مدیریت / کنترل اسناد
              </div>
              <div className="text-xs text-stone-600 mt-4">
                {doc.approvedByAdmin
                  ? `تأییدشده توسط: ${doc.approvedByAdmin}`
                  : 'در انتظار بررسی و تأیید مدیریت'}
              </div>
              <div className="text-[11px] text-stone-400 mt-2">
                {doc.approvedAt ? toJalaliDateTime(doc.approvedAt) : 'محل امضا و مهر مدیریت'}
              </div>
            </div>
          </div>

          {/* Attached Digital Scan Metadata */}
          <div className="mt-6 pt-4 border-t border-stone-200 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-stone-400" />
              <span>
                توجه: بارگذاری تصویر اسکن‌شده صرفاً جهت مستندسازی داخلی سامانه است و جایگزین نگهداری نسخه فیزیکی اصل رسید امضاشده نمی‌باشد.
              </span>
            </div>
            {doc.attachments.length > 0 && (
              <div className="font-mono text-[10px] text-stone-600">
                فایل پیوست: {doc.attachments[doc.attachments.length - 1].originalFilename} ·{' '}
                {doc.attachments[doc.attachments.length - 1].checksumSha256.slice(0, 22)}...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
