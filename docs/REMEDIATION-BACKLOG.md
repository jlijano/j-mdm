# J-MDM Remediation Backlog

Updated: 2026-10-09. Initial inventory and verification queue, **not** a list of 38 confirmed defects. A status of Pending means no verified fix or production result is recorded here.

## Confirmed documentation findings

| ID | Finding | Evidence | Severity | Status | Acceptance |
| --- | --- | --- | --- | --- | --- |
| AUD-001 | README still frames product as Smart Barcode Scanner | `README.md` heading; `docs/ITAM-implementation.md` describes shared ITAM | Medium (documentation) | Pending | Rewrite README to accurately explain Render, Sites, D1/R2, shared vs local records, tests and limitations |
| AUD-002 | Missing root AI agent guidance at initial inspection | `AGENTS.md` returned not found before governance update | Low | Fixed — Not Deployed | Instructions exist and reference canonical docs |
| AUD-003 | No remediation register at initial inspection | `docs/REMEDIATION-BACKLOG.md` returned not found before this update | Low | Fixed — Not Deployed | Traceable backlog exists |
| AUD-004 | `/health` returns static `{status:'ok'}`, not upstream/database readiness | `server.js` health handler | Medium (observability) | Pending | Distinguish liveness from readiness; preserve safe response |
| AUD-005 | Hosting config automatically deploys commits to `main` | `render.yaml` `autoDeployTrigger: commit` | Needs risk review | Pending | Agree safeguards and rollback approach before changing release policy |

## Security and integrity audit — 2026-10-09 (source review only)

This audit inspected the current `main` source without modifying runtime code or executing production tests. Severity ratings are preliminary. **A confirmed code-level weakness is not evidence of successful exploitation.** Every entry remains Pending until targeted regression tests and release verification are recorded. No implementation commits, test passes, or deployment claims are recorded for these findings.

| Finding | Related task | Severity | Classification | Evidence | Business impact | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | FIX-003 | High | Confirmed code-level trust-boundary weakness | [`auth.js`](../auth.js), [`remote-auth.js`](../remote-auth.js): login rate-limit client IP uses `x-forwarded-for` without an explicit trusted-hop policy; remote forwarding also passes derived IP upstream | Spoofed/misattributed client addresses may weaken throttling and audit attribution, depending on deployed proxy behavior | Pending |
| DATA-001 | FIX-006 | High | Confirmed partial-failure consistency risk | [`sites-service/worker/asset360.js`](../sites-service/worker/asset360.js): `upload()` inserts `files` metadata before a separate `db.batch` for `asset_files`; the catch deletes the R2 object without explicitly removing the preceding metadata row | Orphaned file metadata and failed evidence retrieval after link failure | Pending |
| SEC-002 | FIX-006 | Medium | Confirmed validation gap | [`sites-service/worker/asset360.js`](../sites-service/worker/asset360.js) `upload()`; [`sites-service/worker/index.js`](../sites-service/worker/index.js) legacy `/api/files` | Signature checks accept recognized image magic bytes without matching each precise declared subtype; differing 10 MB/5 MB route limits can cause inconsistent handling | Pending |
| DATA-002 | FIX-005 | Medium | Confirmed concurrency-control gap | [`sites-service/worker/asset360.js`](../sites-service/worker/asset360.js): condition/barcode mutations increment revision without an old-revision predicate; compare [`sites-service/worker/api.js`](../sites-service/worker/api.js) `lifecycle()` | Concurrent Asset 360 updates may overwrite state or accept stale changes | Pending |
| SEC-003 | FIX-002 | Medium | Needs verification | [`sites-service/worker/data.js`](../sites-service/worker/data.js) `access()`, `allowed()`, `scopeSQL()`, `visibleAsset()`; [`sites-service/worker/index.js`](../sites-service/worker/index.js) API dispatch | Cross-scope visibility and related-record permissions have not been exhaustively tested; **not** an established authorization bypass | Pending |

### SEC-001 — Trusted forwarded IP attribution (FIX-003)

- **Evidence / affected files:** `auth.js` login handler; `remote-auth.js` `remote()` and login throttling. Both use a request forwarding header or socket address without an explicit, deployment-confirmed proxy trust policy.
- **Root cause:** Forwarded-client-IP provenance is not validated within the inspected application code. Whether a deployment edge normalizes the header must also be determined.
- **Dependencies:** Confirm Render edge/header semantics, any intermediate proxies, and Sites attribution behavior before implementing.
- **Proposed correction:** Centralize client-IP resolution using a configured trusted-hop model; use it consistently in throttle keys and forwarded attribution; reject/ignore untrusted values without breaking legitimate proxy traffic.
- **Acceptance criteria:** Untrusted client-supplied header values cannot select an arbitrary throttle identity; valid edge-forwarded traffic gets expected attribution; legitimate sign-in continues to function; secrets and identities remain protected in logs.
- **Required tests:** Forged single/multiple `X-Forwarded-For` values; direct requests; expected trusted proxy chain; repeated failed logins across differing forged headers; correct remote-proxy propagation; IPv4/IPv6 normalization; login success and throttling regression.
- **Executed tests:** None in this audit. **Commit:** None. **Deployment:** Not attempted. **Production verification:** Not performed. **Status:** Pending.

