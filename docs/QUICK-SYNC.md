# Quick Scanner global synchronization

## Browser migration

Open `/quick` or `/quick/assets` **on every original browser/device containing records**. The server cannot pull localStorage from other browsers. Keep that browser's data and origin intact; do not clear browser data, switch profiles, or uninstall the browser before migration.

1. Download **original JSON backup**, **original assets CSV**, and **original scans CSV** from Global synchronization. JSON retains the exact raw legacy strings plus local snapshots/current sync cache, pending operations and archived conflict choices. Keep backups in approved storage: they contain custodian names and notes.
2. Sign in at `/admin/login`, completing password/MFA requirements. Return to the scanner and Check sign-in / reconnect. Shared reads require existing `assets.view` and ENTERPRISE scope. Upload/edit requires `assets.manage` and ENTERPRISE MANAGE scope. Super Admin retains existing access. Narrow SITE/TEAM/SELF scopes are denied because free-text legacy fields cannot safely map to structured scope IDs.
3. Choose **Upload this browser and enable sync** after downloading JSON. Original keys `jmdm-quick-records-v1` and `jmdm-quick-scans-v1` remain untouched in shared mode. New shared data uses a separate user/tenant namespace. Upload is explicit even when already viewing shared records.
4. Keep the browser open until synchronized. Repeat on the next original device. Duplicate imports are safe; differing records for the same barcode become conflicts for review. Never discard an original device merely because another device shows some assets.
5. Review pending/conflicting items. Both submitted and shared values are displayed as text. Keeping shared or applying pending archives all dependent local operations before replacing them. A further concurrent edit causes another conflict. Export a new JSON backup after resolving conflicts.

There is no automatic production migration. A server deployment alone does not upload browser data. Storage-full, malformed legacy JSON, expired sessions and connectivity failures must be resolved before considering a device migrated. Malformed raw JSON remains downloadable. Backups protect against application changes, not user deletion of browser storage/device failure.

## Data and security

The existing Sites D1 database stores dedicated, append-only `quick_sync_events` revisions. Quick records remain a scanner workspace; they do not create structured ITAM employee assignments or change protected asset lifecycle records. Each row carries a server-selected tenant, entity ID, revision, client operation ID, origin, SHA-256 content/request hashes, full JSON payload, tombstone, actor and timestamp. Audit and accepted revision commit in one D1 batch. Unique tenant/entity/revision keys serialize concurrent writes. Unique operation IDs make unknown-response retries safe. Reusing an ID with different content is rejected.

Asset identity is SHA-256 of the trimmed, lowercased barcode; shared identifiers are permanent. Other details remain editable. Scan identity is SHA-256 of canonical JSON; historical scans are retained. Importing equivalent asset payloads is idempotent across origins; different payloads (including different timestamps) require review. This conservative policy avoids dropping unexplained differences.

The existing Render gateway and Sites secret checks, secure HttpOnly sessions, password/MFA gates, account roles and revocation apply. No public asset-read API and no new device bearer tokens are introduced. Logout, account deactivation, permission changes and session expiry revoke server access through the existing administration flow. A 401/403 hides shared data from the current UI. Previously authorized offline browser copies and backups cannot be remotely erased: use trusted browser profiles and device controls. Original login-free local records remain local.

The tenant is bound to this organization's dedicated Sites database, default namespace `quick-default`; optional server-only `QUICK_SYNC_TENANT` selects a namespace. Clients cannot select tenants. This is not a multi-organization identity directory: do not place unrelated organizations' users in one Sites database. Do not change the tenant value during rollout without a reviewed migration plan.

The browser retains individually durable outbox entries; receipts are cached before outbox entries are retired. Web Locks serialize tabs and fail closed on unsupported browsers. Unchanged stale rows never imply updates/deletions. Explicit deletions produce a tombstone; history and audit remain. Polling every three seconds shares assets and scans. New work survives temporary offline failures and retries on reconnect. Pending work is account/tenant isolated. Read-only users may view without uploading.

Pairing remains an ephemeral camera/scan relay, separate from shared authorization. Transient poll failures retry without closing the room. The desktop acknowledges only after local persistence. Queues reject overflow instead of silently dropping old events, and acknowledged events are retired. Active owner polling renews the room. Render restarts/expiry require re-pairing; phone-local scans remain available for explicit migration. Hardware camera recognition and mobile permission prompts need actual device testing.

## Schema, rollback and release

`0006_quick_sync.sql` adds a new table, indexes and immutable-history triggers; it does not alter or remove old data. Generated metadata was reviewed against existing schema drift: the generated SQL included unrelated already implemented Asset 360/runtime-upgrade changes, so only the new scanner table is shipped. The existing TypeScript purchase-order-line reference was corrected to the already existing `po_item_id` so generation can run. Applied SQL and earlier journal entries remain unchanged.

Deploy the scoped Sites source first, preserving its existing project ID, D1/R2 bindings, secrets and audience; the hosted source predates the GitHub mirror. Port only the sync worker hook, module, table declaration and new migration metadata to that source. Build/test both source trees. Then merge the tested frontend/gateway PR and monitor the exact Render commit to `live`. Do not treat `/health` alone as database readiness.

Rollback: set Sites runtime `QUICK_SYNC_DISABLED=1` to stop shared operations, or redeploy the prior Worker while **retaining the added table**. Revert the frontend commit if necessary. Users can Return to local mode; original legacy data reappears, while cache, pending work and backups remain. Never run down-migration/drop/delete SQL against the event table. Re-enabling the same tenant resumes idempotent pending work. Tombstoned assets can be restored with a reviewed `put` containing the prior payload, same entity ID and current tombstone revision; history stays intact. Take a JSON backup before recovery operations.

## Verification boundaries

Automated regressions cover two isolated browser stores, exact legacy-string preservation, repeated imports, offline retry, concurrent stale edits, explicit tombstones, unknown operation-ID replay, transaction rollback on audit failure, tenant isolation, missing gateway/session, narrow-scope denial, view/manage separation, session revocation, corrupt legacy JSON and local-mode reversion. Existing baseline checks are required. Browser UI checks cover local creation and scanner/library compatibility; physical phone cameras and authenticated production migration are separate checks. No production records should be created for testing without an approved test account/data scope.

## Release evidence — October 31, 2026

PR #5 merged as `d5ee134c57834db3b26e1b7d038ac77d5d33849f` after CI run 41203887885 succeeded. Sites version 6 deployed the scoped source `627ea7c5564be8ad08cd2c0b32785aa401efbbeb` successfully. Render deployment `dep-dbiuftvb9u1s73b4cog0` reached live for the merge commit. Live static-byte, unauthorized access, CSRF and ephemeral pairing checks passed at 21:08 Manila time. Status remains **Deployed — Not Verified** for authenticated production migration/CRUD and real phone cameras. No historical local browser records were uploaded. Full evidence is in `quick-sync-release-evidence.json`; rollout steps above remain required on each original device.
