# J-MDM Coding Standards

Status: initial governance baseline; reconcile with existing implementation conventions before broad refactors.

## Engineering process

Use PLAN -> AUDIT -> DESIGN -> IMPLEMENT -> TEST -> REVIEW -> DEPLOY -> VERIFY -> DOCUMENT. Write down business outcomes, scope, constraints, risks, acceptance tests, and approval needs. Keep changes cohesive and minimize the blast radius. Avoid changing unrelated modules. Prefer straightforward solutions to speculative abstractions.

## Code and presentation

- Match existing JavaScript ESM conventions (`package.json` specifies `type: module`); use descriptive names and small functions with clear responsibility.
- Separate browser presentation, Render gateway behavior, Sites API operations, persistence and storage. Do not place secrets or authorization decisions in the browser.
- Handle asynchronous failures and cancellation explicitly; show actionable non-sensitive errors and preserve usable loading states.
- Validate input and authorization on the server. Client validation is usability, not a trust boundary.
- Reuse existing records, routes, schema and component patterns before adding new ones; avoid duplicate sources of truth.
- Use professional user-facing labels; do not expose raw internal identifiers without business value.
- Preserve accessible form labels, keyboard interaction, focus state, readable errors and responsive layouts.

## Security and data

- Apply least privilege to authenticated operations, including enterprise/organization scopes and downloads.
- Maintain audit events and secure session lifecycle. Never log passwords, cookies, API secrets or employee-sensitive document contents.
- Use parameterized/ORM-backed database access. Validate referential integrity and support concurrency/duplicate submission guards for lifecycle changes.
- Use exact-decimal logic for financial values; never silently convert to imprecise floating-point calculations.
- Validate MIME type, size, ownership and access for evidence attachments. Avoid public exposure of private R2 objects.
- Changes to migrations, transaction boundaries, auth, RBAC, retention or deployment require targeted risk review and approvals where applicable.

## Tests and commits

- Start with the existing `.github/workflows/ci.yml` baseline and root/Sites package scripts.
- For each defect, reproduce first, add a regression test, run relevant positive/negative/boundary/concurrency scenarios, then rerun baseline.
- Keep tests isolated from production data. Report exact failures, do not mark unexecuted checks as passed.
- Commit one related change at a time with descriptive messages, e.g. `docs: establish agent instructions`, `fix(auth): reject untrusted origin`.
- Confirm target branch and concurrent upstream work before writing; never force-push `main`.
- Separate code complete, tests passed, deployed, and production verified. Record evidence in the remediation backlog.

## Definition of done

The requirement and root cause are supported by code/behavior evidence; acceptance criteria are met; relevant automated checks pass; security and data-integrity impact reviewed; documentation updated; change committed; and, when released, the deployment plus non-destructive production checks are evidenced. If any step is missing, state it explicitly.
