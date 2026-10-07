-- Starter schema for the ITAM Scanner documentation package.
-- Adapt data types, indexes, and constraints to the selected RDBMS.

CREATE TABLE assets (
  id UUID PRIMARY KEY,
  asset_tag VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(255) UNIQUE,
  serial_number VARCHAR(255),
  sku VARCHAR(255),
  service_tag VARCHAR(255),
  imei VARCHAR(32),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  description TEXT,
  status VARCHAR(50) NOT NULL,
  condition VARCHAR(50),
  lifecycle_stage VARCHAR(50),
  assignee_user_id UUID,
  department_id UUID,
  location_id UUID,
  purchase_date DATE,
  purchase_price DECIMAL(18,2),
  currency CHAR(3),
  warranty_end_date DATE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE inventory_sessions (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  scope_type VARCHAR(50) NOT NULL,
  scope_id UUID,
  status VARCHAR(30) NOT NULL,
  started_by UUID NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  expected_count INTEGER NOT NULL DEFAULT 0,
  scanned_count INTEGER NOT NULL DEFAULT 0,
  verified_count INTEGER NOT NULL DEFAULT 0,
  exception_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE scan_events (
  id UUID PRIMARY KEY,
  session_id UUID,
  asset_id UUID,
  raw_code VARCHAR(512) NOT NULL,
  code_type VARCHAR(50),
  mode VARCHAR(50) NOT NULL,
  observed_location_id UUID,
  operator_user_id UUID NOT NULL,
  result_type VARCHAR(50) NOT NULL,
  exception_type VARCHAR(100),
  captured_at TIMESTAMP NOT NULL,
  synced_at TIMESTAMP,
  client_operation_id UUID NOT NULL UNIQUE
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  actor_user_id UUID,
  subject_type VARCHAR(50),
  subject_id UUID,
  action VARCHAR(100) NOT NULL,
  outcome VARCHAR(50) NOT NULL,
  before_json TEXT,
  after_json TEXT,
  reason_code VARCHAR(100),
  metadata_json TEXT,
  correlation_id UUID,
  created_at TIMESTAMP NOT NULL
);
