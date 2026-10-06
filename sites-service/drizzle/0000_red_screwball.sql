CREATE TABLE `app_sessions` (
	`session_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_app_sessions_user_id` ON `app_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `asset_assignments` (
	`assignment_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	`department_id` integer,
	`cost_center_id` integer,
	`location_id` integer,
	`assigned_date` text NOT NULL,
	`expected_return_date` text,
	`returned_date` text,
	`assignment_status` text NOT NULL,
	`assigned_by` integer NOT NULL,
	`return_received_by` integer,
	`assignment_notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`cost_center_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`return_received_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_assignments_asset_id` ON `asset_assignments` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_assignments_employee_id` ON `asset_assignments` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_assignments_department_id` ON `asset_assignments` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_assignments_cost_center_id` ON `asset_assignments` (`cost_center_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_assignments_location_id` ON `asset_assignments` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_assignments_assigned_by` ON `asset_assignments` (`assigned_by`);--> statement-breakpoint
CREATE INDEX `idx_asset_assignments_return_received_by` ON `asset_assignments` (`return_received_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_assignment` ON `asset_assignments` (`asset_id`) WHERE assignment_status = 'ACTIVE';--> statement-breakpoint
CREATE TABLE `asset_categories` (
	`category_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_categories_category_name_unique` ON `asset_categories` (`category_name`);--> statement-breakpoint
CREATE TABLE `asset_classes` (
	`asset_class_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_classes_class_name_unique` ON `asset_classes` (`class_name`);--> statement-breakpoint
CREATE TABLE `asset_conditions` (
	`condition_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`condition_code` text NOT NULL,
	`condition_name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_conditions_condition_code_unique` ON `asset_conditions` (`condition_code`);--> statement-breakpoint
CREATE TABLE `asset_depreciation` (
	`depreciation_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`period_date` text NOT NULL,
	`opening_value` text NOT NULL,
	`depreciation_amount` text NOT NULL,
	`accumulated_depreciation` text NOT NULL,
	`closing_book_value` text NOT NULL,
	`calculation_source` text NOT NULL,
	`calculated_at` text NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_depreciation_asset_id` ON `asset_depreciation` (`asset_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_depreciation_per_period` ON `asset_depreciation` (`asset_id`,`period_date`);--> statement-breakpoint
CREATE TABLE `asset_disposals` (
	`disposal_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`disposal_method_id` integer NOT NULL,
	`vendor_id` integer,
	`requested_date` text,
	`approved_date` text,
	`disposal_date` text,
	`disposal_value` text,
	`data_wipe_required` integer DEFAULT 1 NOT NULL,
	`data_wipe_confirmed` integer DEFAULT 0 NOT NULL,
	`wiped_by` text,
	`wipe_date` text,
	`certificate_file_id` integer,
	`approved_by` integer,
	`status` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`disposal_method_id`) REFERENCES `disposal_methods`(`disposal_method_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`vendor_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`certificate_file_id`) REFERENCES `files`(`file_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_disposals_asset_id` ON `asset_disposals` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_disposals_disposal_method_id` ON `asset_disposals` (`disposal_method_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_disposals_vendor_id` ON `asset_disposals` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_disposals_certificate_file_id` ON `asset_disposals` (`certificate_file_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_disposals_approved_by` ON `asset_disposals` (`approved_by`);--> statement-breakpoint
CREATE TABLE `asset_files` (
	`asset_file_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`file_id` integer NOT NULL,
	`document_type` text NOT NULL,
	`description` text,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`file_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_files_asset_id` ON `asset_files` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_files_file_id` ON `asset_files` (`file_id`);--> statement-breakpoint
CREATE TABLE `asset_financials` (
	`financial_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`purchase_date` text,
	`purchase_price` text,
	`currency_code` text,
	`vendor_id` integer,
	`purchase_order_id` integer,
	`invoice_id` integer,
	`cost_center_id` integer,
	`capitalization_date` text,
	`acquisition_cost` text,
	`residual_value` text,
	`current_book_value` text,
	`depreciation_profile_id` integer,
	`financial_classification` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` integer NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_by` integer NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`vendor_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`purchase_order_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`invoice_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`cost_center_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`depreciation_profile_id`) REFERENCES `depreciation_profiles`(`depreciation_profile_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_financials_asset_id_unique` ON `asset_financials` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_financials_asset_id` ON `asset_financials` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_financials_vendor_id` ON `asset_financials` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_financials_purchase_order_id` ON `asset_financials` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_financials_invoice_id` ON `asset_financials` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_financials_cost_center_id` ON `asset_financials` (`cost_center_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_financials_depreciation_profile_id` ON `asset_financials` (`depreciation_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_financials_created_by` ON `asset_financials` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_asset_financials_updated_by` ON `asset_financials` (`updated_by`);--> statement-breakpoint
CREATE TABLE `asset_lifecycle` (
	`lifecycle_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`acquisition_date` text,
	`in_service_date` text,
	`useful_life_months` integer,
	`refresh_due_date` text,
	`end_of_life_date` text,
	`end_of_support_date` text,
	`disposal_date` text,
	`lifecycle_stage` text NOT NULL,
	`calculated_at` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_lifecycle_asset_id_unique` ON `asset_lifecycle` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_lifecycle_asset_id` ON `asset_lifecycle` (`asset_id`);--> statement-breakpoint
CREATE TABLE `asset_models` (
	`model_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`manufacturer_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`asset_type_id` integer NOT NULL,
	`model_name` text NOT NULL,
	`model_number` text,
	`default_useful_life_months` integer,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`manufacturer_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `asset_categories`(`category_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types`(`asset_type_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_models_manufacturer_id` ON `asset_models` (`manufacturer_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_models_category_id` ON `asset_models` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_models_asset_type_id` ON `asset_models` (`asset_type_id`);--> statement-breakpoint
CREATE TABLE `asset_movements` (
	`movement_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`movement_type_id` integer NOT NULL,
	`from_location_id` integer,
	`to_location_id` integer,
	`from_employee_id` integer,
	`to_employee_id` integer,
	`movement_date` text NOT NULL,
	`requested_by` integer,
	`approved_by` integer,
	`released_by` integer,
	`received_by` integer,
	`vendor_id` integer,
	`tracking_number` text,
	`reference_number` text,
	`movement_status` text NOT NULL,
	`remarks` text,
	`completed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`movement_type_id`) REFERENCES `movement_types`(`movement_type_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`from_location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`from_employee_id`) REFERENCES `employees`(`employee_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_employee_id`) REFERENCES `employees`(`employee_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`released_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`received_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`vendor_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_movements_asset_id` ON `asset_movements` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_movement_type_id` ON `asset_movements` (`movement_type_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_from_location_id` ON `asset_movements` (`from_location_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_to_location_id` ON `asset_movements` (`to_location_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_from_employee_id` ON `asset_movements` (`from_employee_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_to_employee_id` ON `asset_movements` (`to_employee_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_requested_by` ON `asset_movements` (`requested_by`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_approved_by` ON `asset_movements` (`approved_by`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_released_by` ON `asset_movements` (`released_by`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_received_by` ON `asset_movements` (`received_by`);--> statement-breakpoint
CREATE INDEX `idx_asset_movements_vendor_id` ON `asset_movements` (`vendor_id`);--> statement-breakpoint
CREATE TABLE `asset_refreshes` (
	`refresh_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`recommended_date` text,
	`approved_date` text,
	`completed_date` text,
	`refresh_reason` text,
	`replacement_asset_id` integer,
	`approved_by` integer,
	`status` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`replacement_asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_refreshes_asset_id` ON `asset_refreshes` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_refreshes_replacement_asset_id` ON `asset_refreshes` (`replacement_asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_refreshes_approved_by` ON `asset_refreshes` (`approved_by`);--> statement-breakpoint
CREATE TABLE `asset_repairs` (
	`repair_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`repair_type` text,
	`repair_source` text NOT NULL,
	`vendor_id` integer,
	`issue_description` text NOT NULL,
	`diagnosis` text,
	`repair_action` text,
	`repair_cost` text,
	`sent_date` text,
	`repair_start_date` text,
	`repair_complete_date` text,
	`returned_date` text,
	`repair_status` text NOT NULL,
	`technician` text,
	`notes` text,
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`vendor_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_repairs_asset_id` ON `asset_repairs` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_repairs_vendor_id` ON `asset_repairs` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_repairs_created_by` ON `asset_repairs` (`created_by`);--> statement-breakpoint
CREATE TABLE `asset_statuses` (
	`status_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status_code` text NOT NULL,
	`status_name` text NOT NULL,
	`lifecycle_stage` text,
	`is_terminal` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "no_transferred_status" CHECK(status_code != 'TRANSFERRED')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_statuses_status_code_unique` ON `asset_statuses` (`status_code`);--> statement-breakpoint
CREATE TABLE `asset_technical_details` (
	`technical_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`hostname` text,
	`mac_address` text,
	`ip_address` text,
	`operating_system` text,
	`os_version` text,
	`cpu` text,
	`memory_gb` text,
	`storage_capacity_gb` text,
	`storage_type` text,
	`bios_version` text,
	`bios_serial` text,
	`device_uuid` text,
	`architecture` text,
	`last_inventory_scan` text,
	`source` text,
	`raw_details` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_by` integer NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_technical_details_asset_id_unique` ON `asset_technical_details` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_technical_details_asset_id` ON `asset_technical_details` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_technical_details_updated_by` ON `asset_technical_details` (`updated_by`);--> statement-breakpoint
CREATE TABLE `asset_types` (
	`asset_type_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`type_name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `asset_categories`(`category_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_types_category_id` ON `asset_types` (`category_id`);--> statement-breakpoint
CREATE TABLE `asset_warranties` (
	`warranty_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`provider_id` integer,
	`warranty_start_date` text,
	`warranty_end_date` text,
	`warranty_type` text,
	`support_contract` text,
	`warranty_status` text NOT NULL,
	`checked_online_at` text,
	`verification_source` text,
	`notes` text,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`provider_id`) REFERENCES `vendors`(`vendor_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_asset_warranties_asset_id` ON `asset_warranties` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_asset_warranties_provider_id` ON `asset_warranties` (`provider_id`);--> statement-breakpoint
CREATE TABLE `assets` (
	`asset_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_tag` text NOT NULL,
	`barcode` text,
	`sku` text,
	`serial_number` text,
	`manufacturer_id` integer,
	`model_id` integer,
	`category_id` integer NOT NULL,
	`asset_type_id` integer NOT NULL,
	`asset_class_id` integer NOT NULL,
	`description` text,
	`status_id` integer NOT NULL,
	`condition_id` integer NOT NULL,
	`current_location_id` integer,
	`quantity` text DEFAULT '1' NOT NULL,
	`unit_of_measure_id` integer,
	`is_serialized` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` integer NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_by` integer NOT NULL,
	FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers`(`manufacturer_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`model_id`) REFERENCES `asset_models`(`model_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `asset_categories`(`category_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types`(`asset_type_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`asset_class_id`) REFERENCES `asset_classes`(`asset_class_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`status_id`) REFERENCES `asset_statuses`(`status_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`condition_id`) REFERENCES `asset_conditions`(`condition_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`current_location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`unit_of_measure_id`) REFERENCES `units_of_measure`(`unit_of_measure_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "serialized_one" CHECK(is_serialized = 0 OR quantity = '1'),
	CONSTRAINT "positive_quantity" CHECK(CAST(quantity AS REAL) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_asset_tag_unique` ON `assets` (`asset_tag`);--> statement-breakpoint
CREATE UNIQUE INDEX `assets_barcode_unique` ON `assets` (`barcode`);--> statement-breakpoint
CREATE INDEX `idx_assets_manufacturer_id` ON `assets` (`manufacturer_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_model_id` ON `assets` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_category_id` ON `assets` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_asset_type_id` ON `assets` (`asset_type_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_asset_class_id` ON `assets` (`asset_class_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_status_id` ON `assets` (`status_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_condition_id` ON `assets` (`condition_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_current_location_id` ON `assets` (`current_location_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_unit_of_measure_id` ON `assets` (`unit_of_measure_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_created_by` ON `assets` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_assets_updated_by` ON `assets` (`updated_by`);--> statement-breakpoint
CREATE INDEX `idx_asset_serial` ON `assets` (`serial_number`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`audit_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`event_type` text NOT NULL,
	`module` text NOT NULL,
	`table_name` text,
	`record_id` integer,
	`action` text NOT NULL,
	`old_values` text,
	`new_values` text,
	`ip_address` text,
	`user_agent` text,
	`session_id` text,
	`event_timestamp` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`remarks` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_user_id` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE TABLE `barcode_scan_logs` (
	`scan_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barcode` text NOT NULL,
	`asset_id` integer,
	`scan_type` text NOT NULL,
	`scanned_by` integer,
	`device_type` text,
	`scan_timestamp` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`location_id` integer,
	`result` text NOT NULL,
	`metadata` text,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`scanned_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_barcode_scan_logs_asset_id` ON `barcode_scan_logs` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_barcode_scan_logs_scanned_by` ON `barcode_scan_logs` (`scanned_by`);--> statement-breakpoint
CREATE INDEX `idx_barcode_scan_logs_location_id` ON `barcode_scan_logs` (`location_id`);--> statement-breakpoint
CREATE TABLE `business_units` (
	`business_unit_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_unit_code` text NOT NULL,
	`business_unit_name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_units_business_unit_code_unique` ON `business_units` (`business_unit_code`);--> statement-breakpoint
CREATE TABLE `cost_centers` (
	`cost_center_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`department_id` integer,
	`cost_center_code` text NOT NULL,
	`cost_center_name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cost_centers_cost_center_code_unique` ON `cost_centers` (`cost_center_code`);--> statement-breakpoint
CREATE INDEX `idx_cost_centers_department_id` ON `cost_centers` (`department_id`);--> statement-breakpoint
CREATE TABLE `dashboard_types` (
	`dashboard_type_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dashboard_code` text NOT NULL,
	`dashboard_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_types_dashboard_code_unique` ON `dashboard_types` (`dashboard_code`);--> statement-breakpoint
CREATE TABLE `departments` (
	`department_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_unit_id` integer NOT NULL,
	`department_code` text,
	`department_name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`business_unit_id`) REFERENCES `business_units`(`business_unit_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_departments_business_unit_id` ON `departments` (`business_unit_id`);--> statement-breakpoint
CREATE TABLE `depreciation_methods` (
	`depreciation_method_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`method_code` text NOT NULL,
	`method_name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `depreciation_methods_method_code_unique` ON `depreciation_methods` (`method_code`);--> statement-breakpoint
CREATE TABLE `depreciation_profiles` (
	`depreciation_profile_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_name` text NOT NULL,
	`asset_category_id` integer,
	`depreciation_method_id` integer NOT NULL,
	`useful_life_months` integer NOT NULL,
	`residual_percentage` text NOT NULL,
	`convention` text,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`created_by` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`asset_category_id`) REFERENCES `asset_categories`(`category_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`depreciation_method_id`) REFERENCES `depreciation_methods`(`depreciation_method_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_depreciation_profiles_asset_category_id` ON `depreciation_profiles` (`asset_category_id`);--> statement-breakpoint
CREATE INDEX `idx_depreciation_profiles_depreciation_method_id` ON `depreciation_profiles` (`depreciation_method_id`);--> statement-breakpoint
CREATE INDEX `idx_depreciation_profiles_created_by` ON `depreciation_profiles` (`created_by`);--> statement-breakpoint
CREATE TABLE `disposal_methods` (
	`disposal_method_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`method_code` text NOT NULL,
	`method_name` text NOT NULL,
	`requires_certificate` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `disposal_methods_method_code_unique` ON `disposal_methods` (`method_code`);--> statement-breakpoint
CREATE TABLE `employees` (
	`employee_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_number` text NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`email` text,
	`business_unit_id` integer,
	`department_id` integer,
	`cost_center_id` integer,
	`manager_employee_id` integer,
	`default_location_id` integer,
	`employment_status` text NOT NULL,
	`hire_date` text,
	`termination_date` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`business_unit_id`) REFERENCES `business_units`(`business_unit_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`cost_center_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`manager_employee_id`) REFERENCES `employees`(`employee_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`default_location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employee_number_unique` ON `employees` (`employee_number`);--> statement-breakpoint
CREATE INDEX `idx_employees_business_unit_id` ON `employees` (`business_unit_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_department_id` ON `employees` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_cost_center_id` ON `employees` (`cost_center_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_manager_employee_id` ON `employees` (`manager_employee_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_default_location_id` ON `employees` (`default_location_id`);--> statement-breakpoint
CREATE TABLE `files` (
	`file_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`original_filename` text NOT NULL,
	`stored_filename` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text,
	`file_size` integer,
	`checksum` text,
	`uploaded_by` integer NOT NULL,
	`uploaded_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_files_uploaded_by` ON `files` (`uploaded_by`);--> statement-breakpoint
CREATE TABLE `gate_pass_assets` (
	`gate_pass_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	PRIMARY KEY(`gate_pass_id`, `asset_id`),
	FOREIGN KEY (`gate_pass_id`) REFERENCES `gate_passes`(`gate_pass_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_gate_pass_assets_gate_pass_id` ON `gate_pass_assets` (`gate_pass_id`);--> statement-breakpoint
CREATE INDEX `idx_gate_pass_assets_asset_id` ON `gate_pass_assets` (`asset_id`);--> statement-breakpoint
CREATE TABLE `gate_passes` (
	`gate_pass_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gate_pass_number` text NOT NULL,
	`requester_id` integer NOT NULL,
	`approved_by` integer,
	`valid_from` text NOT NULL,
	`valid_until` text NOT NULL,
	`purpose` text,
	`destination` text,
	`status` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gate_passes_gate_pass_number_unique` ON `gate_passes` (`gate_pass_number`);--> statement-breakpoint
CREATE INDEX `idx_gate_passes_requester_id` ON `gate_passes` (`requester_id`);--> statement-breakpoint
CREATE INDEX `idx_gate_passes_approved_by` ON `gate_passes` (`approved_by`);--> statement-breakpoint
CREATE TABLE `inventory_scan_results` (
	`inventory_scan_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_session_id` integer NOT NULL,
	`asset_id` integer,
	`scanned_barcode` text,
	`scanned_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`scanned_by` integer NOT NULL,
	`expected_location_id` integer,
	`actual_location_id` integer,
	`result` text NOT NULL,
	`remarks` text,
	FOREIGN KEY (`inventory_session_id`) REFERENCES `inventory_sessions`(`inventory_session_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`scanned_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`expected_location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actual_location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_scan_results_inventory_session_id` ON `inventory_scan_results` (`inventory_session_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_scan_results_asset_id` ON `inventory_scan_results` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_scan_results_scanned_by` ON `inventory_scan_results` (`scanned_by`);--> statement-breakpoint
CREATE INDEX `idx_inventory_scan_results_expected_location_id` ON `inventory_scan_results` (`expected_location_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_scan_results_actual_location_id` ON `inventory_scan_results` (`actual_location_id`);--> statement-breakpoint
CREATE TABLE `inventory_sessions` (
	`inventory_session_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_name` text NOT NULL,
	`location_id` integer,
	`started_at` text NOT NULL,
	`completed_at` text,
	`started_by` integer NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`started_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_sessions_location_id` ON `inventory_sessions` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_sessions_started_by` ON `inventory_sessions` (`started_by`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`invoice_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`vendor_id` integer NOT NULL,
	`purchase_order_id` integer,
	`invoice_date` text NOT NULL,
	`amount` text,
	`currency_code` text,
	`file_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`vendor_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`purchase_order_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`file_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_invoices_vendor_id` ON `invoices` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_invoices_purchase_order_id` ON `invoices` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `idx_invoices_file_id` ON `invoices` (`file_id`);--> statement-breakpoint
CREATE TABLE `location_types` (
	`location_type_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location_type_code` text NOT NULL,
	`location_type_name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `location_types_location_type_code_unique` ON `location_types` (`location_type_code`);--> statement-breakpoint
CREATE TABLE `locations` (
	`location_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location_type_id` integer NOT NULL,
	`parent_location_id` integer,
	`location_code` text,
	`location_name` text NOT NULL,
	`site_code` text,
	`building` text,
	`floor` text,
	`room_area` text,
	`rack` text,
	`shelf` text,
	`bin` text,
	`workstation` text,
	`rack_unit` text,
	`city` text,
	`province` text,
	`country` text,
	`vendor_id` integer,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`location_type_id`) REFERENCES `location_types`(`location_type_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`parent_location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`vendor_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_location_code_unique` ON `locations` (`location_code`);--> statement-breakpoint
CREATE INDEX `idx_locations_location_type_id` ON `locations` (`location_type_id`);--> statement-breakpoint
CREATE INDEX `idx_locations_parent_location_id` ON `locations` (`parent_location_id`);--> statement-breakpoint
CREATE INDEX `idx_locations_vendor_id` ON `locations` (`vendor_id`);--> statement-breakpoint
CREATE TABLE `manufacturers` (
	`manufacturer_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`manufacturer_name` text NOT NULL,
	`support_url` text,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manufacturers_manufacturer_name_unique` ON `manufacturers` (`manufacturer_name`);--> statement-breakpoint
CREATE TABLE `movement_types` (
	`movement_type_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movement_code` text NOT NULL,
	`movement_name` text NOT NULL,
	`changes_location` integer DEFAULT 1 NOT NULL,
	`changes_custody` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movement_types_movement_code_unique` ON `movement_types` (`movement_code`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`notification_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`notification_type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`reference_type` text,
	`reference_id` integer,
	`is_read` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`read_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_id` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `operation_guards` (
	`guard_id` text PRIMARY KEY NOT NULL,
	`passed` integer NOT NULL,
	CONSTRAINT "operation_changed_one_row" CHECK(passed = 1)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`permission_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`permission_code` text NOT NULL,
	`module` text NOT NULL,
	`action` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_permission_code_unique` ON `permissions` (`permission_code`);--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`po_item_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_order_id` integer NOT NULL,
	`asset_model_id` integer,
	`description` text,
	`quantity` text DEFAULT '1' NOT NULL,
	`unit_price` text,
	`total_price` text,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`purchase_order_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`asset_model_id`) REFERENCES `asset_models`(`model_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_order_items_purchase_order_id` ON `purchase_order_items` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_order_items_asset_model_id` ON `purchase_order_items` (`asset_model_id`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`purchase_order_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`po_number` text NOT NULL,
	`vendor_id` integer NOT NULL,
	`order_date` text NOT NULL,
	`total_amount` text,
	`currency_code` text,
	`status` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`vendor_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_po_number_unique` ON `purchase_orders` (`po_number`);--> statement-breakpoint
CREATE INDEX `idx_purchase_orders_vendor_id` ON `purchase_orders` (`vendor_id`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` integer NOT NULL,
	`permission_id` integer NOT NULL,
	PRIMARY KEY(`role_id`, `permission_id`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_role_permissions_role_id` ON `role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_role_permissions_permission_id` ON `role_permissions` (`permission_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`role_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role_code` text NOT NULL,
	`role_name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_role_code_unique` ON `roles` (`role_code`);--> statement-breakpoint
CREATE TABLE `security_movements` (
	`security_movement_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`movement_type` text NOT NULL,
	`employee_id` integer,
	`location_id` integer NOT NULL,
	`gate_pass_id` integer,
	`scanned_by` integer NOT NULL,
	`scan_time` text NOT NULL,
	`verification_result` text NOT NULL,
	`flagged` integer DEFAULT 0 NOT NULL,
	`remarks` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`location_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`gate_pass_id`) REFERENCES `gate_passes`(`gate_pass_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`scanned_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_security_movements_asset_id` ON `security_movements` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_security_movements_employee_id` ON `security_movements` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_security_movements_location_id` ON `security_movements` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_security_movements_gate_pass_id` ON `security_movements` (`gate_pass_id`);--> statement-breakpoint
CREATE INDEX `idx_security_movements_scanned_by` ON `security_movements` (`scanned_by`);--> statement-breakpoint
CREATE TABLE `units_of_measure` (
	`unit_of_measure_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uom_code` text NOT NULL,
	`uom_name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `units_of_measure_uom_code_unique` ON `units_of_measure` (`uom_code`);--> statement-breakpoint
CREATE TABLE `user_dashboards` (
	`user_id` integer NOT NULL,
	`dashboard_type_id` integer NOT NULL,
	`is_default` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`user_id`, `dashboard_type_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`dashboard_type_id`) REFERENCES `dashboard_types`(`dashboard_type_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_user_dashboards_user_id` ON `user_dashboards` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_dashboards_dashboard_type_id` ON `user_dashboards` (`dashboard_type_id`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`effective_from` text,
	`effective_to` text,
	PRIMARY KEY(`user_id`, `role_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_user_roles_user_id` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_roles_role_id` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE TABLE `user_scopes` (
	`user_scope_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`scope_type` text NOT NULL,
	`scope_reference_id` integer,
	`access_level` text NOT NULL,
	`effective_from` text,
	`effective_to` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_user_scopes_user_id` ON `user_scopes` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_login_at` text,
	`failed_login_count` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`mfa_enabled` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` integer,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_employee_id` ON `users` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_users_created_by` ON `users` (`created_by`);--> statement-breakpoint
CREATE TABLE `vendors` (
	`vendor_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendor_code` text,
	`vendor_name` text NOT NULL,
	`vendor_type` text NOT NULL,
	`contact_name` text,
	`contact_email` text,
	`contact_phone` text,
	`address` text,
	`website` text,
	`support_url` text,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendors_vendor_code_unique` ON `vendors` (`vendor_code`);