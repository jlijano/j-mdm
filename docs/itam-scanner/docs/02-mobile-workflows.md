# 02 — Mobile Workflow Specifications

## 1. Application launch
1. User opens the web app/PWA.
2. App checks authentication token and session validity.
3. App loads user role, effective permissions, and data scope.
4. App checks network state.
5. App loads cached configuration required for offline use.
6. App routes user to Dashboard or directly to Scanner based on last valid state.

## 2. Start scanner workflow
1. User opens **Scanner**.
2. User selects **Scan Mode**.
3. User selects or confirms **Current Scan Location**.
4. If using Inventory Audit, user selects or creates an **Inventory Session**.
5. User taps **Start Scanner**.
6. Browser requests camera permission if not already granted.
7. App prefers rear-facing camera on mobile.
8. Scanner reads a supported code and applies duplicate debounce.
9. App resolves the code against the local cache and/or backend.
10. App presents the scan result with required actions and exceptions.

## 3. Asset lookup workflow
### Success
- Scan identifier.
- Retrieve asset.
- Display asset summary: asset tag, device model, serial, assignee, department, status, expected location, observed location, condition, warranty.
- Show only actions the user is authorized to perform.

### Unknown identifier
- Show **Asset not found**.
- Allow authorized roles to Register Asset.
- Allow manual retry, rescan, or cancel.
- Audit the unknown-code event.

## 4. Inventory audit workflow
1. Create/select session.
2. Define scope: site/building/floor/room/department/team/custom list.
3. Load expected assets for scope.
4. Start scan.
5. For each scan:
   - mark matched asset as observed,
   - record timestamp and operator,
   - compare expected vs observed location,
   - compare expected vs current custodian if available,
   - detect duplicate scans,
   - raise exceptions.
6. Session dashboard updates counts:
   - expected,
   - scanned,
   - verified,
   - exceptions,
   - remaining.
7. User may Pause or Complete Session.
8. Completion requires unresolved exception review when policy requires it.

## 5. Assign asset workflow
1. Scan asset.
2. Search/select assignee.
3. Confirm department/team/location.
4. Capture optional condition note/photo reference.
5. Submit assignment.
6. Backend validates role, scope, asset state, and current custody.
7. Successful update creates asset-history and audit records.

## 6. Return asset workflow
1. Scan asset.
2. Show current assignee and assigned location.
3. Select return location.
4. Capture condition and optional notes.
5. Confirm return.
6. Clear or update custody according to policy.
7. Record audit event.

## 7. Transfer / move location workflow
1. Scan asset.
2. Show expected location.
3. Select destination location.
4. Validate user scope and destination availability.
5. Confirm move.
6. Update current location and asset history.
7. Record prior and new values in audit log.

## 8. Offline workflow
1. Network state changes to offline.
2. App shows persistent **Offline** indicator.
3. Allowed scans continue using cached asset index and configuration.
4. Mutations are written to an encrypted/local queue with unique client operation IDs.
5. Each queued item displays Pending Sync state.
6. When connectivity returns, app syncs in order.
7. Server deduplicates using idempotency key.
8. Conflicts are surfaced for resolution rather than silently overwritten.

## 9. Camera permission failure
- Explain why access is needed.
- Show browser-specific permission recovery guidance.
- Provide **Enter Barcode Manually** as fallback.
- Never block lookup entirely when manual entry is available.

## 10. Duplicate scan handling
The scanner should ignore repeated reads of the same code for a configurable debounce interval (recommended 2–5 seconds). In an inventory session, scanning the same asset again must not inflate the verified count; instead it should update the last-observed timestamp and mark the event as a duplicate scan in history.
