CREATE INDEX `idx_refresh_due` ON `asset_lifecycle` (`refresh_due_date`);--> statement-breakpoint
CREATE INDEX `idx_warranty_end` ON `asset_warranties` (`warranty_end_date`);