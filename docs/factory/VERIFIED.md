# VERIFIED - Production-Ready B2B Date Distribution & Consignment Management Platform: what is and is not verified

> Keep this table at the top of every deployment guide and closing report. "Verified against a mock" is
> not "verified against the service" (GEN-20261030-5). Update after every verification run.

| Claim / capability | How it was verified | Where | Date | Not verified (limit) |
|---|---|---|---|---|
| v0 does not install as shipped | plain `npm install` in a clean copy of baseline a3957d5: ERESOLVE (esbuild ^0.25 vs vite 8 peer) | scratch copy | 2026-10-31 | |
| After bumping esbuild to ^0.28: `tsc --noEmit` clean, `vite build` OK (1.08 MB chunk), engine tests 6/6, Firestore-rules tests 12/12 | commands run in the scratch copy | local | 2026-10-31 | rules tests run against the emulator-less test harness of the file, not a live Firestore |
| Seeded demo shows 200 = 30+30+50+70+20 packages and 14M/10M/4M Toman | screenshot looked at (desktop-admin.png) | production build served by `vite preview`, desktop 1366 | 2026-10-31 | numbers are seed-derived in the browser; not a database |
| No console errors on first load, desktop and mobile | Playwright run (console + pageerror) | production build, 1366x900 and 390x844 | 2026-10-31 | only the first screen of each role, not full flows |
| State lives in localStorage and is trusted after tampering | Playwright: edited payments in localStorage, reload, page renders | local | 2026-10-31 | the visible numbers after tampering were not compared to the original |
| Firebase web key is in the built bundle | grep of `dist/assets/*.js` | local build | 2026-10-31 | whether the key is restricted in Google Cloud (owner-only) |

## Environments actually tested
- Local dev server: not run.
- Production build served locally: `vite preview` of a scratch copy of baseline (not the repo working tree), 2026-10-31.
- Live URL: none.

## External services (each must say mock / sandbox / real)
| Service | Mode used in tests | First real call must confirm |
|---|---|---|
| Firebase Auth / Firestore | not exercised (no credentials used) | project, key restrictions, rules deploy (if it stays) |
| Payment gateway | simulated inside the app (labelled) | an Iranian gateway adapter is not built |
| SMS | not built (in-app notifications only, as the spec allows for release 1) | |
