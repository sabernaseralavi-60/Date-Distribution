# Security Specification — Saber Date Commerce (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched is denied for both `read` and `write`.
2. **Verified Identity**: All write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates its path ID using `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Strict Keys & Anti-Update-Gap**: Every `create` and `update` invokes `isValid[Entity](incoming())`, enforcing `.keys().hasAll(...)` and `.keys().hasOnly(...)`, exact field types, string `.size()` bounds, numeric bounds, and `request.time` temporal integrity.
5. **Ownership & Admin Isolation**:
   - `ledger_snapshots/{snapshotId}` can only be read or written by the document owner (`snapshotId == request.auth.uid && resource.data.ownerId == request.auth.uid`) or a verified administrator (`isAdmin()`).
   - `audit_logs/{logId}` are append-only (`allow update, delete: if false;`) and require `incoming().actorUid == request.auth.uid`.
   - `products/{productId}` can only be created or updated by `isAdmin()`.
   - `admins/{adminId}` is strictly locked to the bootstrapped admin email (`saber.naseralavi@gmail.com` with `email_verified == true`) and cannot be self-assigned by regular users.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated Write**: `auth = null` attempting `create` on `/products/piarom-600` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'u1', token: { email: 'saber.naseralavi@gmail.com', email_verified: false } }` attempting admin write -> `PERMISSION_DENIED`.
3. **Self-Assigned Admin Privilege Escalation**: `auth = { uid: 'attacker', token: { email: 'evil@example.com', email_verified: true } }` creating `/admins/attacker` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Product**: Adding `{ isVerifiedAdmin: true }` to `/products/piarom-600` -> Rejected by `.keys().hasOnly(...)` -> `PERMISSION_DENIED`.
5. **ID Poisoning Attack**: Document ID containing spaces/slashes or >128 chars -> Rejected by `isValidId()` -> `PERMISSION_DENIED`.
6. **Owner Spoofing on LedgerSnapshot**: Authenticated user `u1` creating `/ledger_snapshots/u1` with `ownerId: 'u2'` -> Rejected by `data.ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
7. **Cross-Tenant PII/Ledger Read**: Authenticated user `u1` attempting `get` or `list` on `/ledger_snapshots/u2` where `resource.data.ownerId == 'u2'` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Updating `createdAt` or `ownerId` on `/ledger_snapshots/u1` -> Rejected by `incoming().createdAt == existing().createdAt && incoming().ownerId == existing().ownerId` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating a document with a past or future `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
10. **Value Poisoning on Update**: Updating `version` on `/ledger_snapshots/u1` with a string `"hacked"` -> Rejected by `isValidLedgerSnapshot(incoming())` -> `PERMISSION_DENIED`.
11. **Audit Log Tampering**: Attempting `update` or `delete` on `/audit_logs/log_1` -> `PERMISSION_DENIED`.
12. **Denial-of-Wallet Oversized Payload**: Sending `details` string > 2000 chars in `/audit_logs/log_1` -> Rejected by `.size() <= 2000` -> `PERMISSION_DENIED`.
