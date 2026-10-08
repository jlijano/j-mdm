# QA Accounts and RBAC Testing

J-MDM includes an opt-in, idempotent QA seed for validating authentication, backend authorization, navigation, and data-scope enforcement. QA credentials are never stored in this repository or returned by an API.

## Safety and configuration

QA seeding runs only when both runtime variables are present:

- `ENABLE_QA_SEED=true` (exact lowercase value)
- `QA_SEED_PASSWORD=<deployment secret>` (minimum 12 characters)

If either requirement is missing, no QA accounts are created. Existing QA users are reused and their password hashes are not changed. To rotate a QA password, use the existing Super Admin password-reset workflow; normal startup/redeployment never resets it. Disable future QA seeding by removing `ENABLE_QA_SEED` or setting it to any value other than exactly `true`.

The seed uses the application's PBKDF2 password hashing implementation. Passwords are not written to audit logs, frontend JavaScript, documentation, API responses, or Git.

## Permission model

The current application implements permissions as `<module>.view` and `<module>.manage`, plus the same pattern for extended modules such as `technical`, `custody`, `movements`, `reports`, `exports`, and `barcode`. The QA seed deliberately uses these real backend permission codes. It does not invent frontend-only `CREATE`, `EDIT`, `ASSIGN`, or similar codes.

Existing roles `SUPER_ADMIN`, `IT_ADMIN`, `ITAM_MANAGER`, `SERVICE_DESK`, and `SECURITY` are reused and verified. New QA-supported role definitions are created only if their stable role code is missing. If one of those new role codes already exists with a different permission set, the seed reports a conflict and does not overwrite that pre-existing role's permissions or create the corresponding QA user.

A known architecture restriction is preserved: inventory-session scanning requires both `inventory.manage` and ENTERPRISE MANAGE scope. Department/site/team custodians can use scoped barcode lookup but cannot conduct an enterprise inventory session. This is intentionally not weakened by the QA seed.

## Personas and expected access

| Account | Role | Department | Scope | Expected modules / write access | Expected restrictions |
|---|---|---|---|---|---|
| qa.superadmin | SUPER_ADMIN | — | ENTERPRISE MANAGE | All modules and administration | None beyond application safeguards |
| qa.itadmin | IT_ADMIN | IT | ENTERPRISE MANAGE | Assets read, barcode scan, technical manage, repairs/refresh/movements, master/files/reports/export as existing role permits | No automatic Super Admin, finance, users/roles |
| qa.itam | ITAM_MANAGER | IT / IT Asset Management | ENTERPRISE MANAGE | Assets, inventory, custody, movements, repairs, refresh, disposal, files, reports/export | No Users & Roles unless role is explicitly changed |
| qa.servicedesk | SERVICE_DESK | IT / Service Desk | ENTERPRISE MANAGE | Asset lookup, scanner, technical/warranty, repair, custody read, files/reports read | No user admin, finance manage, disposal manage/approval |
| qa.inventory | INVENTORY_CUSTODIAN | IT / Asset Inventory | ENTERPRISE MANAGE | Asset lookup, barcode, inventory, custody/movement operations, reports/export | No users, finance, security admin |
| qa.finance | FINANCE_ASSET_ACCOUNTING | Finance | ENTERPRISE MANAGE | Asset read, finance read/write, procurement read, reports/export | No users, technical or security admin |
| qa.procurement | PROCUREMENT | Procurement | ENTERPRISE MANAGE | Procurement read/write, asset/finance/warranty references, reports/export | No unrelated administration |
| qa.hr | HR_ADMIN | Human Resources | ENTERPRISE MANAGE | Organization read/write, asset/custody read, reports/export | No finance, technical, security, disposal or user admin |
| qa.security | SECURITY | Security | ENTERPRISE MANAGE | Asset/custody/movement read, scanner, security checks | No financial/technical/master record editing |
| qa.deptmanager | DEPARTMENT_MANAGER | QA Test Department | DEPARTMENT VIEW | Scoped asset/custody/movement/report visibility | No enterprise data; read-only scope |
| qa.deptcustodian | DEPARTMENT_ASSET_CUSTODIAN | QA Test Department | DEPARTMENT MANAGE | Scoped asset lookup, scanner, custody/movements | No unrelated departments; enterprise inventory sessions denied |
| qa.sitecustodian | SITE_ASSET_CUSTODIAN | QA Test Department | SITE MANAGE | Site/descendant asset lookup, scanner, custody/movements | No assets outside QA Test Site; enterprise inventory sessions denied |
| qa.management | MANAGEMENT_VIEWER | Management | ENTERPRISE VIEW | Dashboard/assets, finance summaries, reports/export | No create/edit/lifecycle/users/settings |
| qa.employee | GENERAL_EMPLOYEE | QA Test Department | SELF VIEW | Own assigned asset and custody information | No other employee's assets or writes |
| qa.teamlead | TEAM_ASSET_CUSTODIAN | QA Test Department | TEAM MANAGE | Team asset lookup, scanner, custody/movements | No unrelated team/department assets; enterprise inventory sessions denied |

