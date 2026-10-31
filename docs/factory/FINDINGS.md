# FINDINGS - Production-Ready B2B Date Distribution & Consignment Management Platform

> One row per finding confirmed by reading the code or running it (2026-10-31, first audit pass, baseline a3957d5).
> Severity: S1 data loss, security hole, wrong money/number, app unusable | S2 broken feature, misleading claim,
> major UX/a11y failure | S3 polish, maintainability. Status: open | fixed (commit) | wontfix (reason, owner-approved) | waived.
> Scope of this pass: architecture, auth/authorisation, the money/inventory engine paths for sales report, payment verification, commission, the forms hub, B2C order, role scoping, build/install, and a browser run (desktop 1366 and mobile 390, screenshots looked at). NOT yet audited line by line: documents/printing, QR, reports/CSV, visits, returns, remittance, notifications, PWA offline.

| ID | Sev | Area | Finding (what is wrong, where) | Evidence | Fix | Status |
|---|---|---|---|---|---|---|
| F-001 | S1 | Security | No authentication: the four roles are buttons in the top bar; any visitor is admin by default (`src/App.tsx:64` `activeRole` default `'admin'`, buttons at `:189-228`). Retailer/agent pickers ("تغییر فروشگاه (دمو)") let anyone open any retailer or agent. | Screenshot desktop-فروشگاه.png (dropdown, no login); spec Part 5/43 | Server-side login with sessions, roles from DB; remove the switch (keep an owner-only "view as" only if audited) | open |
| F-002 | S1 | Security/Data | The whole business ledger (products, agents, retailers, payments, journal, PII) is one JSON in browser `localStorage` (`App.tsx:44-58`, `:109-119`); any user can edit it and the app trusts it. | Playwright: all payments rewritten to amount 1 in localStorage, reload, page loads normally (report.json `tamper`); localStorage 112,798 bytes with 29 collections | Move state to a database behind an API; client keeps no ledger | open |
| F-003 | S1 | Architecture | Spec requires server-side DB transactions, locking, idempotency, no negative stock (Parts 4, 11, 42); engine runs in the browser with `state => state` copies (`engine.ts`); no concurrency control possible, two tabs/users overwrite each other (last write wins, `saveUserLedgerSnapshot` one doc per user, `firebase.ts:107-137`). | code read; Firestore doc keyed by uid, `version` compare only on login (`App.tsx:79-86`) | Move engine to the server inside Postgres transactions (row locks, unique idempotency keys) | open |
| F-004 | S1 | Security | `firestore.rules` hard-codes the owner e-mail as bootstrap admin (`firestore.rules:33`, `security_spec.md:19`) and the whole ledger of a user lives in one doc readable by that uid; the rules cover only a snapshot, not retailers/agents/customers as principals. | rules read; 12 rules tests pass but they test the snapshot model only | Replace with server auth; drop Firestore from the ledger path | open |
| F-005 | S1 | Install/Ops | `npm install` fails as shipped: `esbuild ^0.25` conflicts with Vite 8's optional peer `^0.27 \|\| ^0.28` (ERESOLVE). No `package-lock.json` (only `bun.lock`), no CI, no `test` script. | `npm install` output in scratch copy; with esbuild ^0.28 install, `tsc`, build and tests pass | Bump esbuild, commit lockfile, add `test`/CI scripts | open |
| F-006 | S1 | Correctness (money) | Commission is generated on `payment.amount` when no invoice absorbed the money: `allocatedTotal = sum(allocations) \|\| payment.amount` (`engine.ts:1504-1505`). An advance/overpayment (no open invoice) earns commission although nothing was settled; any amount above open invoices is also silently dropped (no credit balance record, `remainingToAllocate` unused after the loop, `:1449-1486`). | code read; hand case: open invoice 100, payment 150 -> allocation 100, commission on 100 but 50 vanishes; payment 50 with no invoice -> commission on 50 | Reject or record unallocated credit explicitly; commission only on allocated amounts (spec Part 27) | open |
| F-007 | S2 | Correctness | Commission ignores the commission method: `rule.rateOrAmount` is always read as a percentage (`:1496-1506`); the 7 methods of Part 26 (fixed per package, per new retailer, campaign, combination, thresholds, caps) are not implemented; commission `productId` is `state.products[0]` (`:1517`), so multi-product commissions are mis-attributed. | code read | Implement rule engine per method with snapshot | open |
| F-008 | S2 | Correctness | `isOverdue` is a stored flag set to `false` at creation and never recomputed from `dueDate` (`engine.ts:963,1313,1484`; seed sets it by hand `seed.ts:442`). New invoices never become overdue; dashboard "overdue receivables" (`engine.ts:179`) can only show seed values. | grep `isOverdue` (only writes are constants/seed) | Derive overdue from `dueDate` and the business clock | open |
| F-009 | S2 | Correctness | Ids and numbers use `Date.now()` and `list.length + 1` (e.g. `engine.ts:1167,1197,1260,1294-1299`): two actions in the same millisecond collide (`inv-tx-sale-...` and `inv-tx-dmg-...` share a clock), deleting/filtering would reuse numbers; the default idempotency key of a sales report includes `Date.now()` so it is not idempotent unless the caller passes a key (`:1165-1167`). | code read | UUIDs/DB sequences; numbering table; client-supplied idempotency keys required | open |
| F-010 | S2 | Correctness | Sales report period maths is not implemented: `receivedQuantity: 0`, `returnedQuantity: 0`, `periodStart = periodEnd = now` (`engine.ts:1210-1214`), so the Part 18 closing-stock formula (opening + receipts - returns - sales - damage) is not what is stored. | code read | Compute period from ledger movements | open |
| F-011 | S2 | Honesty/Spec | Forms 38, 39, 41, 42, 43, 44, 45 (cash/bank transaction, financial adjustment, user management, role/permission management, notification management, business settings, report filters) are not implemented: forms 37 and 38-45 (except 40) render the same business-name/phone + expense block (`FormsCatalogHub.tsx:1676-1766`), while the catalog lists them as distinct forms. Expense hard-codes category `packaging`, account "حساب جاری بانک ملت", recorder "مدیر سیستم". | code read; screenshot desktop-forms.png shows the catalogue of 45 | Implement each form per spec or mark honestly as not available; no placeholder entries | open |
| F-012 | S2 | Spec | Part 38 form list has overlapping UIs: forms 1/2 share one block, 4/5/8, 6/7, 9/10/30, 11/12/40, 13/14, 15/16/28/29, 17/18, 19/20, 21-27, 31-36 are handled by 13 UI blocks for 45 forms; per-form fields of the spec (e.g. product images, barcode, active flag, extra images) are missing from the product form. | `FormsCatalogHub.tsx` dispatch (`:344-1676`); screenshot shows product fields 1-14 but no images/barcode/status | Audit form by form against Parts 7-25 | open |
| F-013 | S2 | Security/Privacy | A verbatim copy of the owner's master prompt sits in `public/assets/aistudio/Paste_October_30__2026_-_10_04PM_1b041da9` (60,508 bytes, identical to the spec) and would be served to the public. | `cmp` identical; excluded from git in baseline | Delete from the repo and from any deploy | open (kept out of baseline) |
| F-014 | S2 | Security/Honesty | Signed-document upload is cosmetic: the UI reads the file with `FileReader` into a data URL kept inside the same localStorage JSON (`PrintableDocumentModal.tsx:55`, `engine.ts:797-853`); MIME/size checks exist (10 MB) but run only in the browser; the field `checksumSha256` is `computeSimpleChecksum(documentNumber-filename-time)`, not a hash of the file content (`engine.ts:831`), and `storageKey` is a made-up path. A few photos exhaust the ~5 MB localStorage quota (state saves then fail silently, `App.tsx:111-116`). Spec Part 39 needs private storage, real SHA-256, versions, no public links. | code read | Storage abstraction (local dev, S3/R2 prod) with real hash and server-side validation; metadata in DB | open |
| F-015 | S2 | Security | Public Firebase web key literal is in the shipped bundle (`firebase-applet-config.json:4`, 1 occurrence of `AIza` in `dist/assets/*.js`). Not a secret by design, but unrestricted keys can be abused. | grep of build | Restrict key by referrer/API in Google Cloud, or remove Firebase | open |
| F-016 | S2 | Correctness | B2C checkout hard-codes province and city "تهران" (`FormsCatalogHub.tsx:1537-1538`) and the first product (`state.products[0]`), ignoring the address fields required by Part 28. | code read | Collect fields; select product | open |
| F-017 | S2 | Honesty | README states "tested security rules", "70 acceptance criteria" and "fully reconciled"; the 6 engine tests exercise the in-memory engine only, the 12 rules tests exercise a Firestore snapshot model that the spec does not ask for, and nothing runs against a real DB, a real login or a browser. | tests run: 6/6 and 12/12 pass; README lines 4-5, 40-46 | Rewrite claims to match what is verified (VERIFIED.md) | open |
| F-018 | S2 | Spec | Postgres schema (`drizzle/0000_saber_dates_schema.sql`, 365 lines) is not used by any code; `dotenv`, `express`, `@google/genai`, `@firebase/eslint-plugin-security-rules` are unused or only partially used; `metadata.json` declares a server-side Gemini capability that does not exist (no server file). | `grep`, package.json; no `server.ts` | Use the schema (after review against Part 42 table list) or delete the unused parts | open |
| F-019 | S3 | Correctness | Journal entries are single debit/credit pairs with Persian free-text account names (`engine.ts:1318-1327,1537-1552`), no account ids, no balancing per entry set, no period close: a double-entry journal in name only (spec accepts "equivalent auditable subledger", so reconciliation tests are what matter). | code read | Chart of accounts + journal lines; reconciliation test per formula in Part 33 | open |
| F-020 | S3 | Engine | The "pure" engine reads the system clock in ~40 places (`new Date()`, `Date.now()`), so results are not deterministic and tests cannot pin dates; one `Math.random` SKU suggestion collides (`FormsCatalogHub.tsx:531`, trivial). | grep | Inject a clock | open |
| F-021 | S3 | Performance | Single 1.08 MB JS chunk (build warning); all roles and views ship to everyone, including admin forms to customers. | build output | Route-level code splitting | open |
| F-022 | S3 | UX | Toast overlays the footer on mobile/desktop; the role switch consumes the first screen on mobile (390 px) so the dashboard starts below the fold. | screenshots mobile-admin.png, desktop-فروشگاه.png | Layout polish after auth exists | open |

