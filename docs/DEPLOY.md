# Deployment (Vercel + Neon)

`api/index.ts` hosts the Express app as one Vercel Node function; the Vite build in `dist` is served statically; every `/api/*`
and `/healthz` request is rewritten to the function (see [vercel.json](../vercel.json)). The database is Neon PostgreSQL.

## Neon database
Add Neon through the Vercel integration (Project > Storage > Neon, or `vercel integration add neon`). It sets `POSTGRES_URL` /
`DATABASE_URL` for the project. The server applies migrations at start inside one transaction under an advisory lock (safe with
concurrent cold starts and with Neon's pooled connection). Nothing needs to be created by hand.

## Environment variables (Production)
| Variable | Notes |
|---|---|
| `SESSION_SECRET` | >= 32 random characters (the server refuses to start without it) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | the first administrator, created once when the database has no users (password >= 10 characters) |
| `SEED_DEMO`, `SEED_PASSWORD` | `true` only for a demonstration instance: loads the demo business and demo logins |
| `DATABASE_URL` / `POSTGRES_URL` | from the Neon integration |

Never put a password in the repository. After the first sign-in change the administrator password (key icon in the header) and create
real accounts for agents and stores in the administrator's *Form 41*.

## File storage
Signed-document images/PDFs (JPG/PNG/WebP/PDF, <= 3 MB, content-sniffed, SHA-256 stored) are kept in the `attachments` table and are served only
through `GET /api/attachments/:id` to people allowed to see the document (`Cache-Control: private, no-store`). This fits a pilot. For volume,
replace the two functions in `server/app.ts` that read/write `attachments` with an S3/Cloudflare R2 implementation (the metadata already lives in the ledger).

## Limits to remember
Vercel Hobby: request body 4.5 MB, function time as set in `vercel.json` (30 s). Neon free tier: storage and compute hours are limited; check
the current plan. Rate limiting is per function instance (the login lockout is stored in the database and holds across instances).

## After deploying
`GET /healthz` returns `{ok:true, db:"pg"}`. Sign in, change the password, check the dashboard. Keep the previous deployment id (Vercel dashboard
> Deployments > Promote) as the rollback. Record the URL and commit in [docs/factory/VERIFIED.md](factory/VERIFIED.md).
