# 07 — Offline Sync Behavior

## 1. Goals
- Continue high-volume scanning when connectivity is poor.
- Prevent lost scans.
- Prevent duplicate server-side mutations during retry.
- Surface conflicts explicitly.

## 2. Local storage
Recommended browser storage: IndexedDB.

Store only data required for offline operation:
- cached user/session authorization snapshot
- minimal asset lookup index for assigned scope
- active inventory session metadata
- queued operations
- sync state

Avoid storing unnecessary sensitive financial or personal data locally.

## 3. Operation lifecycle
`LOCAL_PENDING → SYNCING → APPLIED`

Alternative outcomes:
- CONFLICT
- REJECTED
- RETRY_WAIT
- DISCARDED_BY_AUTHORIZED_USER

## 4. Ordering
Operations for the same asset must be sent in local creation order. The server may process unrelated assets in parallel.

## 5. Idempotency
Every mutation receives a stable `clientOperationId`. Retries use the same value. The server stores processed IDs long enough to prevent duplicate effects.

## 6. Conflict rules
Examples:
- asset moved on server after local cache was created,
- asset assigned to a different person while offline,
- asset retired while a local verification remained pending.

Default policy: do not silently overwrite conflicting server state.

## 7. Retry policy
- exponential backoff with jitter
- immediate retry for network reconnect once
- cap retry frequency
- show user-visible failure after threshold
- preserve queue across app restart

## 8. Offline limitations
The app should clearly mark actions unavailable offline when they require fresh server validation, such as:
- role/permission administration
- irreversible disposal approval
- sensitive financial changes
- operations against assets not present in cache

## 9. Sync UI
Show:
- online/offline state
- number pending
- last successful sync
- conflicts needing review
- retry button
