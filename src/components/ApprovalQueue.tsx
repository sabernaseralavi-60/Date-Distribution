import React from 'react';
import { BadgeCheck } from 'lucide-react';
import type { SaberCommerceState } from '../core/types.ts';
import { approveCommission, approveRetailer, rejectRetailerPayment, verifyAgentRemittance } from '../core/engineClient.ts';
import { formatToman } from '../core/formatters.ts';

interface Props {
  state: SaberCommerceState;
  onUpdateState: (next: SaberCommerceState, message?: string) => void;
  onError: (message: string) => void;
}

const btn = 'rounded-lg px-2.5 py-1 text-[11px] font-bold';

/**
 * Administrator queue for the decisions the spec reserves to the owner (Parts 10, 19, 21, 27): store approvals, payment rejection,
 * agent cash remittances and commissions waiting for approval. v0 auto-approved all of them.
 */
export const ApprovalQueue: React.FC<Props> = ({ state, onUpdateState, onError }) => {
  const pendingStores = state.retailers.filter((r) => r.status === 'pending');
  const pendingRemits = state.agentRemittances.filter((r) => r.status === 'pending');
  const pendingComm = state.commissions.filter((c) => c.status === 'pending_verification' || c.status === 'calculated');
  const pendingPay = state.payments.filter((p) => p.status === 'pending');
  const total = pendingStores.length + pendingRemits.length + pendingComm.length + pendingPay.length;
  if (total === 0) return null;

  const run = (fn: () => SaberCommerceState, msg: string) => {
    try { onUpdateState(fn(), msg); } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
  };
  const ask = (q: string) => window.prompt(q)?.trim() || '';

  return (
    <section aria-label="صف تأیید مدیر" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/70 p-4 text-xs space-y-3">
      <h2 className="flex items-center gap-2 font-extrabold text-stone-900 text-sm"><BadgeCheck className="w-4 h-4 text-amber-700" /> صف تأیید مدیر ({total} مورد منتظر تصمیم شما)</h2>

      {pendingStores.length > 0 && (
        <div>
          <h3 className="font-bold mb-1">فروشگاه‌های در انتظار تأیید ({pendingStores.length})</h3>
          <ul className="space-y-1">{pendingStores.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-stone-200 px-3 py-2">
              <span><strong>{r.storeName}</strong> — {r.ownerName} — {r.mobile} — {r.city}، {r.district}</span>
              <span className="space-x-2 space-x-reverse">
                <button type="button" className={`${btn} bg-emerald-700 text-white`} onClick={() => run(() => approveRetailer(state, { retailerId: r.id, approve: true }), `فروشگاه «${r.storeName}» تأیید و فعال شد.`)}>تأیید</button>
                <button type="button" className={`${btn} bg-white border border-stone-300`} onClick={() => { const reason = ask('دلیل رد فروشگاه:'); if (reason) run(() => approveRetailer(state, { retailerId: r.id, approve: false, reason }), 'درخواست فروشگاه رد شد.'); }}>رد</button>
              </span>
            </li>))}</ul>
        </div>
      )}

      {pendingRemits.length > 0 && (
        <div>
          <h3 className="font-bold mb-1">وجوه تحویلی بازاریاب‌ها در انتظار تأیید ({pendingRemits.length})</h3>
          <ul className="space-y-1">{pendingRemits.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-stone-200 px-3 py-2">
              <span><strong>{state.agents.find((a) => a.id === r.agentId)?.fullName}</strong> — {formatToman(r.remittedAmount)} — مرجع: {r.transferReference}</span>
              <span className="space-x-2 space-x-reverse">
                <button type="button" className={`${btn} bg-emerald-700 text-white`} onClick={() => run(() => verifyAgentRemittance(state, { remittanceId: r.id, approve: true }), 'تحویل وجه تأیید شد.')}>تأیید</button>
                <button type="button" className={`${btn} bg-white border border-stone-300`} onClick={() => { const reason = ask('دلیل رد:'); if (reason) run(() => verifyAgentRemittance(state, { remittanceId: r.id, approve: false, reason }), 'تحویل وجه رد شد.'); }}>رد</button>
              </span>
            </li>))}</ul>
        </div>
      )}

      {pendingComm.length > 0 && (
        <div>
          <h3 className="font-bold mb-1">پورسانت‌های در انتظار تأیید ({pendingComm.length})</h3>
          <ul className="space-y-1">{pendingComm.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-stone-200 px-3 py-2">
              <span><strong>{state.agents.find((a) => a.id === c.agentId)?.fullName}</strong> — {formatToman(c.commissionAmount)} — {c.ruleNameSnapshot}</span>
              <span className="space-x-2 space-x-reverse">
                <button type="button" className={`${btn} bg-emerald-700 text-white`} onClick={() => run(() => approveCommission(state, { commissionId: c.id, approve: true }), 'پورسانت تأیید شد.')}>تأیید</button>
                <button type="button" className={`${btn} bg-white border border-stone-300`} onClick={() => { const reason = ask('دلیل رد پورسانت:'); if (reason) run(() => approveCommission(state, { commissionId: c.id, approve: false, reason }), 'پورسانت رد شد.'); }}>رد</button>
              </span>
            </li>))}</ul>
        </div>
      )}

      {pendingPay.length > 0 && (
        <div>
          <h3 className="font-bold mb-1">واریزی‌های در انتظار بررسی ({pendingPay.length}) - تأیید از «تأیید واریزی‌ها» در داشبورد؛ رد از اینجا</h3>
          <ul className="space-y-1">{pendingPay.slice(0, 8).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-stone-200 px-3 py-2">
              <span><strong>{state.retailers.find((r) => r.id === p.retailerId)?.storeName}</strong> — {formatToman(p.amount)} — مرجع: {p.referenceNumber}</span>
              <button type="button" className={`${btn} bg-white border border-stone-300`} onClick={() => { const reason = ask('دلیل رد واریزی:'); if (reason) run(() => rejectRetailerPayment(state, { paymentId: p.id, reason }), 'واریزی رد شد.'); }}>رد</button>
            </li>))}</ul>
        </div>
      )}
    </section>
  );
};
