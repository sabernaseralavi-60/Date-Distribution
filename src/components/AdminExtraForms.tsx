import React, { useEffect, useState } from 'react';
import type { SaberCommerceState } from '../core/types.ts';
import {
  markNotificationsRead,
  recordCashBankTransaction,
  recordExpense,
  recordFinancialAdjustment,
  updateBusinessSettings,
} from '../core/engineClient.ts';
import { formatToman, toJalaliDateString } from '../core/formatters.ts';
import { api, newKey } from '../api.ts';

interface Props {
  formId: number;
  state: SaberCommerceState;
  onUpdateState: (next: SaberCommerceState, message?: string) => void;
  onOpenReports?: () => void;
}

const input = 'w-full rounded-lg border border-stone-300 px-3 py-2';
const label = 'block font-semibold text-stone-700 mb-1';
const primary = 'rounded-lg bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950 disabled:opacity-50';

const PERMISSIONS: { cap: string; admin: boolean; agent: boolean; retailer: boolean; customer: boolean }[] = [
  { cap: 'مدیریت محصول، قیمت‌گذاری و تنظیمات', admin: true, agent: false, retailer: false, customer: false },
  { cap: 'ثبت و ویرایش بازاریاب و دسترسی‌ها', admin: true, agent: false, retailer: false, customer: false },
  { cap: 'ثبت فروشگاه (مدیر: فعال؛ بازاریاب: در انتظار تأیید مدیر)', admin: true, agent: true, retailer: false, customer: true },
  { cap: 'تحویل کالا به فروشگاه از موجودی خود', admin: true, agent: true, retailer: false, customer: false },
  { cap: 'تأیید اسناد امضاشده و انتقال موجودی', admin: true, agent: false, retailer: false, customer: false },
  { cap: 'گزارش فروش فروشگاه', admin: true, agent: true, retailer: true, customer: false },
  { cap: 'ثبت واریزی (فقط در انتظار؛ تأیید با مدیر)', admin: true, agent: true, retailer: true, customer: false },
  { cap: 'تأیید واریزی، تخصیص FIFO و صدور پورسانت', admin: true, agent: false, retailer: false, customer: false },
  { cap: 'تحویل وجه نقد بازاریاب به مدیریت (در انتظار تأیید مدیر)', admin: true, agent: true, retailer: false, customer: false },
  { cap: 'پرداخت و تأیید پورسانت', admin: true, agent: false, retailer: false, customer: false },
  { cap: 'گزارش بازدید میدانی', admin: true, agent: true, retailer: false, customer: false },
  { cap: 'هزینه‌ها، تراکنش نقد/بانک، تعدیل مالی', admin: true, agent: false, retailer: false, customer: false },
  { cap: 'مشاهدهٔ دفتر روزنامه و حسابرسی', admin: true, agent: false, retailer: false, customer: false },
  { cap: 'خرید آنلاین بدون حساب کاربری و رهگیری سفارش', admin: true, agent: false, retailer: false, customer: true },
];

