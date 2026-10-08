-- Asset 360 additive schema. Existing authoritative tables remain unchanged.
ALTER TABLE asset_files ADD COLUMN evidence_type text;
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN caption text;
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN condition_id integer REFERENCES asset_conditions(condition_id);
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN lifecycle_stage text;
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN captured_at text;
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN location_id integer REFERENCES locations(location_id);
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN related_assignment_id integer REFERENCES asset_assignments(assignment_id);
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN related_repair_id integer REFERENCES asset_repairs(repair_id);
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN related_inventory_session_id integer REFERENCES inventory_sessions(inventory_session_id);
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN related_movement_id integer REFERENCES asset_movements(movement_id);
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN related_disposal_id integer REFERENCES asset_disposals(disposal_id);
--> statement-breakpoint
ALTER TABLE asset_files ADD COLUMN evidence_status text DEFAULT 'ACTIVE' NOT NULL;
--> statement-breakpoint

CREATE TABLE delivery_receipts (
 delivery_receipt_id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 dr_number text NOT NULL,
 vendor_id integer NOT NULL REFERENCES vendors(vendor_id) ON DELETE RESTRICT,
 purchase_order_id integer REFERENCES purchase_orders(purchase_order_id) ON DELETE RESTRICT,
 delivery_date text,
 received_date text,
 received_by integer REFERENCES users(user_id) ON DELETE RESTRICT,
 receiving_location_id integer REFERENCES locations(location_id) ON DELETE RESTRICT,
 delivery_status text NOT NULL DEFAULT 'RECEIVED',
 notes text,
 file_id integer REFERENCES files(file_id) ON DELETE RESTRICT,
 created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 created_by integer NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
 updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 updated_by integer NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX uq_delivery_receipts_vendor_dr ON delivery_receipts(vendor_id,dr_number);
--> statement-breakpoint
CREATE INDEX idx_delivery_receipts_po ON delivery_receipts(purchase_order_id);
--> statement-breakpoint
CREATE INDEX idx_delivery_receipts_location ON delivery_receipts(receiving_location_id);
--> statement-breakpoint

CREATE TABLE delivery_receipt_lines (
 delivery_receipt_line_id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 delivery_receipt_id integer NOT NULL REFERENCES delivery_receipts(delivery_receipt_id) ON DELETE RESTRICT,
 purchase_order_item_id integer REFERENCES purchase_order_items(purchase_order_item_id) ON DELETE RESTRICT,
 asset_id integer REFERENCES assets(asset_id) ON DELETE RESTRICT,
 description text,
 quantity_delivered text NOT NULL DEFAULT '1',
 serial_number text,
 notes text
);
--> statement-breakpoint
CREATE INDEX idx_delivery_receipt_lines_dr ON delivery_receipt_lines(delivery_receipt_id);
--> statement-breakpoint
CREATE INDEX idx_delivery_receipt_lines_asset ON delivery_receipt_lines(asset_id);
--> statement-breakpoint

CREATE TABLE asset_condition_history (
 condition_history_id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 asset_id integer NOT NULL REFERENCES assets(asset_id) ON DELETE RESTRICT,
 inspection_date text NOT NULL,
 condition_id integer NOT NULL REFERENCES asset_conditions(condition_id) ON DELETE RESTRICT,
 cosmetic_condition text,
 functional_condition text,
 damage_description text,
 missing_components text,
 inspector_user_id integer REFERENCES users(user_id) ON DELETE RESTRICT,
 location_id integer REFERENCES locations(location_id) ON DELETE RESTRICT,
 event_type text,
 notes text,
 created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_condition_history_asset_date ON asset_condition_history(asset_id,inspection_date);
--> statement-breakpoint

CREATE TABLE barcode_history (
 barcode_history_id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 asset_id integer NOT NULL REFERENCES assets(asset_id) ON DELETE RESTRICT,
 barcode_value text NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE',
 date_applied text NOT NULL,
 date_replaced text,
 replacement_reason text,
 replaced_by integer REFERENCES users(user_id) ON DELETE RESTRICT,
 previous_barcode text,
 new_barcode text,
 barcode_file_id integer REFERENCES files(file_id) ON DELETE RESTRICT,
 created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_barcode_history_asset_date ON barcode_history(asset_id,date_applied);
--> statement-breakpoint

CREATE TABLE employee_files (
 employee_file_id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 employee_id integer NOT NULL REFERENCES employees(employee_id) ON DELETE RESTRICT,
 file_id integer NOT NULL REFERENCES files(file_id) ON DELETE RESTRICT,
 document_type text NOT NULL,
 description text,
 is_active integer DEFAULT 1 NOT NULL,
 created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 created_by integer NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX idx_employee_files_employee ON employee_files(employee_id,is_active);
--> statement-breakpoint

CREATE TABLE receiving_discrepancies (
 discrepancy_id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 delivery_receipt_id integer REFERENCES delivery_receipts(delivery_receipt_id) ON DELETE RESTRICT,
 asset_id integer REFERENCES assets(asset_id) ON DELETE RESTRICT,
 discrepancy_type text NOT NULL,
 notes text,
 responsible_vendor_id integer REFERENCES vendors(vendor_id) ON DELETE RESTRICT,
 resolution_status text NOT NULL DEFAULT 'OPEN',
 resolution_notes text,
 created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
 created_by integer NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
 resolved_at text,
 resolved_by integer REFERENCES users(user_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX idx_receiving_discrepancies_asset ON receiving_discrepancies(asset_id);
--> statement-breakpoint
CREATE INDEX idx_receiving_discrepancies_dr ON receiving_discrepancies(delivery_receipt_id);
