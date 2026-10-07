# 11 — Acceptance Criteria and QA Checklist

## Scanner
- [ ] Rear camera is preferred on supported phones.
- [ ] Camera permission states are handled cleanly.
- [ ] Manual entry works without camera permission.
- [ ] Supported barcode types are documented and tested.
- [ ] Duplicate scan debounce works.
- [ ] Unknown codes generate a clear exception.

## Asset resolution
- [ ] Asset tag/barcode resolves to the correct asset.
- [ ] Result screen displays expected and observed location.
- [ ] Unauthorized actions are not available.
- [ ] Server rejects unauthorized direct API requests.

## Inventory session
- [ ] Expected assets load for selected scope.
- [ ] Progress counts update correctly.
- [ ] Duplicate scans do not inflate verified totals.
- [ ] Missing/exception assets remain visible.
- [ ] Session can pause/resume.
- [ ] Completion produces an auditable event.

## Offline
- [ ] Scans can be queued offline.
- [ ] Queue survives refresh/restart.
- [ ] Reconnect triggers safe synchronization.
- [ ] Duplicate retries do not duplicate mutations.
- [ ] Conflicts are surfaced to user.

## Audit
- [ ] Every asset mutation has actor, time, old/new state, and correlation ID.
- [ ] Role/permission changes are audited.
- [ ] Exports are audited.

## Accessibility
- [ ] Core workflow works with screen reader labels.
- [ ] Keyboard focus is visible.
- [ ] Touch targets meet minimum size guidance.
- [ ] Contrast passes AA targets.
- [ ] Reduced-motion preference is honored.
