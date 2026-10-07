CREATE TABLE `system_settings` (
	`setting_key` text PRIMARY KEY NOT NULL,
	`setting_value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`team_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	PRIMARY KEY(`team_id`, `employee_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`team_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`employee_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`team_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_name` text NOT NULL,
	`department_id` integer,
	`is_active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_team_name_unique` ON `teams` (`team_name`);--> statement-breakpoint
CREATE TABLE `user_permission_overrides` (
	`user_id` integer NOT NULL,
	`permission_id` integer NOT NULL,
	`effect` text NOT NULL,
	PRIMARY KEY(`user_id`, `permission_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "valid_permission_effect" CHECK(effect IN ('ALLOW','DENY'))
);
--> statement-breakpoint
ALTER TABLE `app_sessions` ADD `mfa_verified` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `first_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `last_name` text;--> statement-breakpoint
ALTER TABLE `users` ADD `department_id` integer REFERENCES departments(department_id);--> statement-breakpoint
ALTER TABLE `users` ADD `business_unit_id` integer REFERENCES business_units(business_unit_id);--> statement-breakpoint
ALTER TABLE `users` ADD `site_id` integer REFERENCES locations(location_id);--> statement-breakpoint
ALTER TABLE `users` ADD `force_password_change` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_required` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_pending_secret` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_last_step` integer DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX users_email_casefold ON users(lower(email));
--> statement-breakpoint
CREATE UNIQUE INDEX users_username_casefold ON users(lower(username));
--> statement-breakpoint
CREATE INDEX idx_audit_target ON audit_logs(module,record_id,audit_id);
--> statement-breakpoint
CREATE TRIGGER protect_last_admin_status BEFORE UPDATE OF is_active ON users
WHEN NEW.is_active=0 AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE ur.user_id=OLD.user_id AND r.role_code='SUPER_ADMIN')
AND (SELECT COUNT(DISTINCT u.user_id) FROM users u JOIN user_roles ur ON ur.user_id=u.user_id JOIN roles r ON r.role_id=ur.role_id WHERE u.is_active=1 AND r.role_code='SUPER_ADMIN')<=1
BEGIN SELECT RAISE(ABORT,'The final Super Admin must remain active'); END;
--> statement-breakpoint
CREATE TRIGGER protect_last_admin_role BEFORE DELETE ON user_roles
WHEN (SELECT role_code FROM roles WHERE role_id=OLD.role_id)='SUPER_ADMIN'
AND (SELECT COUNT(DISTINCT u.user_id) FROM users u JOIN user_roles ur ON ur.user_id=u.user_id JOIN roles r ON r.role_id=ur.role_id WHERE u.is_active=1 AND r.role_code='SUPER_ADMIN')<=1
BEGIN SELECT RAISE(ABORT,'The final Super Admin role must remain assigned'); END;
