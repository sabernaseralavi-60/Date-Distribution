# Architecture and limitations

## Shape
```
browser (React, role-scoped state)  ->  /api/action  ->  Express  ->  engine functions (pure, src/core/engine.ts)
                                                      |-> PostgreSQL: ledger_state (JSONB aggregate, row-locked), users,
                                                          audit_logs, action_keys (idempotency), attachments, public_events
```
* The ledger is ONE aggregate (`ledger_state`) that only the engine changes, inside a transaction holding `SELECT ... FOR UPDATE`.
  Parallel requests are serialised (tested: concurrent orders cannot drive stock negative). Every action carries an idempotency key.
* The browser never receives other people's rows: `src/core/scope.ts` builds the agent / store / customer views on the server.
* The browser runs the same engine locally only to validate forms and to show an immediate result; the server replays the
  recorded call(s) atomically and its answer replaces the browser's copy (`src/core/engineClient.ts`). Ids are seed-deterministic so
  the id of a new document seen before the answer is the id the server creates.
* Roles and per-action rules live in `server/permissions.ts` (agent: own custody and own stores; store: itself; payments from non-admins are always
  *pending*; only the administrator verifies payments, remittances, documents, commissions and approves stores).

## Departures from the master prompt (decisions, not claims)
| Prompt | Here | Why |
|---|---|---|
| Next.js App Router, shadcn/ui | Vite + React | "Preferred" in the prompt; the engine and screens already existed; server is a separate API |
| 56 normalised tables, Drizzle | JSONB ledger aggregate + relational tables for users/audit/files/idempotency | full normalisation = rewrite of the 2k-line engine; correctness and isolation first |
| R2/S3 storage | PostgreSQL `bytea` behind one module | works on Vercel without extra accounts; swap for volume |
| Real payment gateway | simulated, labelled in the UI | prompt asks for a labelled simulation |
| SMS | not connected | prompt: in-app notifications are enough for release 1 |

## Known limitations
* The ledger JSON is read and written whole on each action: fine for a pilot (hundreds of stores), not for very large volume.
* Journal entries are single debit/credit pairs with Persian account names (an auditable subledger, not a chart of accounts); reconciliation formulas of Part 33 are tested.
* Roles are fixed (no custom role editor). Business-policy question for the owner: a store's own sales report auto-verifies (it creates a receivable against itself).
* Printed document wording is the prompt's wording and needs review by a lawyer before real use. Scanned signatures are evidence, not proof of legal enforceability.
* Rejection/approval reasons use the browser's prompt dialog in two places (approval queue, password reset) - to be replaced by inline forms.
* Accessibility has not been measured with a tool; PWA offline behaviour is the generated service worker's default and was not tested offline.
