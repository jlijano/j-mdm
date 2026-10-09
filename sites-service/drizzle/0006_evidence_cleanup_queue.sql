CREATE TABLE IF NOT EXISTS evidence_cleanup_queue (
 storage_path TEXT PRIMARY KEY NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 last_error TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 last_attempt_at TEXT
);
