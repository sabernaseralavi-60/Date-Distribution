# STATE - Production-Ready B2B Date Distribution & Consignment Management Platform (web app factory)

> The factory resumes from this file. Update it at every stage boundary and at session end.
> Resume phrase: «کارخانه وب اپ: ادامه» (skill `webapp-factory`).

## Where we are
- Stage: **1-intake DONE (2026-10-31)** -> next: 2-audit
- Created: 2026-10-31   Last session: 2026-10-31
- Depth: **deep**   reason: scan score 8 = auth 2 + money 2 + PII 2 + >5k LOC 1 + >15k LOC 1 (16.5k lines); owner-facing financial ledger and signed legal-ish documents.
- Baseline: untouched first commit = **a3957d5** ("baseline: builder output (untouched)", 41 files). Builder: Google AI Studio.
- VS Code colour: sky (set by `vscode_color.py`; `.vscode/` git-ignored).

## Inputs
- Spec: `دستور اولیه.txt` (ChatGPT "MASTER BUILD PROMPT", 2,530 lines, 49 Parts, 45 forms, 70 acceptance tests in Part 46, deterministic demo reconciliation in Part 45). Kept OUT of git (default). Register: `docs/factory/TRACE.md` (curated) + `TRACE_AUTO.md` (heuristic skeleton, 414 rows).
- An identical copy of the spec sits in `public/assets/aistudio/Paste_October_30__2026_-_10_04PM_1b041da9` (builder artifact; it would be served publicly by the website) -> git-ignored in the baseline, must be deleted from the deployed build (finding to log).
- Owner constraints heard so far (dated):
  - 2026-10-31: every new project gets its own VS Code colour (this one: sky). Global rule recorded (WAF-20261031-12).

## v0 inventory (facts, read from the code; details to be audited in stage 2)
- Stack: React 19 + Vite 8 + Tailwind 4 + vite-plugin-pwa, TypeScript; **no server code** (no `server.ts` although `metadata.json` claims SERVER_SIDE_GEMINI_API and `express`/`@google/genai` are in package.json, unused). Firebase Auth (Google popup) + Firestore.
- **All domain state is one JSON object in the browser** (`localStorage` key `saber_dates_commerce_state_v1`), mutated by pure functions in `src/core/engine.ts` (2,006 lines) and mirrored as ONE Firestore document per signed-in user (`ledger_snapshots/{uid}`, <=900 KB). The 4 roles are a **top-bar switch with no login** (`activeRole` in `App.tsx`): this is not authentication or authorisation (scan rule SEC-NOAUTH; S1). `firestore.rules` has a hard-coded admin email.
- The spec asks for PostgreSQL (Neon) + Drizzle + server-side transactions, locking, idempotency; `drizzle/0000_saber_dates_schema.sql` (365 lines) exists as DDL but nothing uses it. No file storage (R2/S3) for signed document images (spec Part 39), no real QR scan tracking, no real login/invitations/password reset.
- IDs are `Date.now()` strings (collision-prone); `Math.random` in FormsCatalogHub; README claims "tested rules" (12 rules tests pass, 6 engine tests pass).
- UI: 7 view components (Admin 1.1k lines, Agent 1.0k, Customer storefront 0.8k, Forms hub 1.8k covering the 45 forms, Reports/Settings, Retailer, Printable documents), RTL present, PWA present. Persian only.
- Install: **`npm install` fails as shipped** (esbuild ^0.25 vs vite 8 peer `^0.27||^0.28`; WAF-20261031-05 pattern again). With esbuild ^0.28 (scratch copy only): `tsc --noEmit` clean, `vite build` OK (1.08 MB main chunk, warning), engine tests 6/6, rules tests 12/12. No lockfile except `bun.lock`. No CI, no `test` script.
- Public Google API key literal `AIza...` (Firebase web key in `firebase-applet-config.json`) is inside the built bundle: normal for Firebase web apps (not a secret), but must be restricted in Google Cloud and re-checked before any public push.

## Durable authorizations (user words, dated)  - nothing is assumed beyond this list
- GitHub repo: none given yet (push NOT allowed until a repo is given)
- Hosting target: none given (first deploy NOT allowed yet; free tier only when it is)
- Paid services / domain: none

## Decisions (why, not only what)
| Date | Decision | Alternatives | Reason |
|---|---|---|---|
| 2026-10-31 | Depth = deep | standard | score 8; money + PII + roles + large code base |
| 2026-10-31 | Baseline commit excludes `.aistudio/`, `dev-dist/`, the spec .txt, and the spec copy in `public/assets/aistudio/` | commit all | builder artifacts and the owner's private prompt must not reach a (possibly public) repo |
| 2026-10-31 | `firebase-applet-config.json` stays in the LOCAL baseline commit (build needs it) | exclude it | web API keys are public identifiers; re-evaluate at ship (restrict key, or drop Firebase) |
| 2026-10-31 | Direction for hardening (to confirm by audit): keep the React/Vite UI and the pure engine functions as the domain core, **move state and the engine behind a real server API with a real database and real auth** (Express as one Node function + Neon Postgres, the pattern proven in TrafficLab, WAF-20261031-09), roles enforced on the server; keep Firebase only if audit shows a need | rewrite in Next.js App Router as the spec prefers; keep Firebase snapshot design | the spec says "preferred" for Next.js but "required" for server-side transactions, auth, DB. Rewriting the 7k-line UI has high cost and low benefit; the real defects are architectural (client-side ledger, no auth) and are fixable behind the existing UI |
| 2026-10-31 | `npm install` fix = bump `esbuild` to ^0.28 in hardening (not in baseline) | `--legacy-peer-deps` | reproducible clean install |

## Open questions that really need the owner (few; everything else is decided and logged above)
- GitHub repository URL to push to (needed at stage 5, not before).
- Vercel/Neon: reuse the owner's existing Vercel team (used for TrafficLab) and Neon via the Vercel integration? Needs the owner's confirmation at stage 5.
- Is the real business data going to be entered here (Persian legal wording of custody/consignment documents should be reviewed by a human before real use)? Not blocking.

## Next steps (ordered, each ends with a verifiable result)
1. Stage 2 audit: read `engine.ts` invariants against Part 33 formulas and Part 46 acceptance tests; drive the app in a real browser (screens + console) on mobile and desktop; write FINDINGS.md with S1-S3 and the "before" SCORECARD.
2. Stage 3 harden: fix install (esbuild), lockfile, CI, `test` script; build server API + Postgres + auth + role scoping; keep the 6 engine tests and add API/authorisation tests (role replay).
3. Stage 4 verify in browser against the production build; Stage 5 ship only after the owner gives repo/hosting.

## Verified vs not verified (short; full table in VERIFIED.md)
- Verified 2026-10-31 (scratch copy): install failure; `tsc` clean; build OK; engine tests 6/6; rules tests 12/12; bundle contains the Firebase web key.
- NOT verified: any browser behaviour, correctness of the engine beyond its own 6 tests, the claim "70 acceptance criteria", PWA offline, print layout, QR, anything on a server (there is none).