### DATA-001 — Evidence metadata / R2 atomicity gap (FIX-006)

- **Evidence / affected files:** `sites-service/worker/asset360.js`, `upload()`; R2 `BUCKET.put` occurs before `files` insert, then an independent `asset_files` batch. Exception handling removes the R2 object, but does not explicitly compensate the completed `files` insert.
- **Root cause:** Database metadata insertion and evidence association span separate transaction boundaries and the object store cannot participate in a D1 transaction.
- **Proposed correction:** Keep D1 inserts/link/audit in one atomic batch where possible, or use an explicit pending/finalized object state and reliable cleanup/reconciliation. Do not delete shared objects referenced elsewhere.
- **Acceptance criteria:** Successful uploads always have accessible authorized object plus correctly linked metadata; failed uploads leave neither active orphaned metadata nor uncontrolled objects; retrying does not duplicate evidence or audit success; failure is surfaced safely.
- **Required tests:** Inject failure before object write, after object write, during metadata creation, during asset association/audit, and during cleanup; retry, duplicate, nonexistent/out-of-scope asset, and object-read checks; verify referential integrity with isolated QA data.
- **Executed tests:** None. **Commit:** None. **Deployment:** Not attempted. **Production verification:** Not performed. **Status:** Pending.

### SEC-002 — Evidence type validation and policy consistency (FIX-006)

- **Evidence / affected files:** `sites-service/worker/asset360.js` `upload()` accepts image signatures from a combined set after `mime_type.startsWith('image/')`; legacy `/api/files` upload is in `sites-service/worker/index.js`.
- **Root cause:** Declared MIME subtype is not strictly matched to detected media type; route-specific maximum sizes differ.
- **Proposed correction:** Create a single evidence format policy with exact subtype/signature mapping and explicit restrictions for other accepted document types. Reconcile size limits intentionally, preserving compatibility with existing records.
- **Acceptance criteria:** Permitted genuine files work; mismatched signatures, forged MIME labels, oversized files and disallowed types are rejected; authorized downloads remain attachment-only; existing valid evidence remains accessible.
- **Required tests:** JPEG/PNG/WebP/etc. legitimate and mismatch fixtures, arbitrary executable bytes labeled as images/documents, malformed base64, empty/oversized payloads, and upload/download RBAC regression; verify both upload routes.
- **Executed tests:** None. **Commit:** None. **Deployment:** Not attempted. **Production verification:** Not performed. **Status:** Pending.

### DATA-002 — Asset 360 optimistic concurrency (FIX-005)

- **Evidence / affected files:** `sites-service/worker/asset360.js` condition and barcode operations update `assets.revision` without `WHERE revision=?`; main lifecycle implementation in `sites-service/worker/api.js` has a revision predicate and transactional guard.
- **Root cause:** Revision checks are applied inconsistently across write surfaces.
- **Proposed correction:** Reuse existing optimistic concurrency conventions and fail an entire unit of work if the expected revision no longer matches; preserve unique barcode and audit guarantees.
- **Acceptance criteria:** Exactly one of two stale competing writes can commit when the same revision is used; losing write returns a clear conflict without modifying condition history, barcode history, or audit/state unexpectedly; normal actions continue.
- **Required tests:** Concurrent condition-versus-condition, barcode-versus-barcode, Asset 360 versus lifecycle update, stale submission, duplicate barcode, and injected D1 batch failure with rollback checks.
- **Executed tests:** None. **Commit:** None. **Deployment:** Not attempted. **Production verification:** Not performed. **Status:** Pending.

### SEC-003 — RBAC and related-record negative coverage (FIX-002)

- **Evidence / affected files:** `sites-service/worker/data.js` implements effective role membership, permission overrides, `scopeSQL()`, and `visibleAsset()`. `sites-service/worker/index.js` and specialized routes dispatch protected operations.
- **Classification:** Verification gap; no bypass was demonstrated.
- **Proposed verification:** Inventory every API route, method, and underlying related-record join; compare required module permission, write privilege, enterprise/organization scope, and downstream file ownership checks.
- **Acceptance criteria:** Every protected route rejects unauthenticated, underprivileged, expired, denied-override and out-of-scope requests without leaking protected data; same-scope authorized requests succeed; audit requirements are preserved.
- **Required tests:** Positive/negative role matrix including Super Admin, ITAM, Finance, Security, department/site/team/self scopes, expired roles, override DENY/ALLOW, direct numeric-ID enumeration, CSV export, lookups, Asset 360 sections, evidence and employee photos.
- **Executed tests:** None. **Commit:** None. **Deployment:** Not attempted. **Production verification:** Not performed. **Status:** Pending.

### Controls observed, not production-verified

Sites authentication uses database session checks and MFA-required state; `data.js` applies server-side permissions and scopes; `api.js` uses D1 batches and revision guards for lifecycle changes; file-download logic verifies module permission and asset visibility. These are source observations, **not** evidence of passing tests or completed QA. See [engineering standards](CODING-STANDARDS.md).

