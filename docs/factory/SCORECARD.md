# SCORECARD - Production-Ready B2B Date Distribution & Consignment Management Platform

> Before = baseline (first audit pass); After = 2026-10-31 after hardening, measured on the live deployment. Every number cites evidence.

| Dimension | Before | After | Evidence | Weakest point |
|---|---|---|---|---|
| Spec coverage (TRACE.md rows met with evidence / 47) | 0 | 8 met (R-01, 02, 03, 11, 39, I1, I3 and R-04 in part), 3 partial; most other rows still unverified | tests, live e2e, screenshots | most spec rows were not walked one by one yet |
| Correctness and tests | 4 | 7 | 32 unit/API tests (12 engine incl. hand-computed F-006/F-007/F-008, 20 API) + 12 browser tests; F-010 and 5 of 6 commission methods not individually tested | engine is large (2.3k lines); journal is a simple subledger |
| Security and access control | 0 | 7 | login + lockout, CSRF header, helmet/CSP, role replay tests, scoping tests, private files with real SHA-256; no independent review, no malware scan | no independent security review |
| Honesty | 5 | 7 | README states limits; demo watermark and simulated gateway labelled; placeholder forms replaced; policy question F-024 open | store sales reports auto-verify |
| UX, RTL/Persian, mobile, accessibility | 7 | 7 | desktop and mobile screenshots of every role, live; accessibility not measured (aria-labels added on icon buttons) | accessibility unmeasured; two browser prompts |
| Performance and resilience | 3 | 6 | main chunk 299 kB; Neon cold start works (live e2e); whole-ledger JSON per action; no offline test | whole-ledger read/write is a pilot-scale design |
| Operations (CI, deploy, env, rollback) | 1 | 8 | clean `npm ci` + lint + test + build green in CI; Vercel + Neon live; `/healthz`; docs/DEPLOY.md | no ledger backup/export |
| Documentation and handover | 4 | 7 | README, DEPLOY, ARCHITECTURE, factory docs | no Persian user guide |

Overall (after): **6.5 / 10** (capped by unwalked spec rows, unmeasured accessibility and the missing backup/export).
