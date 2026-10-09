CREATE TABLE IF NOT EXISTS evidence_quarantine (
 quarantine_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
 asset_id INTEGER NOT NULL REFERENCES assets(asset_id),
 document_type TEXT NOT NULL,
 original_filename TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 storage_path TEXT NOT NULL UNIQUE,
 file_size INTEGER NOT NULL,
 uploaded_by INTEGER NOT NULL REFERENCES users(user_id),
 status TEXT NOT NULL DEFAULT 'PENDING_SCAN' CHECK(status IN ('PENDING_SCAN','REJECTED','APPROVED')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