## Positive findings (verified, keep)
- Design system is coherent and RTL/Persian digit rendering is correct on desktop and mobile; no console errors in either viewport (report.json `errors: []`).
- The seeded dashboard reproduces the spec reconciliation: 200 packages = 30 + 30 + 50 + 70 + 20; B2B receivables 14,000,000, verified collections 10,000,000, open 4,000,000 Toman (screenshot desktop-admin.png), and the engine unit tests encode scenarios of Part 46.
- `tsc --noEmit` is clean and the production build works once the install is fixed.

## Triage of automatic candidates
| Candidate id | Where | Verdict | Why |
|---|---|---|---|
| SEC-KEY-GOOGLE | firebase-applet-config.json:4 | confirmed (low) -> F-015 | Firebase web key; public by design but must be restricted |
| HON-RANDOM | FormsCatalogHub.tsx:531 | confirmed (S3) -> F-020 | SKU suggestion only, not data fabrication |
| OPS-NO-HELMET / OPS-NO-RATELIMIT | package.json | not applicable yet | there is no server; becomes relevant after F-003 |
| QA-EMPTY-CATCH, QA-TODO | dev-dist/workbox-*.js | false positive | generated service worker (git-ignored) |
| HON-SIMULATE | CustomerStorefrontView, FormsCatalogHub, PrintableDocumentModal, engine, seed, types | partly reviewed | B2C payment is labelled simulated and the document watermark exists (`PrintableDocumentModal.tsx:178`); the remaining wordings still to read in the second pass |
| QA-TSANY | 13 uses of `any` | info | review in hardening |

