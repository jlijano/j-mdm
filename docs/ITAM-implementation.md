# ITAM implementation and hosting

The browser interface and login page remain on the existing Render web service, `https://j-mdm.onrender.com`. Persistent relational records live in ChatGPT Sites D1; uploaded evidence lives in Sites R2. Render forwards API requests using two server-only credentials: the Sites platform service credential and an independent application gateway secret. The browser receives only an opaque HttpOnly, Secure, SameSite cookie. Credentials must never be committed or embedded in frontend assets.

## Database design

The 51 tables in **ITAM_Database_Structure_and_Data_Dictionary(1).docx** are represented in `sites-service/db/schema.ts`, with their documented foreign keys, nullable columns, unique identifiers and composite keys. Versioned Drizzle migrations create the schema. Sessions and optimistic transaction guards add two internal tables. UTC timestamps are ISO strings. SQLite D1 replaces the document's logical MySQL types: large identifiers use SQLite integers and application validation rejects unsafe JavaScript integers. DECIMAL values are stored as exact decimal strings, with precision validation and Decimal.js calculations; SQLite's floating-point NUMERIC affinity is deliberately avoided.

The default administrator is seeded once from secret runtime configuration. Subsequent deploys do not reset account passwords. Employees remain separate from login users. Master records can be deactivated and are protected by restrictive foreign keys. Assets have unique tags and optional unique barcodes; serialized rows require quantity one. `TRANSFERRED` cannot be a status. Assignment history has a unique active-assignment constraint. Depreciation has a unique asset/month constraint. Audit records cannot be updated or deleted, including through direct SQL triggers.

Assignment, return, transfer request/receipt, repair send/return, refresh recommendation, disposal request/approval/completion and straight-line depreciation run in atomic D1 batches. Revision checks reject stale concurrent asset updates and roll back the entire operation. Pending transfers retain the previous current location. Disposal completion requires approval, data-wipe confirmation where required, and evidence attached to the same asset. Camera footage stays on the device; lookup/inventory scan results are stored in the shared database.

## Access and operation

Functional permissions come from active, effective-dated user roles. Record access also requires active user scopes. ENTERPRISE, BUSINESS_UNIT, DEPARTMENT, COST_CENTER, SITE and SELF are supported. SITE refers to a root location ID and includes descendant locations. Scoped organization/procurement/security administration requires enterprise scope, avoiding indirect disclosure through related records. SUPER_ADMIN has enterprise management access. A newly created user has no roles or scopes until explicitly assigned.

The Asset Management module exposes permission-aware forms for master, organization, financial, procurement, warranty, inventory, identity and dashboard records. History tables are read-only; asset details provide lifecycle actions and evidence uploads. Device inventory remains explicitly local, with an optional import into shared assets. Device records are retained if any import fails.

## Explicit limits and follow-up work

- TEAM scopes are rejected: the supplied document does not define teams or membership tables.
- MFA enrollment is not implemented; the application rejects enabling the flag.
- Straight-line depreciation is implemented. Declining balance, convention-specific proration and scheduled posting remain future work; unsupported calculations fail rather than fabricate values.
- Refresh recommendations are stored; replacement approval and completion are not automated.
- Inventory supports active-session scans, match/mismatch/unknown/duplicate classification. Full missing-asset reconciliation and damaged-item workflows require a further workflow.
- Gate checks are recorded with authorization results; security users cannot edit asset master records. Gate pass administration currently requires Super Admin.
- Warranty checks and notification delivery are stored as records, without vendor integrations or scheduled alerts.
- Dashboard counts reflect shared assets; specialized finance/HR/executive reports are not yet separate dashboards.
- Generic browse/search returns up to 500 records; the interface shows 100 per search. Bulk pagination is future work.
- Evidence uploads are limited to 5 MB each and downloaded as attachments.

Sites hosting and D1/R2 usage are included in the ChatGPT public beta within account-specific limits, not an unlimited or permanent free-hosting guarantee. OpenAI documents that limits may change and limit storage or public availability. The unused Render PostgreSQL trial was not connected and expires November 5, 2026.

## Deployment

`SITE_API_URL`, `SITE_API_SECRET` and `SITE_SERVICE_TOKEN` are Render secrets. `RENDER_API_SECRET`, `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD_HASH` are Sites runtime values. Matching gateway secrets must be configured on both services. The initial password is hashed using PBKDF2; database user records never expose hashes. Password changes do not change the deployment bootstrap hash or reset users on restart.

Deploy the Sites service first, then deploy Render. The backend source is mirrored in this GitHub repository under `sites-service/`; Sites owns its production build and database migration application. Render starts the repository root's `server.js`; it does not run D1 migrations or install a PostgreSQL database. Never put production credentials in a local environment example.

## Validation

Automated tests cover schema creation, gateway authorization, login/logout, server credential isolation, CSRF rejection, session expiration, account/role restrictions, asset uniqueness/quantity rules, repeated custody history, delayed transfer location updates, duplicate depreciation rejection and exact decimal calculation. Hardware-camera recognition still requires a supported mobile browser and physical barcode.
