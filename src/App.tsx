import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  FileSpreadsheet,
  Bell,
  RotateCcw,
  LogIn,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  ShoppingBag,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import type { OfficialDocument, SaberCommerceState } from './core/types.ts';
import {
  computeFinancialSummary,
  computeInventorySummary,
  isPending,
  markNotificationsRead,
  payAgentCommission,
  verifyOfficialDocument,
  verifyRetailerPayment,
} from './core/engineClient.ts';
import { formatPersianNumber, formatToman } from './core/formatters.ts';
import { api, ApiError, newKey, type PublicCatalog, type SessionUser } from './api.ts';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton.tsx';
import { LoginView } from './components/LoginView.tsx';
import { ApprovalQueue } from './components/ApprovalQueue.tsx';

// role panels are split into their own chunks: a customer never downloads the administrator code (F-021)
const AdminDashboardView = lazy(() => import('./components/AdminDashboardView.tsx').then((m) => ({ default: m.AdminDashboardView })));
const AgentDashboardView = lazy(() => import('./components/AgentDashboardView.tsx').then((m) => ({ default: m.AgentDashboardView })));
const RetailerDashboardView = lazy(() => import('./components/RetailerDashboardView.tsx').then((m) => ({ default: m.RetailerDashboardView })));
const CustomerStorefrontView = lazy(() => import('./components/CustomerStorefrontView.tsx').then((m) => ({ default: m.CustomerStorefrontView })));
const FormsCatalogHub = lazy(() => import('./components/FormsCatalogHub.tsx').then((m) => ({ default: m.FormsCatalogHub })));
const ReportsAndSettingsView = lazy(() => import('./components/ReportsAndSettingsView.tsx').then((m) => ({ default: m.ReportsAndSettingsView })));
const PrintableDocumentModal = lazy(() => import('./components/PrintableDocumentModal.tsx').then((m) => ({ default: m.PrintableDocumentModal })));

type Route = { kind: 'home' } | { kind: 'login' } | { kind: 'product'; slug: string } | { kind: 'ref'; code: string };

function parseRoute(path: string): Route {
  const p = /^\/p\/([^/]+)\/?$/.exec(path);
  if (p) return { kind: 'product', slug: decodeURIComponent(p[1]) };
  const r = /^\/ref\/([^/]+)\/?$/.exec(path);
  if (r) return { kind: 'ref', code: decodeURIComponent(r[1]) };
  if (path === '/login') return { kind: 'login' };
  return { kind: 'home' };
}

