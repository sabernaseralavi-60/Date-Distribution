/**
 * Initial schema. Design note (see docs/ARCHITECTURE.md): the business ledger is ONE authoritative aggregate stored as JSONB and
 * changed only by the domain engine inside a row-locked transaction (optimistic version check + audit trail). Users, sessions,
 * documents' file bytes, idempotency keys, audit entries and public tracking events are separate relational tables.
 * A fully normalised schema (spec Part 42) is a documented limitation, not a claim.
 */
export default `
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin','agent','retailer')),
  entity_id     text,
  active        boolean NOT NULL DEFAULT true,
  token_version integer NOT NULL DEFAULT 0,
  failed_logins integer NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((role = 'admin' AND entity_id IS NULL) OR (role <> 'admin' AND entity_id IS NOT NULL))
);
CREATE UNIQUE INDEX users_entity_uidx ON users (role, entity_id) WHERE entity_id IS NOT NULL;

CREATE TABLE ledger_state (
  id         integer PRIMARY KEY CHECK (id = 1),
  version    integer NOT NULL,
  state      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id        bigserial PRIMARY KEY,
  at        timestamptz NOT NULL DEFAULT now(),
  user_id   uuid,
  username  text,
  action    text NOT NULL,
  entity    text,
  entity_id text,
  detail    text
);
CREATE INDEX audit_logs_at_idx ON audit_logs (at DESC);

CREATE TABLE action_keys (
  user_key   text NOT NULL,
  key        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_key, key)
);

CREATE TABLE attachments (
  id          text PRIMARY KEY,
  document_id text NOT NULL,
  filename    text NOT NULL,
  mime_type   text NOT NULL,
  size_bytes  integer NOT NULL,
  sha256      text NOT NULL,
  version     integer NOT NULL,
  uploaded_by text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  bytes       bytea NOT NULL
);
CREATE INDEX attachments_doc_idx ON attachments (document_id);

CREATE TABLE public_events (
  id         bigserial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  kind       text NOT NULL CHECK (kind IN ('product_view','qr_scan','referral_visit','retailer_request','b2c_order')),
  code       text NOT NULL
);
CREATE INDEX public_events_kind_idx ON public_events (kind, code);
`;
