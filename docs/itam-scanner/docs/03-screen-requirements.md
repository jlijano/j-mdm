# 03 — Screen-by-Screen Requirements

## Screen 1 — Login
**Purpose:** secure authentication.

**Required elements**
- Organization/product logo
- Email/username
- Password
- Sign in
- Forgot password
- Optional SSO button(s)
- Security/privacy footer

**Behavior**
- Rate-limit failed attempts.
- Respect account lockout and forced password reset.
- Do not reveal whether an account exists.

**Mobile requirements**
- Full-width fields.
- Minimum 44×44 px touch targets.
- Correct keyboard type for email.

---

## Screen 2 — Mobile Dashboard
**Primary cards**
- Scan Asset
- Active Inventory Session
- Pending Sync
- Exceptions
- Recent Activity

**Metrics**
- Scans today
- Verified today
- Exceptions
- Pending sync

**Rules**
- Hide cards the user cannot access.
- Show offline state prominently.

---

## Screen 3 — Scanner Setup
**Fields**
- Scan Mode
- Current Scan Location
- Inventory Session (conditional)

**Actions**
- Start Scanner
- Enter Barcode Manually

**Validation**
- Location may be mandatory for audit, transfer, receive, and disposal workflows.
- Session is mandatory when Scan Mode = Inventory Audit.

---

## Screen 4 — Live Scanner
**Layout order on phone**
1. Compact header with mode, location, connectivity
2. Camera viewport
3. Scan guidance overlay
4. Flash/torch toggle if supported
5. Camera selector if multiple cameras exist
6. Manual entry shortcut
7. Last-scan result drawer
8. Session progress bar when applicable

**Camera states**
- Off
- Requesting permission
- Live
- Paused
- Permission denied
- No camera detected
- Browser unsupported

**Visual behavior**
- Barcode target frame centered.
- Avoid excessive motion/animation during scanning.
- Haptic feedback when supported and enabled.
- Optional sound feedback with mute control.

---

## Screen 5 — Scan Result / Asset Summary
**Header**
- Match status: Matched / Unknown / Exception
- Asset tag
- Device name/model

**Details**
- Serial number
- Category
- Manufacturer/model
- Assignee
- Department/team
- Status
- Condition
- Expected location
- Observed location
- Warranty date
- Last verified date

**Actions**
- Verify
- Update
- Assign / Return
- Move
- View Full Asset
- Add Note

Only authorized actions are rendered.

---

## Screen 6 — Exception Review
**Exception types**
- Unknown barcode
- Location mismatch
- Custodian mismatch
- Duplicate scan
- Asset already retired/disposed
- Asset outside user scope
- Pending conflicting offline update

**Actions**
- Resolve now
- Add note
- Escalate
- Skip and continue

All resolutions require reason codes where policy requires it.

---

## Screen 7 — Inventory Session
**Header**
- Session name
- Scope
- Status
- Started by / start time

**Progress**
- Expected
- Scanned
- Verified
- Exceptions
- Remaining
- Percentage complete

**Lists**
- Recently scanned
- Exceptions
- Remaining assets

**Actions**
- Resume Scan
- Pause Session
- Complete Session
- Export Summary (permission-controlled)

---

## Screen 8 — Manual Entry
**Search by**
- Barcode
- Asset tag
- Serial number
- SKU
- Service tag
- IMEI

**Behavior**
- Exact match first, then normalized match.
- Never create an asset automatically from an unverified identifier.

---

## Screen 9 — Offline Queue
**Fields per queued item**
- Operation type
- Asset identifier
- Created time
- Status
- Retry count
- Last error

**Actions**
- Retry all
- Retry item
- View conflict
- Discard local change (restricted)

---

## Screen 10 — Asset Detail
Tabbed sections:
- Overview
- Assignment
- Location
- Lifecycle
- Financial
- Maintenance
- History
- Audit

Tabs must be filtered by permissions and data sensitivity.
