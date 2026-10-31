# Automatic scan - Production-Ready B2B Date Distribution & Consignment Management Platform (2026-10-31)

> Regex candidates and a stack profile. Nothing here is a finding until the code is read and the result is written into FINDINGS.md with evidence. Absence of a hit is not proof of absence.

## Profile

- git: **not a git repository**
- AI-Studio baseline markers: True; stack: @google/genai, express, firebase, react, tailwindcss, tsx, typescript, vite
- source size: 16524 lines; python files: 0; lockfile: NONE; node_modules: False
- tests: 2 test files, test script: False; CI workflow: False; Dockerfile: False
- .env.example: True; .gitignore covers .env: True; covers .aistudio: False
- RTL support detected: True; docs: 5 files
- risk flags (files): {'auth': 1, 'money': 8, 'pii': 13, 'offline': 3, 'database': 3}
- **recommended depth: deep** (score 8; auth/money/PII/multi-tenant = 2 each, >5k LOC = 1, >15k LOC = +1, AI = 1; >=4 deep, >=2 standard)

Flag evidence (first files):
  - auth: src/App.tsx
  - money: src/components/AdminDashboardView.tsx, src/components/AgentDashboardView.tsx, src/components/CustomerStorefrontView.tsx, src/components/FormsCatalogHub.tsx, src/components/RetailerDashboardView.tsx, src/core/engine.ts
  - pii: index.html, src/App.tsx, src/components/AdminDashboardView.tsx, src/components/AgentDashboardView.tsx, src/components/CustomerStorefrontView.tsx, src/components/FormsCatalogHub.tsx
  - offline: dev-dist/registerSW.js, dev-dist/workbox-afac4cd2.js, src/components/PWAInstallButton.tsx
  - database: eslint.config.mjs, src/App.tsx, src/lib/firebase.ts

## Structural gaps

- no git repository (init before any change; first commit = untouched baseline)
- no lockfile (builds are not reproducible)
- no `test` script in package.json
- no CI workflow
- .aistudio/ is not git-ignored (builder artifacts and screenshots must not be pushed)

## Pattern candidates (38)

| sev | id | where | note |
|---|---|---|---|
| high | SEC-KEY-GOOGLE | firebase-applet-config.json:4 | Google API key literal |
| med | HON-RANDOM | src/components/FormsCatalogHub.tsx:531 | randomness in a production path: may fabricate data |
| med | OPS-NO-HELMET | package.json:1 | express without helmet (security headers) |
| med | OPS-NO-RATELIMIT | package.json:1 | express without a rate limiter |
| med | QA-EMPTY-CATCH | dev-dist/workbox-afac4cd2.js:6 | empty catch swallows errors |
| med | QA-EMPTY-CATCH | dev-dist/workbox-afac4cd2.js:459 | empty catch swallows errors |
| med | QA-EMPTY-CATCH | dev-dist/workbox-afac4cd2.js:1546 | empty catch swallows errors |
| med | QA-EMPTY-CATCH | dev-dist/workbox-afac4cd2.js:2140 | empty catch swallows errors |
| med | QA-EMPTY-CATCH | dev-dist/workbox-afac4cd2.js:2424 | empty catch swallows errors |
| med | QA-EMPTY-CATCH | dev-dist/workbox-afac4cd2.js:3298 | empty catch swallows errors |
| low | HON-SIMULATE | src/components/CustomerStorefrontView.tsx:19 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/components/CustomerStorefrontView.tsx:84 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/components/CustomerStorefrontView.tsx:148 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/components/CustomerStorefrontView.tsx:406 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/components/CustomerStorefrontView.tsx:483 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/components/FormsCatalogHub.tsx:28 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/components/FormsCatalogHub.tsx:1534 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/components/PrintableDocumentModal.tsx:72 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/components/PrintableDocumentModal.tsx:126 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/components/PrintableDocumentModal.tsx:175 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/core/engine.ts:1735 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/core/engine.ts:1736 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/core/engine.ts:1823 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/core/seed.ts:610 | simulated/fake data wording: check it is labelled in the UI |
| low | HON-SIMULATE | src/core/types.ts:526 | simulated/fake data wording: check it is labelled in the UI |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:770 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:1145 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:1586 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:1593 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:1671 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:1677 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:1692 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:2718 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:2808 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:2830 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:3383 | unfinished marker |
| low | QA-TODO | dev-dist/workbox-afac4cd2.js:3395 | unfinished marker |
| info | QA-TSANY | (many):0 | 13 uses of TypeScript any |
