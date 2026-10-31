CREATE TABLE quick_sync_events (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 tenant TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('asset','scan')), entity_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0), operation_id TEXT NOT NULL, origin TEXT NOT NULL,
 content_hash TEXT NOT NULL, request_hash TEXT NOT NULL, payload TEXT NOT NULL,
 deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1)), actor INTEGER NOT NULL REFERENCES users(user_id), created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX quick_sync_revision ON quick_sync_events(tenant,kind,entity_id,revision);
--> statement-breakpoint
CREATE UNIQUE INDEX quick_sync_operation ON quick_sync_events(tenant,operation_id);
--> statement-breakpoint
CREATE INDEX quick_sync_cursor ON quick_sync_events(tenant,sequence);
--> statement-breakpoint
CREATE TRIGGER quick_sync_no_update BEFORE UPDATE ON quick_sync_events BEGIN SELECT RAISE(ABORT,'Scanner history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER quick_sync_no_delete BEFORE DELETE ON quick_sync_events BEGIN SELECT RAISE(ABORT,'Scanner history is retained'); END;
