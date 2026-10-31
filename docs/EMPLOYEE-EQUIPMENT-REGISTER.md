# Employee Equipment Register — additive J-MDM data model

## Purpose

Keep the canonical \`assets\` table as **one device per row**. The Employee Equipment Register is an **employee-level inventory snapshot**: one row may reference one CPU, two monitors, and one headset. This is an additive dataset; it does not automatically change asset custody, stock status, location, or employee master records.

## Columns / form

| Source column | Stored column | Type | Required | Meaning |
| --- | --- | --- | --- | --- |
| Date | record_date | DATE (YYYY-MM-DD) | No | Date of equipment snapshot; null if unknown |
| Site | site | VARCHAR(150) | Yes | Source site/tower, e.g. PAVIA T2 |
| # | line_number | Positive INT | No | Source row number, not unique across dates/sites |
| Account | account | VARCHAR(120) | Yes | Client account |
| Employee ID | employee_number | VARCHAR(50) | Yes | Employee number stored as text, not a database user ID |
| NAME | employee_name | VARCHAR(200) | Yes | Employee name at time of snapshot |
| CPU Serial | cpu_serial | VARCHAR(120) | No | CPU or desktop serial |
| Monitor 1 Serial | monitor_1_serial | VARCHAR(120) | No | First display serial |
| Monitor 2 Serial | monitor_2_serial | VARCHAR(120) | No | Second display serial |
| Headset SN | headset_serial | VARCHAR(120) | No | Headset serial |

Server-maintained: \`register_id\` (PK), \`created_at\`, \`created_by\`, \`updated_at\`, \`updated_by\`; \`is_active\` supports deactivation without deleting audit or records. No physical-asset record is duplicated, deleted, renamed, or overwritten by migration 0007.

## Authorization and data handling

Employee names, identifiers, and custody data must only be visible to authenticated accounts holding **custody.view plus enterprise scope** (or Super Admin); writes require **custody.manage plus enterprise MANAGE scope** (or Super Admin). Existing server-side permission checks remain mandatory; hiding a menu item is not authorization. Changes pass through the existing audited \`/api/records/employee_equipment_register\` endpoint; \`/api/export/employee_equipment_register\` also requires export permission.

Source serials are snapshots. They are not automatically matched to \`assets.serial_number\` because serial matching can be ambiguous, and should not silently create asset assignments. A future verified reconciliation workflow may link register rows to canonical asset IDs. No sample employee data should be committed or inserted into production test databases.

## Deployment and no-loss migration

1. Confirm Sites/D1 production backup with restore procedure, D1 migration version and existing asset count. Snapshot current schema and counts; do **not** reset DB or seed personal employee data.
2. Apply additive Sites migration \`0007_employee_equipment_register.sql\` using the approved Sites deployment/migration flow. Verify new table exists and old \`assets\` counts and existing assignments are unchanged.
3. Deploy the updated Sites API/metadata build. Verify read access denied to anonymous and non-enterprise users, authorized creation/lookup, date validation, 10 requested columns, and audit event.
4. Only then deploy the matching Render frontend from \`main\` (or a coordinated release). Before Sites is deployed, the frontend's new module must not be made live.
5. Check cross-device reads in the authenticated ITAM workspace. Browser-local Quick Scanner history is separate and **not imported automatically** by this migration.
6. Use controlled rollback: disable the UI/API module while retaining the additive table and all records; do not drop the new table if people have begun entering data.

The employee sample supplied in the request should be entered by a properly authorized user after migration and verification, not in a development migration.

## UI

In the authenticated ITAM workspace, use **Asset Management → Employee Equipment**. The existing records page handles filtering, editing, audit and CSV export. With this module selected, the data table shows all ten requested business columns. Its 10-column desktop table scrolls horizontally and responds to the existing mobile table layout. Other ITAM routes retain the standard fixed header and sidebar.