/** Forms 37, 38, 39, 41, 42, 43, 44, 45 of Part 38 (v0 showed one shared placeholder for all of them). */
export const AdminExtraForms: React.FC<Props> = ({ formId, state, onUpdateState, onOpenReports }) => {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ok = (text: string) => setMsg({ ok: true, text });
  const bad = (e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
  useEffect(() => setMsg(null), [formId]);

  // 37 expense
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState(0);
  const [expCat, setExpCat] = useState<'packaging' | 'transport' | 'warehousing' | 'marketing' | 'other'>('packaging');
  const [expAccount, setExpAccount] = useState('حساب بانکی مدیریت');
  // 38 cash/bank
  const [cbKind, setCbKind] = useState<'bank_deposit' | 'bank_withdrawal' | 'cash_to_bank' | 'bank_to_cash'>('cash_to_bank');
  const [cbAmount, setCbAmount] = useState(0);
  const [cbRef, setCbRef] = useState('');
  // 39 adjustment
  const [adjRetailer, setAdjRetailer] = useState(state.retailers[0]?.id ?? '');
  const [adjKind, setAdjKind] = useState<'credit_note' | 'debit_note' | 'write_off'>('credit_note');
  const [adjAmount, setAdjAmount] = useState(0);
  const [adjReason, setAdjReason] = useState('');
  // 44 settings
  const s = state.settings;
  const [draft, setDraft] = useState({ businessName: s.businessName, phone: s.phone, address: s.address, supportEmail: s.supportEmail, lowStockWarningThreshold: s.lowStockWarningThreshold, defaultShippingFee: s.defaultShippingFee, freeShippingThreshold: s.freeShippingThreshold, settlementPeriodDays: s.settlementPeriodDays, defaultCommissionRatePercent: s.defaultCommissionRatePercent, commissionAttributionPolicy: s.commissionAttributionPolicy });
  // 41 users
  const [users, setUsers] = useState<Awaited<ReturnType<typeof api.users>>['users']>([]);
  const [nu, setNu] = useState({ username: '', fullName: '', role: 'agent' as 'agent' | 'retailer', entityId: state.agents[0]?.id ?? '', password: '' });
  const reloadUsers = () => api.users().then((r) => setUsers(r.users)).catch(bad);
  useEffect(() => { if (formId === 41) reloadUsers(); }, [formId]);

  const unread = state.notifications.filter((n) => !n.isRead);

  return (
    <div className="space-y-4 text-xs">
      {msg && <div className={`rounded-lg px-3 py-2 font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{msg.text}</div>}

      {formId === 37 && (
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); try { onUpdateState(recordExpense(state, { title: expTitle, amount: expAmount, category: expCat, paidFromAccount: expAccount }), 'هزینه عملیاتی در دفتر کل ثبت شد.'); ok('هزینه ثبت شد.'); setExpTitle(''); setExpAmount(0); } catch (err) { bad(err); } }}>
          <div><label className={label}>شرح هزینه *</label><input className={input} required value={expTitle} onChange={(e) => setExpTitle(e.target.value)} /></div>
          <div><label className={label}>مبلغ (تومان) *</label><input className={`${input} tabular-nums`} type="number" min={1} required value={expAmount || ''} onChange={(e) => setExpAmount(Number(e.target.value))} /></div>
          <div><label className={label}>دسته</label><select className={input} value={expCat} onChange={(e) => setExpCat(e.target.value as typeof expCat)}><option value="packaging">بسته‌بندی</option><option value="transport">حمل و نقل</option><option value="warehousing">انبارداری</option><option value="marketing">بازاریابی</option><option value="other">سایر</option></select></div>
          <div><label className={label}>پرداخت از حساب</label><input className={input} value={expAccount} onChange={(e) => setExpAccount(e.target.value)} /></div>
          <div className="md:col-span-2"><button className={primary} type="submit">ثبت هزینه</button></div>
          <div className="md:col-span-2 text-stone-500">مجموع هزینه‌های ثبت‌شده: {formatToman(state.expenses.reduce((a, e) => a + e.amount, 0))} ({state.expenses.length} مورد)</div>
        </form>
      )}

      {formId === 38 && (
        <div className="space-y-4">
          <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={(e) => { e.preventDefault(); try { onUpdateState(recordCashBankTransaction(state, { kind: cbKind, amount: cbAmount, account: 'حساب بانکی مدیریت', referenceNumber: cbRef }), 'تراکنش نقد/بانک ثبت شد.'); ok('ثبت شد.'); setCbAmount(0); setCbRef(''); } catch (err) { bad(err); } }}>
            <div><label className={label}>نوع تراکنش</label><select className={input} value={cbKind} onChange={(e) => setCbKind(e.target.value as typeof cbKind)}><option value="cash_to_bank">واریز نقد صندوق به بانک</option><option value="bank_to_cash">برداشت از بانک به صندوق</option><option value="bank_deposit">واریز متفرقه به بانک</option><option value="bank_withdrawal">برداشت متفرقه از بانک</option></select></div>
            <div><label className={label}>مبلغ (تومان) *</label><input className={`${input} tabular-nums`} type="number" min={1} required value={cbAmount || ''} onChange={(e) => setCbAmount(Number(e.target.value))} /></div>
            <div><label className={label}>شمارهٔ مرجع</label><input className={input} value={cbRef} onChange={(e) => setCbRef(e.target.value)} /></div>
            <div className="md:col-span-3"><button className={primary} type="submit">ثبت تراکنش</button></div>
          </form>
          <table className="w-full text-right"><thead><tr className="text-stone-500"><th className="py-1">شماره</th><th>نوع</th><th>مبلغ</th><th>تاریخ</th><th>ثبت‌کننده</th></tr></thead><tbody>{state.cashBankTransactions.slice(0, 15).map((t) => (<tr key={t.id} className="border-t border-stone-100"><td className="py-1 font-mono">{t.number}</td><td>{t.kind}</td><td className="tabular-nums">{formatToman(t.amount)}</td><td>{toJalaliDateString(t.date)}</td><td>{t.recordedBy}</td></tr>))}</tbody></table>
          {state.cashBankTransactions.length === 0 && <p className="text-stone-500">هنوز تراکنشی ثبت نشده است.</p>}
        </div>
      )}

      {formId === 39 && (
        <div className="space-y-4">
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); try { onUpdateState(recordFinancialAdjustment(state, { retailerId: adjRetailer, kind: adjKind, amount: adjAmount, reason: adjReason }), 'تعدیل مالی ثبت شد.'); ok('تعدیل ثبت شد و در دفتر روزنامه آمد.'); setAdjAmount(0); setAdjReason(''); } catch (err) { bad(err); } }}>
            <div><label className={label}>فروشگاه</label><select className={input} value={adjRetailer} onChange={(e) => setAdjRetailer(e.target.value)}>{state.retailers.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.storeName}</option>)}</select></div>
            <div><label className={label}>نوع</label><select className={input} value={adjKind} onChange={(e) => setAdjKind(e.target.value as typeof adjKind)}><option value="credit_note">اعلامیهٔ بستانکار (کاهش بدهی)</option><option value="write_off">سوخت مطالبات</option><option value="debit_note">اعلامیهٔ بدهکار (افزایش بدهی)</option></select></div>
            <div><label className={label}>مبلغ (تومان) *</label><input className={`${input} tabular-nums`} type="number" min={1} required value={adjAmount || ''} onChange={(e) => setAdjAmount(Number(e.target.value))} /></div>
            <div><label className={label}>دلیل (الزامی) *</label><input className={input} required value={adjReason} onChange={(e) => setAdjReason(e.target.value)} /></div>
            <div className="md:col-span-2"><button className={primary} type="submit">ثبت تعدیل مالی</button></div>
          </form>
          <table className="w-full text-right"><thead><tr className="text-stone-500"><th className="py-1">شماره</th><th>فروشگاه</th><th>نوع</th><th>مبلغ</th><th>دلیل</th></tr></thead><tbody>{state.financialAdjustments.slice(0, 15).map((a) => (<tr key={a.id} className="border-t border-stone-100"><td className="py-1 font-mono">{a.number}</td><td>{state.retailers.find((r) => r.id === a.retailerId)?.storeName}</td><td>{a.kind}</td><td className="tabular-nums">{formatToman(a.amount)}</td><td>{a.reason}</td></tr>))}</tbody></table>
        </div>
      )}

      {formId === 41 && (
        <div className="space-y-4">
          <p className="text-stone-600">برای هر بازاریاب و هر فروشگاه یک حساب ورود بسازید. گذرواژه حداقل ۱۰ نویسه است و فقط به‌صورت هش ذخیره می‌شود؛ غیرفعال‌کردن حساب، نشست‌های باز را همان لحظه می‌بندد.</p>
          <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={async (e) => { e.preventDefault(); try { await api.createUser(nu); ok('حساب ساخته شد.'); setNu({ ...nu, username: '', password: '' }); reloadUsers(); } catch (err) { bad(err); } }}>
            <div><label className={label}>نوع</label><select className={input} value={nu.role} onChange={(e) => { const role = e.target.value as 'agent' | 'retailer'; setNu({ ...nu, role, entityId: (role === 'agent' ? state.agents[0]?.id : state.retailers[0]?.id) ?? '' }); }}><option value="agent">بازاریاب</option><option value="retailer">فروشگاه</option></select></div>
            <div><label className={label}>مرتبط با</label><select className={input} value={nu.entityId} onChange={(e) => setNu({ ...nu, entityId: e.target.value, fullName: nu.role === 'agent' ? state.agents.find((a) => a.id === e.target.value)?.fullName ?? '' : state.retailers.find((r) => r.id === e.target.value)?.ownerName ?? '' })}>{(nu.role === 'agent' ? state.agents.map((a) => ({ id: a.id, t: `${a.code} — ${a.fullName}` })) : state.retailers.map((r) => ({ id: r.id, t: `${r.code} — ${r.storeName}` }))).map((o) => <option key={o.id} value={o.id}>{o.t}</option>)}</select></div>
            <div><label className={label}>نام نمایشی</label><input className={input} required value={nu.fullName} onChange={(e) => setNu({ ...nu, fullName: e.target.value })} /></div>
            <div><label className={label}>نام کاربری (لاتین)</label><input className={`${input} font-mono`} dir="ltr" required value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} /></div>
            <div><label className={label}>گذرواژه (≥ ۱۰ نویسه)</label><input className={`${input} font-mono`} dir="ltr" type="password" autoComplete="new-password" minLength={10} required value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></div>
            <div className="flex items-end"><button className={primary} type="submit">ساخت حساب</button></div>
          </form>
          <table className="w-full text-right"><thead><tr className="text-stone-500"><th className="py-1">نام کاربری</th><th>نام</th><th>نقش</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>
            {users.map((u) => (<tr key={u.id} className="border-t border-stone-100"><td className="py-1 font-mono">{u.username}</td><td>{u.full_name}</td><td>{u.role}</td><td>{u.active ? 'فعال' : 'غیرفعال'}</td><td className="space-x-2 space-x-reverse">
              <button type="button" className="underline" onClick={async () => { try { await api.patchUser(u.id, { active: !u.active }); reloadUsers(); } catch (err) { bad(err); } }}>{u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button>
              <button type="button" className="underline" onClick={async () => { const pw = window.prompt('گذرواژهٔ تازه (حداقل ۱۰ نویسه):'); if (!pw) return; try { await api.patchUser(u.id, { password: pw }); ok('گذرواژه تغییر کرد.'); } catch (err) { bad(err); } }}>بازنشانی گذرواژه</button></td></tr>))}
          </tbody></table>
        </div>
      )}

      {formId === 42 && (
        <div className="space-y-3">
          <p className="text-stone-600">نقش‌ها در این نسخه ثابت‌اند (مدیر، بازاریاب، فروشگاه، مشتری) و روی سرور برای هر عملیات اعمال می‌شوند؛ ویرایش نقش‌های سفارشی هنوز پیاده‌سازی نشده است. جدول زیر همان قواعد اجراشدهٔ سرور است.</p>
          <table className="w-full text-right"><thead><tr className="text-stone-500"><th className="py-1">توانایی</th><th>مدیر</th><th>بازاریاب</th><th>فروشگاه</th><th>مشتری</th></tr></thead><tbody>
            {PERMISSIONS.map((p) => (<tr key={p.cap} className="border-t border-stone-100"><td className="py-1.5">{p.cap}</td>{[p.admin, p.agent, p.retailer, p.customer].map((v, i) => <td key={i} className={v ? 'text-emerald-700 font-bold' : 'text-stone-300'}>{v ? '✓' : '—'}</td>)}</tr>))}
          </tbody></table>
        </div>
      )}

      {formId === 43 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="font-bold">اعلان‌ها ({unread.length} خوانده‌نشده از {state.notifications.length})</span>
            <button type="button" className={primary} disabled={unread.length === 0} onClick={() => { try { onUpdateState(markNotificationsRead(state, {}), 'همهٔ اعلان‌ها خوانده شد.'); } catch (err) { bad(err); } }}>علامت‌گذاری همه به‌عنوان خوانده‌شده</button></div>
          <ul className="divide-y divide-stone-100">{state.notifications.slice(0, 30).map((n) => (<li key={n.id} className={`py-2 ${n.isRead ? 'text-stone-400' : ''}`}><strong>{n.title}</strong> — {n.message}</li>))}</ul>
          <p className="text-stone-500">پیامک (SMS) هنوز به سرویس‌دهنده وصل نشده است؛ در این نسخه فقط اعلان درون‌برنامه‌ای وجود دارد.</p>
        </div>
      )}

      {formId === 44 && (
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); try { onUpdateState(updateBusinessSettings(state, draft), 'تنظیمات ذخیره شد؛ اسناد قبلی تغییر نمی‌کنند.'); ok('تنظیمات ذخیره شد.'); } catch (err) { bad(err); } }}>
          <div><label className={label}>نام کسب‌وکار</label><input className={input} value={draft.businessName} onChange={(e) => setDraft({ ...draft, businessName: e.target.value })} /></div>
          <div><label className={label}>تلفن</label><input className={input} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
          <div className="md:col-span-2"><label className={label}>نشانی</label><input className={input} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></div>
          <div><label className={label}>ایمیل پشتیبانی</label><input className={input} value={draft.supportEmail} onChange={(e) => setDraft({ ...draft, supportEmail: e.target.value })} /></div>
          <div><label className={label}>آستانهٔ هشدار موجودی انبار (بسته)</label><input className={input} type="number" min={0} value={draft.lowStockWarningThreshold} onChange={(e) => setDraft({ ...draft, lowStockWarningThreshold: Number(e.target.value) })} /></div>
          <div><label className={label}>هزینهٔ ارسال (تومان)</label><input className={input} type="number" min={0} value={draft.defaultShippingFee} onChange={(e) => setDraft({ ...draft, defaultShippingFee: Number(e.target.value) })} /></div>
          <div><label className={label}>ارسال رایگان از مبلغ (تومان)</label><input className={input} type="number" min={0} value={draft.freeShippingThreshold} onChange={(e) => setDraft({ ...draft, freeShippingThreshold: Number(e.target.value) })} /></div>
          <div><label className={label}>دورهٔ تسویهٔ پیش‌فرض (روز)</label><input className={input} type="number" min={1} value={draft.settlementPeriodDays} onChange={(e) => setDraft({ ...draft, settlementPeriodDays: Number(e.target.value) })} /></div>
          <div><label className={label}>نرخ پیش‌فرض پورسانت (٪)</label><input className={input} type="number" min={0} max={100} value={draft.defaultCommissionRatePercent} onChange={(e) => setDraft({ ...draft, defaultCommissionRatePercent: Number(e.target.value) })} /></div>
          <div><label className={label}>انتساب پورسانت وصول</label><select className={input} value={draft.commissionAttributionPolicy} onChange={(e) => setDraft({ ...draft, commissionAttributionPolicy: e.target.value as typeof draft.commissionAttributionPolicy })}><option value="sales_agent">بازاریاب فروشنده</option><option value="collecting_agent">بازاریاب وصول‌کننده</option><option value="split_50_50">تقسیم ۵۰/۵۰</option></select></div>
          <div className="md:col-span-2"><button className={primary} type="submit">ذخیرهٔ تنظیمات</button></div>
        </form>
      )}

      {formId === 45 && (
        <div className="space-y-3">
          <p className="text-stone-700">فیلتر و خروجی گزارش‌ها در بخش «۲۰ گزارش مدیریتی» انجام می‌شود: بازهٔ زمانی، محصول، بازاریاب و فروشگاه را انتخاب کنید و خروجی CSV یا چاپ A4 همان فیلترها را اعمال می‌کند.</p>
          {onOpenReports && <button type="button" className={primary} onClick={onOpenReports}>رفتن به مرکز گزارش‌ها</button>}
        </div>
      )}
    </div>
  );
};