## Verification queue

For each task, record source/line evidence, affected files, expected business outcome, reproducible steps, root cause if established, dependencies, test results, commit SHA, deployment and production verification. Do not implement already-working functionality merely because it appears below.

| ID | Priority | Task | Initial assessment | Status |
| --- | --- | --- | --- | --- |
| FIX-001 | P1 | Authentication and sessions | Database-backed session and MFA paths observed; run logout/expiry/revocation and remote/local regression tests | Pending |
| FIX-002 | P1 | Server-side RBAC/scopes | SEC-003: verify cross-scope related-record routes and negative RBAC cases | Pending |
| FIX-003 | P1 | Trusted proxy/IP handling | SEC-001 High: forwarded-IP provenance weakness in auth and remote gateway | Pending |
| FIX-004 | P1 | CSRF and gateway validation | Verify allowed origin/host behavior | Pending |
| FIX-005 | P1 | Transaction integrity | DATA-002 Medium: Asset 360 revision guards inconsistent; verify lifecycle atomicity | Pending |
| FIX-006 | P1 | Evidence file security | DATA-001 High metadata/R2 consistency; SEC-002 Medium MIME and upload-policy validation | Pending |
| FIX-007 | P1 | Dependency vulnerabilities | Audit root and Sites lockfiles | Pending |
| FIX-008 | P1 | Backup/disaster recovery | Confirm actual recovery evidence | Pending |
| FIX-009 | P2 | Master data load/persistence | Reproduce seed/load issues | Pending |
| FIX-010 | P2 | API failed fetch | Inspect gateway/upstream failure chain | Pending |
| FIX-011 | P2 | Server pagination | Documented browse cap of 500; assess | Pending |
| FIX-012 | P2 | Caching and invalidation | Verify mutation refresh behavior | Pending |
| FIX-013 | P2 | Performance | Measure critical flows first | Pending |
| FIX-014 | P2 | UI terminology | Audit labels/navigation | Pending |
| FIX-015 | P2 | Manufacturer logos | Verify authorized assets and fallback | Pending |
| FIX-016 | P2 | Responsive/accessibility | Test viewport and assistive access | Pending |
| FIX-017 | P3 | Asset 360 images | Verify count, chronology, permissions | Pending |
| FIX-018 | P3 | Employee photographs | Review privacy/access first | Pending |
| FIX-019 | P3 | Procurement evidence | Verify PO, receipt, invoice linkage | Pending |
| FIX-020 | P3 | Barcode/serial history | Verify stable identity and change log | Pending |
| FIX-021 | P3 | Chain of custody | Verify lifecycle audit continuity | Pending |
| FIX-022 | P3 | Inventory reconciliation | Missing reconciliation workflow documented | Pending |
| FIX-023 | P3 | Damage reporting | Gap documented; assess design | Pending |
| FIX-024 | P3 | Warranty alerts | Records exist; scheduled alert gap documented | Pending |
| FIX-025 | P3 | Repair lifecycle | Verify existing transitions | Pending |
| FIX-026 | P3 | Refresh lifecycle | Replacement workflow limitation documented | Pending |
| FIX-027 | P3 | Disposal governance | Existing controls documented; test | Pending |
| FIX-028 | P3 | Depreciation/finance | Straight-line documented; validate math | Pending |
| FIX-029 | P3 | Role reports | Specialized dashboards documented as gap | Pending |
| FIX-030 | P3 | Notifications/scheduled jobs | Scheduler limitation documented | Pending |
| FIX-031 | P4 | Browser E2E | Assess existing test coverage | Pending |
| FIX-032 | P4 | Visual regression | Baselines not verified | Pending |
| FIX-033 | P4 | Coverage reporting | Baseline not measured | Pending |
| FIX-034 | P4 | CI quality gates | Existing syntax/root/Sites jobs confirmed | Pending |
| FIX-035 | P4 | Release approval/rollback | Review auto deploy risks | Pending |
| FIX-036 | P4 | Health/observability | Static liveness response confirmed | Pending |
| FIX-037 | P4 | Error monitoring | Inspect instrumentation | Pending |
| FIX-038 | P4 | Retention/data lifecycle | Policy and safety review needed | Pending |

## Task record template

### FIX-XXX — Title
- Evidence (file:line and/or reproducible behavior):
- Classification (confirmed defect / documented limitation / proposed improvement / needs verification):
- Severity and business impact:
- Affected components:
- Root cause (if confirmed):
- Dependencies and approval:
- Smallest safe correction:
- Acceptance criteria:
- Tests executed and exact result:
- Security and data impact:
- Commit SHA:
- Deployment status:
- Production verification evidence:
- Remaining risks:
- Status: Pending

## Verification rules

Statuses: Pending; In Progress; Blocked; Fixed — Not Deployed; Deployed — Not Verified; Verified; Not Applicable. A GitHub documentation commit is **not** evidence of a Render/Sites deployment or production validation. Production tests must be non-destructive unless approved.
