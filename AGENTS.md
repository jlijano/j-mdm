# J-MDM AI Coding Agent Instructions

Applies to the entire repository. Read [README.md](README.md), [ITAM implementation](docs/ITAM-implementation.md), and the relevant module source before making changes. Consult [remediation backlog](docs/REMEDIATION-BACKLOG.md) and [coding standards](docs/CODING-STANDARDS.md).

## Mandatory workflow

PLAN -> AUDIT -> DESIGN -> IMPLEMENT -> TEST -> REVIEW -> DEPLOY -> VERIFY -> DOCUMENT.

1. Establish the requirement, constraints, actual behavior, and evidence before editing.
2. Inspect existing implementations and tests; do not duplicate routes, data models, permissions, or services.
3. Prefer the smallest coherent, independently testable change. Preserve interfaces and existing records.
4. Treat authentication, RBAC, organization scopes, audit history, D1 transactions, and R2 evidence authorization as security boundaries. Never bypass them.
5. Keep credentials in runtime configuration, not source, logs, frontend bundles, or commits. Do not expose sensitive employee data.
6. Never run destructive production SQL, reset user accounts, force-push, or overwrite concurrent changes. Major architecture, destructive, or security-sensitive changes require explicit human approval.
7. Evaluate failure, duplicate request, concurrency, boundary, and unauthorized scenarios. Write regressions for confirmed defects.
8. Do not infer production readiness from local tests or a Git push. Report implementation, test, deployment and production verification separately.
9. Add a traceable backlog item and update it with evidence, status, and commit SHA.
10. Never fabricate tests, coverage, rollout outcomes, screenshots, or historical releases.

## Baseline checks

From repository root (Node.js 24, dependencies installed with `npm ci`):

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

These are required minimum checks; run additional affected-module tests. Existing GitHub Actions `.github/workflows/ci.yml` also runs this baseline.

## Release evidence and status

For each item record: ID, finding and reproducible evidence, root cause (when confirmed), affected files, risk, modifications, tests and results, commit, deployment status, production verification, and remaining risks.

Allowed statuses: Pending; In Progress; Blocked; Fixed — Not Deployed; Deployed — Not Verified; Verified; Not Applicable.

Review `render.yaml`, `server.js`, `remote-auth.js`, `sites-service`, and the existing implementation documentation before proposing hosting or identity changes. The browser-local scanner inventory is not automatically the shared ITAM database.

If current documentation contradicts code, treat code and observed behavior as evidence, document the discrepancy, and correct the documentation. Documentation is not proof that a feature is working.
