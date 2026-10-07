# 01 — Product Overview

## 1. Purpose
The ITAM Scanner enables authorized users to scan asset identifiers from phones, tablets, and desktop browsers, retrieve authoritative asset records, perform permitted asset actions, and record all changes in a centralized ITAM database.

## 2. Primary goals
1. Make inventory verification fast on mobile devices.
2. Minimize manual asset entry and duplicate records.
3. Detect location, custodian, lifecycle, and status mismatches at scan time.
4. Support offline scanning with safe later synchronization.
5. Enforce role-based permissions and data scope.
6. Create immutable audit trails for every significant action.
7. Work as a browser-based responsive web app/PWA.

## 3. Supported scan modes
- Asset Lookup
- Inventory Audit
- Receive Asset
- Register Asset
- Assign Asset
- Return Asset
- Transfer Asset
- Check In
- Check Out
- Update Asset
- Move Location
- Verify Custodian
- Maintenance Check
- Retirement
- Disposal

## 4. Supported identifiers
- Internal barcode / asset tag
- QR code
- Data Matrix
- Serial number
- SKU
- Service tag
- IMEI where applicable

## 5. Key terms
**Observed location**: location selected or detected for the current scan/session.

**Expected location**: authoritative asset location from the ITAM database.

**Inventory session**: a time-bounded scanning event against a defined scope such as a site, department, room, or asset list.

**Exception**: any condition requiring attention, such as unknown barcode, location mismatch, duplicate scan, lifecycle conflict, missing assignee, or permission restriction.

## 6. System boundaries
The browser app may use local storage or IndexedDB for temporary caching and offline queues, but the authoritative system of record is the centralized ITAM backend/database.

## 7. Mobile-first layout principle
The mobile scanner prioritizes:
1. current mode and location,
2. scanner/camera,
3. last scan result,
4. session progress,
5. exceptions,
6. action buttons.
