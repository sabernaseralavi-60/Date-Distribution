-- =============================================================================
-- SABER DATE COMMERCE — NORMALIZED POSTGRESQL SCHEMA & MIGRATION (PART 42)
-- All monetary amounts stored as BIGINT (Iranian Toman).
-- All timestamps stored as TIMESTAMPTZ (UTC), presented in Jalali/Shamsi.
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE, -- 'admin', 'agent', 'retailer', 'customer'
  title_fa VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  description_fa TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(128) NOT NULL UNIQUE,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS business_settings (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(150) NOT NULL,
  brand_title VARCHAR(200) NOT NULL,
  logo_url TEXT,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  currency_label VARCHAR(32) NOT NULL DEFAULT 'تومان',
  date_calendar VARCHAR(16) NOT NULL DEFAULT 'jalali',
  default_retailer_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  default_b2c_price_policy VARCHAR(32) NOT NULL DEFAULT 'independent',
  default_retailer_delivery_mode VARCHAR(32) NOT NULL DEFAULT 'consignment',
  default_agent_custody_mode VARCHAR(32) NOT NULL DEFAULT 'consignment',
  default_commission_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 6.00,
  commission_attribution_policy VARCHAR(32) NOT NULL DEFAULT 'sales_agent',
  settlement_period_days INTEGER NOT NULL DEFAULT 14,
  low_stock_warning_threshold INTEGER NOT NULL DEFAULT 25,
  document_number_prefix_year VARCHAR(8) NOT NULL DEFAULT '1405',
  agent_consignment_declaration TEXT NOT NULL,
  agent_credit_declaration TEXT NOT NULL,
  retailer_consignment_declaration TEXT NOT NULL,
  declaration_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  sku VARCHAR(64) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(120) NOT NULL,
  category_name VARCHAR(120) NOT NULL,
  packaging VARCHAR(150) NOT NULL,
  net_weight_grams INTEGER NOT NULL CHECK (net_weight_grams > 0),
  unit VARCHAR(32) NOT NULL DEFAULT 'بسته',
  description TEXT,
  cost_price BIGINT NOT NULL CHECK (cost_price >= 0),
  base_retailer_price BIGINT NOT NULL CHECK (base_retailer_price >= 0),
  retailer_markup_percent NUMERIC(5,2) NOT NULL CHECK (retailer_markup_percent >= 0),
  suggested_retail_price BIGINT NOT NULL CHECK (suggested_retail_price >= 0),
  direct_b2c_price BIGINT NOT NULL CHECK (direct_b2c_price >= 0),
  campaign_price BIGINT CHECK (campaign_price >= 0),
  min_stock_alert INTEGER NOT NULL DEFAULT 20,
  barcode VARCHAR(64),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_prices (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  cost_price BIGINT NOT NULL,
  base_retailer_price BIGINT NOT NULL,
  retailer_markup_percent NUMERIC(5,2) NOT NULL,
  suggested_retail_price BIGINT NOT NULL,
  direct_b2c_price BIGINT NOT NULL,
  campaign_price BIGINT,
  effective_date TIMESTAMPTZ NOT NULL,
  expiration_date TIMESTAMPTZ,
  created_by VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  national_id VARCHAR(20),
  address TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  commission_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 6.00,
  custody_policy_mode VARCHAR(32) NOT NULL DEFAULT 'consignment',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_rules (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE RESTRICT,
  channel VARCHAR(16) NOT NULL DEFAULT 'B2B',
  method VARCHAR(64) NOT NULL,
  rate_or_amount NUMERIC(12,2) NOT NULL,
  effective_start_date TIMESTAMPTZ NOT NULL,
  effective_end_date TIMESTAMPTZ,
  min_threshold BIGINT NOT NULL DEFAULT 0,
  max_limit BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS retailers (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  store_name VARCHAR(200) NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  landline VARCHAR(20),
  address TEXT NOT NULL,
  province VARCHAR(64) NOT NULL,
  city VARCHAR(64) NOT NULL,
  district VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  gps_coordinates VARCHAR(64),
  business_license_id VARCHAR(64),
  agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  acquisition_agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  settlement_interval_days INTEGER NOT NULL DEFAULT 14,
  delivery_mode VARCHAR(32) NOT NULL DEFAULT 'consignment',
  credit_limit BIGINT NOT NULL DEFAULT 0,
  approved_by VARCHAR(120),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retailer_agent_assignments (
  id SERIAL PRIMARY KEY,
  retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id) ON DELETE RESTRICT,
  agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  province VARCHAR(64) NOT NULL,
  city VARCHAR(64) NOT NULL,
  address TEXT NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  referral_agent_id VARCHAR(64) REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  id VARCHAR(64) PRIMARY KEY,
  location_type VARCHAR(32) NOT NULL, -- 'warehouse', 'agent', 'retailer', 'b2c_reserved', 'damaged'
  name VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_balances (
  location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id),
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (location_id, product_id)
);

CREATE TABLE IF NOT EXISTS delivery_documents (
  id VARCHAR(64) PRIMARY KEY,
  document_number VARCHAR(64) NOT NULL UNIQUE,
  document_type VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  issue_date TIMESTAMPTZ NOT NULL,
  agent_id VARCHAR(64) REFERENCES agents(id),
  retailer_id VARCHAR(64) REFERENCES retailers(id),
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_reference_price BIGINT NOT NULL,
  total_reference_value BIGINT NOT NULL,
  policy_mode VARCHAR(32) NOT NULL,
  declaration_text TEXT NOT NULL,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'pending_signature',
  approved_by_admin VARCHAR(120),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_attachments (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES delivery_documents(id) ON DELETE RESTRICT,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by VARCHAR(120) NOT NULL,
  checksum_sha256 VARCHAR(128) NOT NULL,
  storage_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type VARCHAR(64) NOT NULL,
  from_location_type VARCHAR(32) NOT NULL,
  from_location_id VARCHAR(64) NOT NULL,
  to_location_type VARCHAR(32) NOT NULL,
  to_location_id VARCHAR(64) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_snapshot BIGINT NOT NULL,
  reference_document_id VARCHAR(64),
  created_by VARCHAR(120) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retailer_sales_reports (
  id VARCHAR(64) PRIMARY KEY,
  report_number VARCHAR(64) NOT NULL UNIQUE,
  retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id),
  agent_id VARCHAR(64) NOT NULL REFERENCES agents(id),
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  opening_stock INTEGER NOT NULL,
  received_quantity INTEGER NOT NULL,
  returned_quantity INTEGER NOT NULL,
  reported_sold_quantity INTEGER NOT NULL CHECK (reported_sold_quantity >= 0),
  damaged_quantity INTEGER NOT NULL DEFAULT 0,
  calculated_closing_stock INTEGER NOT NULL,
  physical_counted_stock INTEGER NOT NULL,
  has_discrepancy BOOLEAN NOT NULL DEFAULT FALSE,
  unit_settlement_price_snapshot BIGINT NOT NULL,
  receivable_generated BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  payment_number VARCHAR(64) NOT NULL UNIQUE,
  retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id),
  collecting_agent_id VARCHAR(64) REFERENCES agents(id),
  sales_attribution_agent_id VARCHAR(64) NOT NULL REFERENCES agents(id),
  payment_date TIMESTAMPTZ NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  method VARCHAR(32) NOT NULL,
  bank_name VARCHAR(100),
  reference_number VARCHAR(100) NOT NULL,
  collected_by_agent_directly BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id VARCHAR(64) PRIMARY KEY,
  payment_id VARCHAR(64) NOT NULL REFERENCES payments(id),
  invoice_id VARCHAR(64) NOT NULL,
  retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id),
  agent_id VARCHAR(64) NOT NULL REFERENCES agents(id),
  allocated_amount BIGINT NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_records (
  id VARCHAR(64) PRIMARY KEY,
  commission_number VARCHAR(64) NOT NULL UNIQUE,
  agent_id VARCHAR(64) NOT NULL REFERENCES agents(id),
  source_payment_id VARCHAR(64) NOT NULL UNIQUE REFERENCES payments(id),
  retailer_id VARCHAR(64) NOT NULL REFERENCES retailers(id),
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  base_basis_amount BIGINT NOT NULL,
  rule_name_snapshot VARCHAR(200) NOT NULL,
  rate_percent_snapshot NUMERIC(5,2) NOT NULL,
  commission_amount BIGINT NOT NULL,
  paid_amount BIGINT NOT NULL DEFAULT 0,
  remaining_payable BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(64) NOT NULL UNIQUE,
  customer_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_mobile VARCHAR(20) NOT NULL,
  province VARCHAR(64) NOT NULL,
  city VARCHAR(64) NOT NULL,
  delivery_address TEXT NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_snapshot BIGINT NOT NULL,
  shipping_fee BIGINT NOT NULL DEFAULT 0,
  total_payable BIGINT NOT NULL,
  order_status VARCHAR(32) NOT NULL,
  payment_status VARCHAR(32) NOT NULL,
  tracking_code VARCHAR(64),
  source_channel VARCHAR(32) NOT NULL,
  referral_agent_id VARCHAR(64) REFERENCES agents(id),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id VARCHAR(64) PRIMARY KEY,
  entry_number VARCHAR(64) NOT NULL UNIQUE,
  entry_date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(32) NOT NULL,
  reference_id VARCHAR(64) NOT NULL,
  debit_account VARCHAR(150) NOT NULL,
  credit_account VARCHAR(150) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_role VARCHAR(32) NOT NULL,
  actor_name VARCHAR(150) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
