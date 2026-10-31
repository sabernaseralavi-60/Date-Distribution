import React, { useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { api, type SessionUser } from '../api.ts';

interface Props {
  businessName: string;
  demo: boolean;
  onLoggedIn: (u: SessionUser) => void;
  onBack: () => void;
}

export const LoginView: React.FC<Props> = ({ businessName, demo, onLoggedIn, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api.login(username, password);
      onLoggedIn(r.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white border border-stone-200 rounded-3xl p-7 shadow-sm space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-900 text-amber-100 flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div>
        <div>
          <h1 className="text-lg font-extrabold text-stone-900">ورود به سامانهٔ {businessName}</h1>
          <p className="text-xs text-stone-500">مدیر، بازاریاب یا مسئول فروشگاه</p>
        </div>
      </div>
      {demo && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 leading-relaxed">
          این نسخه دمو است: داده‌ها نمونه‌اند و سند یا پرداخت آن اعتبار عملیاتی ندارد. نام کاربری و گذرواژهٔ دمو را مدیر سامانه به شما می‌دهد.
        </div>
      )}
      <form onSubmit={submit} className="space-y-4 text-sm">
        <div>
          <label className="block font-semibold text-stone-700 mb-1" htmlFor="login-user">نام کاربری</label>
          <input id="login-user" dir="ltr" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 font-mono" />
        </div>
        <div>
          <label className="block font-semibold text-stone-700 mb-1" htmlFor="login-pass">گذرواژه</label>
          <input id="login-pass" dir="ltr" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 font-mono" />
        </div>
        {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold px-3 py-2">{error}</div>}
        <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 text-white py-3 font-bold hover:bg-stone-800 disabled:opacity-50">
          <LogIn className="w-4 h-4" /> {busy ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>
      <button type="button" onClick={onBack} className="text-xs text-stone-500 underline">بازگشت به فروشگاه آنلاین</button>
    </div>
  );
};
