# Requirement register - curated (intake 2026-10-31)

Source: `دستور اولیه.txt` (49 Parts). The heuristic skeleton is kept in TRACE_AUTO.md. IDs are stable from now on.
Status values: unverified | met | partial | missing | waived | owner-task. "met" needs evidence (file:line, test, screenshot). Rows marked `impl` are not in the spec.

| ID | Part | Requirement (short) | Status | Evidence / note |
|---|---|---|---|---|
| R-01 | 1 | Genuinely functional DATABASE-BACKED app, not mockups | missing | v0 keeps all state in browser localStorage (App.tsx) plus one Firestore doc per user; the Postgres DDL is unused |
| R-02 | 1,43 | User authentication | missing | role switch in the top bar, no login (App.tsx activeRole); the Google popup only syncs a snapshot |
| R-03 | 5,43 | Role-based access, server-side authorisation | missing | no server; scoping is UI-only |
| R-04 | 2.1 | Persian UI, RTL, Toman, Piarom 600 g, 200 demo packages; identity editable, not hardcoded | unverified | README/seed claim it; check business-profile editing |
| R-05 | 2.2 | Multi-product from the start; add a product with no code change | unverified | |
| R-06 | 2.3 | Two channels, A (B2B consignment) and B (B2C prepaid), shared inventory, separate settlement | unverified | |
| R-07 | 3 | Stack: Next.js, Drizzle/Neon, Zod+RHF, TanStack Table, Recharts, R2 storage abstraction, Vercel | partial | v0 = Vite SPA; spec says "Preferred" only; decision logged in STATE.md |
| R-08 | 3 | PWA, mobile-first, Jalali dates, Persian digits, UTC timestamps, central error handling, audit trail | unverified | PWA plugin present; check each |
| R-09 | 3 | Document free-tier limits; never promise unlimited | unverified | |
| R-10 | 4 | 28 independent modules | unverified | v0 has one 2k-line engine; judge modularity |
| R-11 | 4,11,33 | Financial and inventory operations on the server inside DB transactions | missing | engine runs in the browser |
| R-12 | 5 | Four roles with the exact capability lists (admin 19, agent 17, retailer 14, customer 8) | unverified | |
| R-13 | 6 | Central settings (name, logo, currency, markups, policies, numbering, thresholds...); history never changes silently | unverified | |
| R-14 | 7,8 | Product form (16 fields, validation, unique SKU) and pricing with effective/expiry dates and snapshots | unverified | |
| R-15 | 9 | Agent form and statuses; no deletion when history exists | unverified | |
| R-16 | 10 | Retailer form and statuses; referral keeps the acquisition agent; admin approval recorded | unverified | |
| R-17 | 11 | Locations (warehouse, agents, retailers, B2C, damaged); immutable movements; no negative stock; locking | unverified | immutability and locking cannot hold in a browser |
| R-18 | 12 | Custody modes A/B for agents and retailers; never silently switched; custody is not debt | unverified | |
| R-19 | 13 | Printable A4 Persian documents with number, QR, signatures, versions; editable wording with history | unverified | |
| R-20 | 14-17 | Forms 1-4 (agent receipt, retailer receipt, agent return, retailer return) with verify-after-signed-upload workflow and emergency exception | unverified | |
| R-21 | 18 | Retailer sales report: closing-balance validation, discrepancy, statuses, no duplicate sale | unverified | |
| R-22 | 19 | Retailer payment submission, FIFO allocation, partial, multi-invoice, only verified payments reduce receivables | unverified | |
| R-23 | 20,21 | Field collection receipt; agent-held cash tracked separately; remittance reconciliation | unverified | |
| R-24 | 22 | Restock request lifecycle; approval does not change stock | unverified | |
| R-25 | 23 | Visit report, outcomes, priority list | unverified | |
| R-26 | 24,25 | Discrepancy/damage and inventory-count forms; adjustments need approval | unverified | |
| R-27 | 26,27 | Commission rules per agent, 7 methods, snapshot, lifecycle, no duplicate, reversal, attribution vs collection agent policy | unverified | |
| R-28 | 28-31 | Storefront, guest checkout, order/payment statuses, simulated gateway clearly labelled, idempotency, fulfilment, refund reversals | unverified | |
| R-29 | 32 | Permanent /p/slug, QR print, /ref/AGENT tracking (scans, views, attribution history); no false attribution | unverified | |
| R-30 | 33 | Ledger: double-entry or auditable subledger; 5 reconciliation formulas; automated reconciliation tests | unverified | |
| R-31 | 34-36 | Admin (13 KPIs, 9 charts, 12 tables, filters), agent (13 KPIs, quick actions) and retailer dashboards; every number computed from data | unverified | |
| R-32 | 38 | 45 interactive forms: title, validation (client and server), loading, feedback, audit, no browser prompts | unverified | |
| R-33 | 39 | Document management: search/filter, preview, approve/reject, private attachments with hash/version, no permanent public links | missing | no file storage in v0 |
| R-34 | 40 | In-app notifications (agent 8, retailer 6, admin 8 types), read/unread, SMS adapter | unverified | |
| R-35 | 41 | 20 reports, CSV/Excel and printable, exports reflect filters | unverified | README says CSV + A4 print |
| R-36 | 42 | Relational schema (>= 56 tables), integer money, UTC, idempotency keys | partial | DDL file exists (365 lines), unused at runtime |
| R-37 | 43 | Security: private storage, MIME/size checks, rate limit, CSRF, audit, no secrets/passwords in logs; agent/retailer/customer isolation | missing | |
| R-38 | 44 | Visual identity (green/brown/cream/gold), Vazirmatn, role-specific navigation, empty states, skeletons, toasts, confirm dialogs, a11y | unverified | |
| R-39 | 45 | Deterministic demo data: 1 admin, 6 agents, 12 retailers, 20 customers; table 30/30/50/70/20 = 200; 14M / 10M / 4M Toman; commissions 5-8%; watermark on demo documents; demo credentials per role in README | partial | README claims the reconciliation; credentials per role absent (no login) |
| R-40 | 46 | 70 acceptance scenarios work end to end (groups below) | unverified | v0 engine test file covers groups in 6 tests |
| R-41 | 47,48 | Deliverables 1-27 incl. migrations, seeds, README, Neon/Vercel/storage instructions, known limitations; no false claim about integrations | unverified | |
| R-42 | 49 | Owner end-to-end demo scenario (create product ... agent commission ... QR prepaid order) | unverified | |
| R-I1 | impl | Reproducible install (lockfile, esbuild peer fix) and CI | missing | npm install fails as shipped |
| R-I2 | impl | Backup / full-data export and restore | missing | |
| R-I3 | impl | Privacy: PII (names, phones, addresses, IDs) protected; spec copy not served publicly | missing | spec copy in public/assets/aistudio |
| R-I4 | impl | Honest labels: simulated payment, demo data, "tested" claims backed by runs | unverified | |
| R-I5 | impl | Persian legal wording of custody/consignment documents reviewed by a human before real use | owner-task | not verifiable by the factory |

## Part 46 acceptance scenarios (the spec's own tests), status per group
| Group | Scenarios | Status |
|---|---|---|
| Product and pricing | 1-7 | unverified |
| Agent management | 8-12 | unverified (12 needs a real login) |
| Warehouse and signed documents | 13-20 | unverified (16-17 need a real upload) |
| Retailer delivery | 21-27 | unverified |
| Retailer sales | 28-32 | unverified |
| Payments and commissions | 33-40 | unverified |
| Field visits | 41-45 | unverified |
| Agent money collection | 46-50 | unverified |
| Returns and discrepancies | 51-55 | unverified |
| B2C | 56-63 | unverified |
| Security | 64-70 | unverified (64-66 need server-side roles) |
