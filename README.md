# J-MDM — Enterprise IT Asset Management Platform

J-MDM is a browser-based IT asset management (ITAM) platform that combines shared asset records and lifecycle workflows with an earlier device-local barcode scanner. The application uses a Node.js gateway on Render and a ChatGPT Sites backend for persistent records and evidence. This description reflects repository implementation documentation; individual capabilities require runtime QA before being declared production-verified.

## Business objectives and core capabilities

J-MDM supports asset identification, registration, classification, inventory, ownership, assignments and returns, transfers, repairs, refresh planning, disposal, procurement links, financial records and evidence tracking. Its shared-record model separates employees from login users and applies role permissions and organizational scopes.

The earlier **Device History** and **Device Inventory** scanner features use browser-local IndexedDB. They are not automatically synchronized with the shared ITAM records; importing a device item into shared assets is explicit. Barcode camera decoding remains local to the browser.

## Architecture

- **Frontend:** static browser JavaScript/CSS served from `dist/` by the Node gateway.
- **Gateway:** `server.js`, `remote-auth.js` and related authentication logic, hosted on Render.
- **Backend:** `sites-service/`, backed by ChatGPT Sites and Drizzle ORM.
- **Database:** D1-compatible SQLite relational storage, with schemas/migrations in `sites-service/`.
- **Evidence:** R2 object storage; associated permissions and access controls require ongoing security verification.
- **Authentication:** when Sites service configuration is present, database-backed users, sessions, roles and scopes replace the original standalone administrator fallback. Do not assume the two modes are equivalent.
- **Deployment:** `render.yaml` configures the Node web service on `main`; Sites backend has separate build and deployment considerations.

See [ITAM implementation](docs/ITAM-implementation.md) for implementation-specific design notes and documented limitations. These notes are not a substitute for tests or operational validation.

## Repository orientation

| Path | Responsibility |
| --- | --- |
| `dist/` | Browser interface and bundled scanner assets |
| `server.js` | HTTP server, static assets, basic health endpoint |
| `auth.js`, `remote-auth.js` | Authentication paths and gateway behavior |
| `sites-service/` | Shared ITAM service, Drizzle schema, data access and tests |
| `test/` | Root automated tests |
| `.github/workflows/ci.yml` | Root syntax/tests and Sites build/tests |
| `render.yaml` | Render configuration |
| `docs/` | Technical documentation, coding standards and remediation inventory |
| `AGENTS.md` | AI-agent contributor instructions |

## Local development and checks

Use Node.js 24. From repository root:

```sh
npm ci
npm start
```

Local address: `http://localhost:3000` (or configured `PORT`). HTTPS is needed for camera access in typical remote/mobile browser environments.

Run the existing baseline validation:

```sh
node --check dist/app.js
node --check dist/navigation.js
node --check dist/itam.js
node --check dist/users.js
node --check dist/login.js
node --check dist/account-security.js
npm test
cd sites-service
npm ci
npm run build
npm test
```

These commands describe the existing validation pathway; passing results must be recorded separately. CI runs equivalent root and backend checks.

## Authentication, privacy and data protection

The gateway supports a configured local Super Admin fallback and shared-service authentication. The root fallback obtains administrator credentials from runtime environment configuration; **never commit credentials or hashes**. Database users/roles/scopes are managed through the Sites-backed model where enabled. Read source and tests before changing session/cookie behavior.

Keep sensitive credentials on the server. Employee photos, attached evidence and financial records require access control and retention review. Browser camera frames are decoded locally rather than uploaded as video.

## Hosting and deployments

`render.yaml` configures Render with `npm ci`, `npm start`, `/health`, and deployment on commits to `main`. The current `/health` route confirms process response but not necessarily upstream or database readiness. Sites backend and D1/R2 configuration are separate and must be verified for releases. See [implementation and hosting](docs/ITAM-implementation.md).

Required gateway integration environment variable **names** documented in the existing implementation: `SITE_API_URL`, `SITE_API_SECRET`, `SITE_SERVICE_TOKEN`. Other Sites and fallback-auth variable names are described in the linked implementation guide; do not publish values.

## Known limitations and verification boundaries

The existing implementation documentation identifies: incomplete missing/damaged inventory reconciliation; no automated scheduled warranty alerts; incomplete refresh replacement workflow; generic browse limits; 5 MB evidence upload limit; and limited specialized role dashboards. These are documented implementation limits, not necessarily observed production failures. See [remediation backlog](docs/REMEDIATION-BACKLOG.md) for verification priorities.

## Documentation and contribution index

- [AI agent instructions](AGENTS.md)
- [Engineering coding standards](docs/CODING-STANDARDS.md)
- [Technical remediation backlog](docs/REMEDIATION-BACKLOG.md)
- [ITAM implementation, data design, and deployment](docs/ITAM-implementation.md)
- [Continuous integration checks](.github/workflows/ci.yml)

## Scanner origin and third-party licensing

J-MDM evolved from the Smart Barcode Scanner web application. Scanner-related local history and CSV export remain relevant, but the overall product is now broader enterprise ITAM. The bundled ZXing barcode library is Apache-2.0 licensed; see `dist/vendor/LICENSE.zxing`.