## Status after hardening (2026-10-31, commits e7725f0, a43b740 and follow-ups; live URL https://saber-date-commerce.vercel.app)
| ID | Status | How it was closed / what remains |
|---|---|---|
| F-001 | fixed | real login (scrypt, HttpOnly signed cookie, lockout after 5 failures); role switcher removed. Tests: anonymous 401, wrong password, lockout; e2e login on live |
| F-002 | fixed | state lives only in PostgreSQL; `src/core/scope.ts` builds agent/store/customer views on the server. Tests: agent/store scoping, role replay (403), public catalogue has no cost/commission |
| F-003 | fixed | one atomic action endpoint, `SELECT ... FOR UPDATE`, idempotency keys; concurrent orders test: stock never negative |
| F-004 | fixed | Firebase and Firestore rules removed |
| F-005 | fixed | esbuild ^0.28, `package-lock.json`, `npm test` / `lint` / CI workflow (green) |
| F-006 | fixed | commission only on allocated money; unallocated excess kept as `unallocatedAmount` and applied to the next invoice; unit + API tests |
| F-007 | fixed (partly tested) | rule engine for collections %, sales %, fixed per package sold/settled, per new retailer, campaign, thresholds, caps, attribution policy incl. 50/50, reversal. Tested: fixed-per-package + cap + reversal; the other methods are implemented but not individually tested |
| F-008 | fixed | overdue derived from due date and clock (`isInvoiceOverdue`, `refreshOverdueFlags`); test with a pinned clock |
| F-009 | fixed | collision-free ids (`uid()`), retailer codes by max+1; the server requires an idempotency key per action |
| F-010 | fixed (not unit-tested) | period start/received/returned/opening computed from the movement ledger |
| F-011 | fixed (partly browser-tested) | forms 37-39, 41-45 are real forms (`AdminExtraForms.tsx`); e2e covers form 41 only; forms 38/39/43/44 were exercised by engine tests, not clicked |
| F-012 | open | product form still lacks images, barcode and active flag fields; forms share UI blocks (13 for 45 forms) |
| F-013 | fixed | file deleted; the Firebase config is also removed from the git history before the first push (history rewritten locally) |
| F-014 | fixed | server-side upload: magic-byte check, 3 MB limit, real SHA-256, versions, private download with role check; the simulated-upload button was removed. Limitation: bytes live in PostgreSQL |
| F-015 | fixed | Firebase removed (no key in the bundle) |
| F-016 | fixed | province/city fields in the admin B2C form, public checkout and store request; product chosen from the catalogue |
| F-017 | fixed | README rewritten to state only what is tested; `docs/ARCHITECTURE.md` lists departures and limitations |
| F-018 | fixed | unused Drizzle DDL, Gemini/Firebase/dotenv dependencies removed; real migrations in `server/migrations` |
| F-019 | open | journal entries are still single debit/credit pairs (documented limitation); Part 33 reconciliation formulas have tests |
| F-020 | fixed | injectable clock/actor/id seed in `src/core/runtime.ts` |
| F-021 | fixed | main chunk 299 kB (was 1,082 kB), panels lazy-loaded |
| F-022 | partly | demo selectors removed from agent/store panels; toast position unchanged (S3) |

### New findings found during hardening
| ID | Sev | Finding | Status |
|---|---|---|---|
| F-023 | S3 | rejection reasons and password reset use `window.prompt` (two places) although the prompt forbids browser dialogs | open |
| F-024 | policy | a store's own sales report auto-verifies and creates a receivable against itself (kept from v0); the prompt wants administrator verification of reports | open: owner decision |
| F-025 | S3 | the admin forms hub still pre-fills realistic sample values (e.g. a customer name) | open |
| F-026 | S2 | accessibility not measured; offline PWA not tested; no backup/export of the ledger (R-I2) | open |
