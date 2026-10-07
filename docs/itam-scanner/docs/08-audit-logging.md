# 08 — Audit Logging

## 1. Audit principles
Audit records must be tamper-resistant, append-only from application users, timestamped, attributable, and queryable by authorized roles.

## 2. Events to log
- login success/failure
- account lock/unlock
- user creation/deactivation
- role and permission changes
- scanner start/stop
- scan resolution
- unknown identifier
- duplicate scan
- inventory session create/pause/resume/complete
- asset create/update
- assignment/return
- location move
- status/condition change
- maintenance update
- retirement/disposal
- financial-field change
- export generation
- offline conflict resolution
- deletion attempt or administrative purge

## 3. Minimum audit fields
- event_id
- event_type
- timestamp_utc
- actor_user_id
- effective_role(s)
- scope context
- subject_type
- subject_id
- action
- outcome
- before_json (when relevant)
- after_json (when relevant)
- reason_code / comment
- source_channel = WEB/MOBILE/PWA/API
- client_operation_id if applicable
- correlation_id
- device/session metadata

## 4. Scan audit example
```json
{
  "eventType": "ASSET_SCAN_VERIFIED",
  "actorUserId": "uuid",
  "subjectType": "ASSET",
  "subjectId": "uuid",
  "action": "VERIFY",
  "outcome": "SUCCESS",
  "metadata": {
    "mode": "INVENTORY_AUDIT",
    "sessionId": "uuid",
    "observedLocationId": "uuid",
    "duplicate": false
  }
}
```

## 5. Retention
Retention must follow organizational policy and legal/regulatory requirements. A typical design separates operational scan history from longer-lived security/audit logs so each can have appropriate retention and access controls.
