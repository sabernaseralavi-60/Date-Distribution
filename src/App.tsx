import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Store,
  ShoppingBag,
  FileSpreadsheet,
  FolderKanban,
  Bell,
  RotateCcw,
  LogIn,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SaberCommerceState, UserRole, OfficialDocument } from './core/types';
import { createInitialSaberState } from './core/seed';
import {
  verifyRetailerPayment,
  payAgentCommission,
  uploadSignedDocumentAttachment,
  verifyOfficialDocument,
  computeInventorySummary,
  computeFinancialSummary,
} from './core/engine';
import { formatPersianNumber, formatToman } from './core/formatters';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AgentDashboardView } from './components/AgentDashboardView';
import { RetailerDashboardView } from './components/RetailerDashboardView';
import { CustomerStorefrontView } from './components/CustomerStorefrontView';
import { FormsCatalogHub } from './components/FormsCatalogHub';
import { ReportsAndSettingsView } from './components/ReportsAndSettingsView';
import { PrintableDocumentModal } from './components/PrintableDocumentModal';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallButton';
import {
  auth,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutFirebaseUser,
  loadUserLedgerSnapshot,
  saveUserLedgerSnapshot,
  User,
} from './lib/firebase';

const STORAGE_KEY = 'saber_dates_commerce_state_v1';

