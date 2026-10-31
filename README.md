# خرمای صابر — سامانه مدیریت پخش امانی، میدان، انبار، دفتر مالی و فروش مستقیم

Persian (RTL) web application for a date distributor: consignment distribution to supermarkets through field agents, signed
delivery documents, a stock ledger with custody levels, receivables with FIFO allocation, commissions, and a direct (B2C) shop
with a packaging QR landing page.

> **Status (honest):** a working multi-user application with real logins, a server-side ledger and a PostgreSQL database.
> It is built from the owner's master prompt (`دستور اولیه`, not in this repository). The B2C payment gateway is a **labelled
> simulation** (no money moves), SMS is not connected, and the schema is an auditable ledger aggregate rather than the 56 normalised
> tables of the prompt. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (limitations) and [docs/factory/VERIFIED.md](docs/factory/VERIFIED.md)
> (what has actually been tested and what has not).

## What is in it
* **Roles (enforced on the server):** administrator, sales agent, store (supermarket); customers shop without an account.
* **Ledger engine** (`src/core/engine.ts`): products and pricing snapshots, immutable stock movements with custody locations, signed
  documents (printable A4, upload of the signed copy, administrator verification), retailer sales reports, payments with FIFO
  allocation and advance credit, commission rules (percent of collections / sales, fixed per package, per new store, campaign, caps,
  thresholds, reversal), agent cash and remittance reconciliation, B2C orders, expenses, cash/bank transactions and financial
  adjustments, notifications.
* **Server** (`server/`): Express + PostgreSQL (Neon in production, embedded PGlite for local development), sessions in an HttpOnly
  cookie, scrypt password hashes, lockout after 5 failures, CSRF header, rate limits, helmet/CSP, audit log, idempotency keys,
  row-locked transactions, private file storage with real SHA-256 and content sniffing.
* **UI** (`src/`): Vite + React + Tailwind, Vazirmatn font (self-hosted), PWA.

## Run locally
```bash
npm ci
cp .env.example .env        # then fill SESSION_SECRET, ADMIN_PASSWORD (>= 10 chars) and, for the demo, SEED_DEMO=true + SEED_PASSWORD
npm run build
npm start                   # http://localhost:3000  (embedded database in ./data)
```
Demo logins when `SEED_DEMO=true`: administrator = `ADMIN_USERNAME`/`ADMIN_PASSWORD`; agents `agent1`..`agent6` and stores `rt01`..`rt12`
all use `SEED_PASSWORD`. **Never enable the demo on a real business.** The demo reproduces the reconciliation of the prompt
(200 packages = 30 warehouse + 30 agents + 50 stores + 70 sold through stores + 20 sold online; receivables 14,000,000, collected 10,000,000,
open 4,000,000 Toman).

## Test
```bash
npm run lint      # tsc --noEmit
npm test          # engine unit tests (hand-computed cases) + API tests incl. role replay, scoping, idempotency, uploads
npm run e2e       # real browser against the production build (needs: npx playwright install chromium)
```

## Deploy
See [docs/DEPLOY.md](docs/DEPLOY.md): Neon database + Vercel (free tiers), environment variables, file storage, rollback.

## Known limitations
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Short list: simulated payment gateway; no SMS; files are stored in PostgreSQL (3 MB each,
move to S3/R2 for volume); documents' legal wording must be reviewed by a human before real use; free-tier limits of Vercel and Neon apply.
