-- Additive employee-level equipment register. Keep assets and existing custody history intact.
-- Apply after a verified production backup through the Sites/D1 migration workflow.
CREATE TABLE "employee_equipment_register" (
  "register_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "record_date" text,
  "site" text NOT NULL,
  "line_number" integer,
  "account" text NOT NULL,
  "employee_number" text NOT NULL,
  "employee_name" text NOT NULL,
  "cpu_serial" text,
  "monitor_1_serial" text,
  "monitor_2_serial" text,
  "headset_serial" text,
  "is_active" integer NOT NULL DEFAULT 1,
  "created_at" text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "created_by" integer NOT NULL REFERENCES "users"("user_id") ON DELETE RESTRICT,
  "updated_at" text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_by" integer NOT NULL REFERENCES "users"("user_id") ON DELETE RESTRICT,
  CONSTRAINT "equipment_line_number_positive" CHECK("line_number" IS NULL OR "line_number" > 0),
  CONSTRAINT "equipment_active_boolean" CHECK("is_active" IN (0,1))
);
--> statement-breakpoint
CREATE INDEX "idx_equipment_employee" ON "employee_equipment_register" ("employee_number");
--> statement-breakpoint
CREATE INDEX "idx_equipment_site_date" ON "employee_equipment_register" ("site","record_date");
--> statement-breakpoint
CREATE INDEX "idx_equipment_account" ON "employee_equipment_register" ("account");
--> statement-breakpoint
CREATE INDEX "idx_equipment_cpu_serial" ON "employee_equipment_register" ("cpu_serial");