export default function App() {
  const [state, setState] = useState<SaberCommerceState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SaberCommerceState;
        if (parsed && parsed.products && parsed.agents && parsed.retailers) {
          return parsed;
        }
      }
    } catch {
      // Fallback to deterministic seed
    }
    return createInitialSaberState();
  });

  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [adminSubView, setAdminSubView] = useState<'dashboard' | 'forms45' | 'reports20'>(
    'dashboard'
  );
  const [selectedFormId, setSelectedFormId] = useState<number>(1);
  const [activeAgentId, setActiveAgentId] = useState<string>(state.agents[0]?.id || 'ag-01');
  const [activeRetailerId, setActiveRetailerId] = useState<string>(
    state.retailers[0]?.id || 'rt-01'
  );
  const [referralAgentCode, setReferralAgentCode] = useState<string | null>(null);
  const [inspectedDocId, setInspectedDocId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'local' | 'synced' | 'syncing'>('local');

  // Firebase Auth & Cloud Firestore Sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          setSyncStatus('syncing');
          const remoteState = await loadUserLedgerSnapshot(user.uid);
          if (remoteState && remoteState.version >= state.version) {
            setState(remoteState);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteState));
          } else {
            await saveUserLedgerSnapshot(user.uid, state);
          }
          setSyncStatus('synced');
        } catch {
          setSyncStatus('local');
        }
      } else {
        setSyncStatus('local');
      }
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleUpdateState = (nextState: SaberCommerceState, message?: string) => {
    setState(nextState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      // Ignore storage quota errors
    }
    if (firebaseUser) {
      setSyncStatus('syncing');
      saveUserLedgerSnapshot(firebaseUser.uid, nextState)
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('local'));
    }
    if (message) {
      showToast(message);
    }
  };

  const handleResetDemoData = () => {
    const fresh = createInitialSaberState();
    handleUpdateState(
      fresh,
      'داده‌های نمونه به وضعیت استاندارد اولیه (۲۰۰ بسته و ۱۴ میلیون تومان) بازنشانی شد.'
    );
  };

  const inspectedDocument: OfficialDocument | undefined = inspectedDocId
    ? state.documents.find((d) => d.id === inspectedDocId)
    : undefined;

  const invSummary = computeInventorySummary(state);
  const finSummary = computeFinancialSummary(state);
  const unreadNotifsCount = state.notifications.filter((n) => !n.isRead).length;

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col">
      <OfflineIndicator />

      {/* Top Executive Navigation Bar */}
      <header className="sticky top-0 z-40 bg-stone-950 text-stone-100 border-b border-stone-800 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-800 text-stone-950 font-extrabold flex items-center justify-center text-lg shadow-xs">
              ص
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  {state.settings.businessName}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-400/20 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  توزیع امانی B2B + فروش مستقیم B2C
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                تراز لحظه‌ای کل موجودی:{' '}
                <strong className="text-amber-300 tabular-nums">
                  {formatPersianNumber(invSummary.totalAccountedFor)} از{' '}
                  {formatPersianNumber(invSummary.initialAndInbound)} بسته
                </strong>{' '}
                | مطالبات وصول‌شده:{' '}
                <strong className="text-emerald-400 tabular-nums">
                  {formatToman(finSummary.totalVerifiedB2bCollections)}
                </strong>
              </p>
            </div>
          </div>

          {/* 4-Role Switcher Tabs */}
          <nav
            aria-label="انتخاب نقش کاربری"
            className="flex flex-wrap items-center gap-1.5 bg-stone-900 p-1.5 rounded-2xl border border-stone-800"
          >
            <button
              type="button"
              onClick={() => setActiveRole('admin')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeRole === 'admin'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              مدیر سیستم (Admin)
            </button>

            <button
              type="button"
              onClick={() => setActiveRole('agent')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeRole === 'agent'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              پنل بازاریاب (۶ بازاریاب)
            </button>

            <button
              type="button"
              onClick={() => setActiveRole('retailer')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeRole === 'retailer'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              پنل اختصاصی فروشگاه (۱۲ سوپرمارکت)
            </button>

            <button
              type="button"
              onClick={() => setActiveRole('customer')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeRole === 'customer'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              فروشگاه آنلاین و QR بسته (/p/piarom-600)
            </button>
          </nav>

          {/* Actions: Notifications, Reset Demo, PWA, Cloud Auth */}
          <div className="flex items-center gap-2">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white"
              title="اعلان‌ها و هشدارهای سامانه"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                  {formatPersianNumber(unreadNotifsCount)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetDemoData}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-300 text-xs font-semibold"
              title="بازنشانی داده‌های دمو به حالت استاندارد ۲۰۰ بسته"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">بازنشانی دمو</span>
            </button>

            {firebaseUser ? (
              <button
                type="button"
                onClick={() => signOutFirebaseUser()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/90 border border-emerald-700/60 text-emerald-200 text-xs font-semibold"
                title={`متصل به فضای ابری (${firebaseUser.email || ''})`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">خروج ({syncStatus === 'synced' ? 'ابری' : '...'})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signInWithGooglePopup().catch(() => {})}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 hover:border-amber-500 text-stone-200 text-xs font-semibold"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">همگام‌سازی ابری</span>
              </button>
            )}
          </div>
        </div>

        {/* Admin Sub-Navigation Bar when Admin role is active */}
        {activeRole === 'admin' && (
          <div className="bg-stone-900/90 border-t border-stone-800/80">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdminSubView('dashboard')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    adminSubView === 'dashboard'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  داشبورد جامع مدیریتی و تراز ۲۰۰ بسته
                </button>

                <button
                  type="button"
                  onClick={() => setAdminSubView('forms45')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    adminSubView === 'forms45'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  مرکز ۴۵ فرم عملیاتی و اجرایی (بخش ۳۸)
                </button>

                <button
                  type="button"
                  onClick={() => setAdminSubView('reports20')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    adminSubView === 'reports20'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  ۲۰ گزارش مدیریتی، دفتر روزنامه و تنظیمات مرکزی
                </button>
              </div>

              <div className="text-[11px] text-stone-400 flex items-center gap-3">
                <span>
                  محصول فعال: <strong className="text-stone-200">{state.products[0]?.name}</strong>
                </span>
                <span>
                  تسویه فروشگاه:{' '}
                  <strong className="text-amber-300 tabular-nums">
                    {formatToman(state.products[0]?.baseRetailerPrice || 200000)}
                  </strong>
                </span>
                <span>
                  فروش آنلاین B2C:{' '}
                  <strong className="text-emerald-300 tabular-nums">
                    {formatToman(state.products[0]?.directB2cPrice || 240000)}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 max-w-md bg-stone-900 text-white border border-amber-500/50 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2.5 text-xs font-semibold print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Slide-down Notifications Drawer */}
      {showNotifications && (
        <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 pt-3 print:hidden">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="text-xs font-extrabold text-stone-900">
                مرکز اعلان‌ها و هشدارهای هوشمند (کمبود موجودی، سررسید تسویه و تأیید اسناد)
              </h3>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="text-xs text-stone-500 hover:text-stone-900 font-bold"
              >
                بستن ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {state.notifications.slice(0, 6).map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs space-y-1"
                >
                  <div className="font-bold text-stone-900">{notif.title}</div>
                  <p className="text-stone-600 leading-relaxed">{notif.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 print:hidden">
        {activeRole === 'admin' && adminSubView === 'dashboard' && (
          <AdminDashboardView
            state={state}
            onOpenDocument={(doc) => setInspectedDocId(doc.id)}
            onVerifyPayment={(paymentId) => {
              const next = verifyRetailerPayment(state, { paymentId });
              handleUpdateState(
                next,
                'واریزی فروشگاه تأیید شد، از بدهی کسر گردید و پورسانت بازاریاب به صورت خودکار محاسبه شد.'
              );
            }}
            onPayCommission={(commissionId, amount) => {
              const next = payAgentCommission(state, {
                commissionId,
                amountToPay: amount,
                referenceNumber: `SHABA-${Date.now().toString().slice(-6)}`,
              });
              handleUpdateState(next, `پرداخت پورسانت به مبلغ ${formatToman(amount)} ثبت شد.`);
            }}
            onNavigateToForms={(formId) => {
              if (formId) setSelectedFormId(formId);
              setAdminSubView('forms45');
            }}
          />
        )}

        {activeRole === 'admin' && adminSubView === 'forms45' && (
          <FormsCatalogHub
            state={state}
            initialSelectedFormId={selectedFormId}
            onUpdateState={(next) =>
              handleUpdateState(next, 'فرم عملیاتی با موفقیت در دفتر کل ثبت و اعمال شد.')
            }
            onOpenDocument={(doc) => setInspectedDocId(doc.id)}
          />
        )}

        {activeRole === 'admin' && adminSubView === 'reports20' && (
          <ReportsAndSettingsView state={state} onUpdateState={handleUpdateState} />
        )}

        {activeRole === 'agent' && (
          <AgentDashboardView
            state={state}
            activeAgentId={activeAgentId}
            onSelectAgentId={setActiveAgentId}
            onUpdateState={handleUpdateState}
            onInspectDocument={(doc) => setInspectedDocId(doc.id)}
            onOpenReferralPreview={(code) => {
              setReferralAgentCode(code);
              setActiveRole('customer');
            }}
          />
        )}

        {activeRole === 'retailer' && (
          <RetailerDashboardView
            state={state}
            activeRetailerId={activeRetailerId}
            onSelectRetailerId={setActiveRetailerId}
            onUpdateState={handleUpdateState}
            onInspectDocument={(doc) => setInspectedDocId(doc.id)}
          />
        )}

        {activeRole === 'customer' && (
          <CustomerStorefrontView
            state={state}
            referralAgentCode={referralAgentCode}
            onClearReferral={() => setReferralAgentCode(null)}
            onSelectReferralCode={setReferralAgentCode}
            onUpdateState={handleUpdateState}
          />
        )}
      </main>

      {/* Printable Official A4 Document Modal */}
      {inspectedDocument && (
        <PrintableDocumentModal
          document={inspectedDocument}
          state={state}
          canVerify={activeRole === 'admin'}
          onClose={() => setInspectedDocId(null)}
          onUploadAttachment={(docId, file) => {
            const next = uploadSignedDocumentAttachment(state, {
              documentId: docId,
              filename: file.filename,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              uploadedBy:
                activeRole === 'admin'
                  ? 'مدیر سیستم'
                  : activeRole === 'agent'
                  ? 'بازاریاب'
                  : 'مسئول فروشگاه',
              previewDataUrl: file.previewDataUrl,
            });
            handleUpdateState(
              next,
              'تصویر امضاشده رسید بارگذاری شد و واترمارک شبیه‌سازی از روی سند برداشته شد.'
            );
          }}
          onVerifyDocument={(docId) => {
            const next = verifyOfficialDocument(state, {
              documentId: docId,
              adminName: 'مدیر سیستم (خرمای صابر)',
            });
            handleUpdateState(
              next,
              'سند رسمی تأیید نهایی شد و انتقال موجودی در کاردکس انبار ثبت گردید.'
            );
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200/80 py-4 mt-8 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <div>
            سامانه جامع توزیع امانی، مدیریت بازاریابان، اسناد چاپی A4 و فروش آنلاین{' '}
            <strong className="text-stone-800">{state.settings.businessName}</strong>
          </div>
          <div className="tabular-nums">
            نسخه ۱.۴۰۵ | پشتیبانی: {state.settings.phone} | تقویم رسمی شمسی
          </div>
        </div>
      </footer>
    </div>
  );
}
