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

## Verification queue

For each task, record source/line evidence, affected files, expected business outcome, reproducible steps, root cause if established, dependencies, test results, commit SHA, deployment and production verification. Do not implement already-working functionality merely because it appears below.

| ID | Priority | Task | Initial assessment | Status |
| --- | --- | --- | --- | --- |
| FIX-001 | P1 | Authentication and sessions | Verify remote and local pathways | Pending |
| FIX-002 | P1 | Server-side RBAC/scopes | Verify actual enforcement | Pending |
| FIX-003 | P1 | Trusted proxy/IP handling | Review header trust in auth/rate limits | Pending |
| FIX-004 | P1 | CSRF and gateway validation | Verify allowed origin/host behavior | Pending |
| FIX-005 | P1 | Transaction integrity | Existing atomic D1 batches documented; test | Pending |
| FIX-006 | P1 | Evidence file security | Verify R2 access and upload controls | Pending |
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