const Spinner = () => <div className="py-20 text-center text-sm text-stone-500" role="status">در حال بارگذاری...</div>;

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [state, setState] = useState<SaberCommerceState | null>(null);
  const [demo, setDemo] = useState(false);
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);

  const [adminSubView, setAdminSubView] = useState<'dashboard' | 'forms45' | 'reports20'>('dashboard');
  const [selectedFormId, setSelectedFormId] = useState<number>(1);
  const [inspectedDocId, setInspectedDocId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const showToast = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast((t) => (t && t.text === text ? null : t)), error ? 8000 : 4500);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setRoute(parseRoute(to));
  };
  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const loadState = useCallback(async () => {
    const r = await api.state();
    setState(r.state);
    setDemo(r.demo);
  }, []);

  // restore a session (HttpOnly cookie) at start
  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setUser(me.user);
        if (me.user) await loadState();
      } catch {
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, [loadState]);

  // public catalogue for the storefront and the login page
  const refCode = route.kind === 'ref' ? route.code : null;
  useEffect(() => {
    if (user && route.kind === 'home') return;
    api.catalog(refCode ?? undefined).then(setCatalog).catch(() => setCatalog(null));
    if (route.kind === 'product') api.event('qr_scan', route.slug);
    if (route.kind === 'ref') api.event('referral_visit', route.code);
  }, [route.kind, refCode, user]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Sends the recorded engine calls to the server in one atomic request and shows the server's answer. The optimistic copy
   * the forms produced is replaced by the authoritative scoped state; on failure the screen is reloaded from the server.
   */
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const commit = useCallback((next: SaberCommerceState, message?: string): Promise<void> => {
    if (!isPending(next)) return Promise.resolve();
    const { __pending, __steps, ...local } = next;
    void __pending;
    setState(local as SaberCommerceState);
    const key = newKey();
    const run = async () => {
      setSyncing(true);
      try {
        const res = await api.act(__steps.map((s) => ({ fn: s.fn, input: s.input as Record<string, unknown>, seed: s.seed })), key);
        setState(res.state);
        if (message) showToast(message);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'عملیات انجام نشد.', true);
        if (err instanceof ApiError && err.status === 401) { setUser(null); setState(null); } else { await loadState().catch(() => {}); }
        throw err;
      } finally {
        setSyncing(false);
      }
    };
    const p = chain.current.then(run, run);
    chain.current = p.catch(() => {});
    return p.catch(() => {});
  }, [loadState, showToast]);

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    setState(null);
    setInspectedDocId(null);
    navigate('/');
  };

  const onLoggedIn = async (u: SessionUser) => {
    setUser(u);
    await loadState();
    navigate('/');
  };

  const inspectedDocument: OfficialDocument | undefined = state && inspectedDocId ? state.documents.find((d) => d.id === inspectedDocId) : undefined;

  // ------------------------------------------------------------------ public pages (no account needed)
  if (booting) return <Spinner />;

  const publicShell = (children: React.ReactNode) => (
    <div dir="rtl" className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col">
      <header className="bg-stone-950 text-stone-100 border-b border-stone-800">
        <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-800 text-stone-950 font-extrabold flex items-center justify-center text-lg">ص</span>
            <span className="font-extrabold text-white">{catalog?.business.businessName ?? 'خرمای صابر'}</span>
          </a>
          <button type="button" onClick={() => navigate('/login')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 hover:border-amber-500 text-stone-200 text-xs font-semibold">
            <LogIn className="w-3.5 h-3.5 text-amber-400" /> ورود کارکنان
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 py-6">{children}</main>
      <footer className="bg-white border-t border-stone-200/80 py-4 text-xs text-stone-500">
        <div className="max-w-[1100px] mx-auto px-4">
          {catalog?.business.businessName} · {catalog?.business.phone} · {catalog?.business.address}
          {catalog?.simulatedPayment && <span className="block mt-1 text-amber-800">درگاه پرداخت این نسخه آزمایشی است؛ پولی دریافت نمی‌شود.</span>}
        </div>
      </footer>
    </div>
  );

  if (!user) {
    if (route.kind === 'login') {
      return publicShell(<LoginView businessName={catalog?.business.businessName ?? 'خرمای صابر'} demo={Boolean(catalog?.simulatedPayment)} onLoggedIn={onLoggedIn} onBack={() => navigate('/')} />);
    }
    return publicShell(
      catalog ? (
        <Suspense fallback={<Spinner />}>
          <CustomerStorefrontView catalog={catalog} referralAgentCode={route.kind === 'ref' ? route.code : null} />
        </Suspense>
      ) : (
        <Spinner />
      )
    );
  }

  // ------------------------------------------------------------------ signed-in panels
  if (!state) return <Spinner />;
  const role = user.role;
  const invSummary = computeInventorySummary(state);
  const finSummary = computeFinancialSummary(state);
  const unread = state.notifications.filter((n) => !n.isRead);

  if (route.kind === 'product' || route.kind === 'ref') {
    return publicShell(
      catalog ? (
        <Suspense fallback={<Spinner />}>
          <button type="button" onClick={() => navigate('/')} className="mb-4 text-xs underline text-stone-600">← بازگشت به پنل {user.fullName}</button>
          <CustomerStorefrontView catalog={catalog} referralAgentCode={route.kind === 'ref' ? route.code : null} />
        </Suspense>
      ) : (
        <Spinner />
      )
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col">
      <OfflineIndicator />

      <header className="sticky top-0 z-40 bg-stone-950 text-stone-100 border-b border-stone-800 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-800 text-stone-950 font-extrabold flex items-center justify-center text-lg shadow-xs">ص</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">{state.settings.businessName}</span>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-400/20 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  {role === 'admin' ? 'مدیر سیستم' : role === 'agent' ? 'بازاریاب' : 'فروشگاه'} — {user.fullName}
                </span>
                {demo && <span className="text-[11px] px-2 py-0.5 rounded-md bg-red-500/15 text-red-300 border border-red-400/30 font-bold">نسخهٔ دمو</span>}
              </div>
              {role === 'admin' && (
                <p className="text-[11px] text-stone-400">
                  تراز لحظه‌ای کل موجودی:{' '}
                  <strong className="text-amber-300 tabular-nums">{formatPersianNumber(invSummary.totalAccountedFor)} از {formatPersianNumber(invSummary.initialAndInbound)} بسته</strong>{' '}
                  | مطالبات وصول‌شده: <strong className="text-emerald-400 tabular-nums">{formatToman(finSummary.totalVerifiedB2bCollections)}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncing && <span className="text-[11px] text-amber-300" role="status">در حال ثبت روی سرور...</span>}
            <PWAInstallButton />
            <button type="button" onClick={() => navigate(`/p/${state.products[0]?.slug ?? ''}`)} className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white text-xs font-semibold" title="مشاهدهٔ فروشگاه عمومی">
              <ShoppingBag className="w-3.5 h-3.5" /><span className="hidden lg:inline">فروشگاه عمومی</span>
            </button>
            <button type="button" onClick={() => setShowNotifications(!showNotifications)} aria-label="اعلان‌ها" className="relative p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white" title="اعلان‌ها">
              <Bell className="w-4 h-4" />
              {unread.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[10px] font-extrabold flex items-center justify-center tabular-nums">{formatPersianNumber(unread.length)}</span>}
            </button>
            {role === 'admin' && demo && (
              <button type="button" onClick={async () => { if (!window.confirm('همهٔ داده‌های دمو به حالت اولیه برمی‌گردد. ادامه می‌دهید؟')) return; try { const r = await api.resetDemo(); setState(r.state); showToast('داده‌های دمو بازنشانی شد.'); } catch (e) { showToast(e instanceof Error ? e.message : 'انجام نشد', true); } }} className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-300 text-xs font-semibold" title="بازنشانی داده‌های دمو">
                <RotateCcw className="w-3.5 h-3.5" /><span className="hidden xl:inline">بازنشانی دمو</span>
              </button>
            )}
            <button type="button" aria-label="تغییر گذرواژه" onClick={() => setShowPassword(true)} className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white text-xs font-semibold" title="تغییر گذرواژه">
              <KeyRound className="w-3.5 h-3.5" />
            </button>
            <button type="button" aria-label="خروج" onClick={logout} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs font-semibold">
              <LogOut className="w-3.5 h-3.5" /><span className="hidden md:inline">خروج</span>
            </button>
          </div>
        </div>

        {role === 'admin' && (
          <div className="bg-stone-900/90 border-t border-stone-800/80">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2">
              {([
                ['dashboard', LayoutDashboard, 'داشبورد جامع مدیریتی'],
                ['forms45', FolderKanban, 'مرکز ۴۵ فرم عملیاتی (بخش ۳۸)'],
                ['reports20', FileSpreadsheet, '۲۰ گزارش مدیریتی، دفتر روزنامه و تنظیمات'],
              ] as const).map(([id, Icon, text]) => (
                <button key={id} type="button" onClick={() => setAdminSubView(id)} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${adminSubView === id ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-stone-400 hover:text-white'}`}>
                  <Icon className="w-3.5 h-3.5" />{text}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {toast && (
        <div role="status" className={`fixed bottom-5 left-5 z-50 max-w-md rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2.5 text-xs font-semibold print:hidden border ${toast.error ? 'bg-red-950 text-red-100 border-red-500/60' : 'bg-stone-900 text-white border-amber-500/50'}`}>
          {toast.error ? <AlertCircle className="w-4 h-4 text-red-400 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      )}

      {showNotifications && (
        <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 pt-3 print:hidden">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="text-xs font-extrabold text-stone-900">اعلان‌ها ({formatPersianNumber(unread.length)} خوانده‌نشده)</h3>
              <span className="space-x-3 space-x-reverse">
                {unread.length > 0 && <button type="button" onClick={() => commit(markNotificationsRead(state, {}))} className="text-xs text-stone-600 underline">همه خوانده شد</button>}
                <button type="button" onClick={() => setShowNotifications(false)} className="text-xs text-stone-500 hover:text-stone-900 font-bold">بستن ✕</button>
              </span>
            </div>
            {state.notifications.length === 0 && <p className="text-xs text-stone-500">اعلانی وجود ندارد.</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {state.notifications.slice(0, 6).map((n) => (
                <div key={n.id} className={`p-3 rounded-xl border text-xs space-y-1 ${n.isRead ? 'bg-stone-50 border-stone-200/80' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="font-bold text-stone-900">{n.title}</div>
                  <p className="text-stone-600 leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 print:hidden">
        <Suspense fallback={<Spinner />}>
          {role === 'admin' && adminSubView === 'dashboard' && (
            <>
              <ApprovalQueue state={state} onUpdateState={commit} onError={(m) => showToast(m, true)} onOpenDocument={(d) => setInspectedDocId(d.id)} />
              <AdminDashboardView
                state={state}
                onOpenDocument={(doc) => setInspectedDocId(doc.id)}
                onVerifyPayment={(paymentId) => commit(verifyRetailerPayment(state, { paymentId }), 'واریزی تأیید شد: از بدهی کسر و پورسانت مجاز محاسبه گردید.')}
                onPayCommission={(commissionId, amount) => commit(payAgentCommission(state, { commissionId, amountToPay: amount, referenceNumber: `SHABA-${Date.now().toString().slice(-6)}` }), `پرداخت پورسانت به مبلغ ${formatToman(amount)} ثبت شد.`)}
                onNavigateToForms={(formId) => { if (formId) setSelectedFormId(formId); setAdminSubView('forms45'); }}
              />
            </>
          )}
          {role === 'admin' && adminSubView === 'forms45' && (
            <FormsCatalogHub state={state} initialSelectedFormId={selectedFormId} onUpdateState={(next, msg) => commit(next, msg ?? 'فرم ثبت شد.')} onOpenDocument={(doc) => setInspectedDocId(doc.id)} onOpenReports={() => setAdminSubView('reports20')} />
          )}
          {role === 'admin' && adminSubView === 'reports20' && <ReportsAndSettingsView state={state} onUpdateState={commit} />}

          {role === 'agent' && (
            <AgentDashboardView
              state={state}
              activeAgentId={user.entityId ?? ''}
              onSelectAgentId={() => {}}
              onUpdateState={commit}
              onInspectDocument={(doc) => setInspectedDocId(doc.id)}
              onOpenReferralPreview={(code) => window.open(`/ref/${encodeURIComponent(code)}`, '_blank', 'noopener')}
            />
          )}
          {role === 'retailer' && (
            <RetailerDashboardView state={state} activeRetailerId={user.entityId ?? ''} onSelectRetailerId={() => {}} onUpdateState={commit} onInspectDocument={(doc) => setInspectedDocId(doc.id)} />
          )}
        </Suspense>
      </main>

      {inspectedDocument && (
        <Suspense fallback={null}>
          <PrintableDocumentModal
            document={inspectedDocument}
            state={state}
            canVerify={role === 'admin'}
            onClose={() => setInspectedDocId(null)}
            onUploadAttachment={async (docId, file) => {
              const r = await api.upload(docId, file.filename, file.dataBase64);
              setState(r.state);
            }}
            onVerifyDocument={async (docId) => {
              await commit(verifyOfficialDocument(state, { documentId: docId, adminName: user.fullName }), 'سند رسمی تأیید شد و انتقال موجودی در کاردکس ثبت گردید.');
            }}
          />
        </Suspense>
      )}

      {showPassword && <PasswordDialog onClose={() => setShowPassword(false)} onDone={() => { setShowPassword(false); setUser(null); setState(null); navigate('/login'); }} />}

      <footer className="bg-white border-t border-stone-200/80 py-4 mt-8 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <div>سامانهٔ مدیریت توزیع امانی، بازاریابان، اسناد A4 و فروش آنلاین <strong className="text-stone-800">{state.settings.businessName}</strong></div>
          <div className="tabular-nums">پشتیبانی: {state.settings.phone} | تقویم شمسی</div>
        </div>
      </footer>
    </div>
  );
}

function PasswordDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تغییر گذرواژه">
      <form
        className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          try { await api.changePassword(current, next); onDone(); } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'انجام نشد'); }
        }}
      >
        <h2 className="font-extrabold">تغییر گذرواژه</h2>
        <input dir="ltr" type="password" autoComplete="current-password" required placeholder="گذرواژهٔ فعلی" value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono" />
        <input dir="ltr" type="password" autoComplete="new-password" required minLength={10} placeholder="گذرواژهٔ تازه (حداقل ۱۰ نویسه)" value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono" />
        {err && <div role="alert" className="text-xs text-red-700 font-semibold">{err}</div>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold">انصراف</button>
          <button type="submit" className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold">ذخیره (پس از تغییر دوباره وارد شوید)</button>
        </div>
      </form>
    </div>
  );
}