## Isolated QA organization and data

The seed creates or reuses stable QA identifiers:

- Business units: `QA_BU` / QA Business Unit and `QA_CONTROL_BU` / QA Control Business Unit.
- Departments include QA Test Department plus isolated IT, ITAM, Service Desk, Inventory, Finance, Procurement, HR, Security, and Management QA departments. `QA_CONTROL_DEPT` is deliberately outside the primary QA business unit.
- Sites: `QA_SITE` (QA Test Site), descendant `QA_SITE_ROOM_1`, and unrelated `QA_CONTROL_SITE`.
- Teams: QA Test Team and QA Control Team.
- Employees: QA Department Manager, QA Department Custodian, QA Team Lead, QA Site Custodian, QA Employee One, QA Employee Two, and an unrelated QA Control Employee.
- Assets: `QA-LAPTOP-001`, `QA-LAPTOP-002`, `QA-DESKTOP-001`, `QA-MONITOR-001`, and `QA-PHONE-001`.

The first four assets are intentionally assigned within QA Test Department/Site. The two laptops belong to members of QA Test Team. `QA-LAPTOP-001` belongs to the employee linked to `qa.employee`. `QA-PHONE-001` is assigned to the control employee in a different business unit, department, team, and site, providing a negative boundary record.

The seed uses valid existing master data and does not alter real employees or existing production users.

## Scope verification

Do not treat page visibility as proof. Verify APIs:

- ENTERPRISE: `qa.itadmin` can see all five QA assets.
- BUSINESS_UNIT: supported by the existing backend scope engine and existing automated scope tests. A QA Business Unit and a separate QA Control Business Unit are seeded so an administrator can assign this scope to a QA user for focused regression testing.
- DEPARTMENT: `qa.deptcustodian` sees QA Test Department assignments and not `QA-PHONE-001`.
- SITE: `qa.sitecustodian` sees assets at QA Test Site and descendant QA Test Site - Room 1, not the control site.
- TEAM: `qa.teamlead` sees `QA-LAPTOP-001` and `QA-LAPTOP-002`, but not QA department assets assigned outside the team.
- SELF: `qa.employee` sees only `QA-LAPTOP-001`.

## Negative RBAC matrix

At minimum confirm:

| Persona | Denied operation | Expected |
|---|---|---|
| Finance | `GET /api/admin/options` | 403 |
| Security | create/edit `asset_financials` | 403 |
| Service Desk | disposal approval | 403 |
| Management Viewer | asset PATCH | 403 |
| Department Custodian | fetch an asset outside department | hidden/not found (404) |
| General Employee | fetch another employee's asset context | hidden/not found (404) |

Scope-denied individual assets intentionally return 404 rather than 403 to avoid revealing that an out-of-scope asset exists. Permission-denied modules/actions return 403.

## Login and session test

For each persona:

1. POST `/api/auth/login` using the separately managed QA secret.
2. GET `/api/auth/me` and verify username, role(s), permissions and scopes.
3. Verify permitted APIs succeed.
4. Verify at least one forbidden API/action is denied.
5. POST `/api/auth/logout`.
6. Verify `/api/auth/me` returns 401 with the old session.

Never add a production page that displays QA usernames with passwords.

## Mobile operational checks

Manually validate responsive UI on phone/tablet for Service Desk, Inventory Custodian, Security, Department Custodian and General Employee. Check scanner access, navigation, forms/cards/tables, asset lookup, denied controls/actions, and logout. Backend tests prove authorization; browser/device testing remains required for camera permission and responsive rendering.

## Idempotency and cleanup

Stable usernames, emails, codes, employee numbers, team names, location codes and asset tags are used. Re-running the seed reuses those records and does not duplicate them. Existing QA asset assignments are not rewritten on normal startup.

QA-created audit events use module `qa_seed`, action `QA_SEED_CREATED`, and remark `QA seed`. QA data also uses `QA_` / `QA-` identifiers where possible.

For cleanup, first disable `ENABLE_QA_SEED`. Use a controlled Super Admin/database maintenance procedure that identifies records by the stable QA identifiers above, respects foreign-key dependencies, preserves audit history, and verifies that no non-QA records reference the QA rows. Do not use broad name matching such as deleting every record containing the letters "QA". Production application APIs intentionally retain records rather than offering destructive general-purpose deletion.

## Automated tests

`test/qa-seed.test.js` validates opt-in behavior, idempotency, password non-reset, role reuse/creation, login/logout, negative permissions, and department/site/team/self scope boundaries. Existing tests continue to cover BUSINESS_UNIT scope and core authentication/RBAC behavior.
