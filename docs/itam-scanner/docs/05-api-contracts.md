# 05 — API Contracts

## 1. API conventions
- Base path: `/api/v1`
- JSON request/response bodies
- OAuth2/OIDC bearer authentication recommended
- UTC timestamps in ISO 8601
- UUID identifiers
- Consistent correlation ID per request
- Idempotency key required for offline/retriable mutations

## 2. Standard response envelope
```json
{
  "data": {},
  "meta": {
    "correlationId": "uuid",
    "timestamp": "2026-10-07T00:00:00Z"
  }
}
```

## 3. Standard error
```json
{
  "error": {
    "code": "ASSET_NOT_FOUND",
    "message": "No asset matched the supplied identifier.",
    "details": {},
    "correlationId": "uuid"
  }
}
```

## 4. Core endpoints

### Resolve scan
`POST /scanner/resolve`

Request:
```json
{
  "code": "A-000123",
  "codeType": "BARCODE",
  "mode": "INVENTORY_AUDIT",
  "locationId": "uuid",
  "sessionId": "uuid",
  "capturedAt": "2026-10-07T00:00:00Z",
  "clientOperationId": "uuid"
}
```

Response includes matched asset, available actions, warnings, exceptions, and effective permissions.

### Create inventory session
`POST /inventory-sessions`

### Read session
`GET /inventory-sessions/{id}`

### Complete session
`POST /inventory-sessions/{id}/complete`

### Register scan event
`POST /scan-events`

### Search assets
`GET /assets?identifier=...`

### Read asset
`GET /assets/{id}`

### Update asset
`PATCH /assets/{id}`

Headers:
- `If-Match: <version-or-etag>` when concurrency enforcement is enabled.
- `Idempotency-Key: <uuid>` for retriable mutation requests.

### Assign asset
`POST /assets/{id}/assign`

### Return asset
`POST /assets/{id}/return`

### Move asset
`POST /assets/{id}/move`

### Verify asset
`POST /assets/{id}/verify`

### Sync offline batch
`POST /sync/operations`

## 5. Offline batch request
```json
{
  "deviceSessionId": "uuid",
  "operations": [
    {
      "clientOperationId": "uuid",
      "operationType": "VERIFY_ASSET",
      "entityId": "uuid",
      "baseVersion": 17,
      "createdAt": "2026-10-07T00:00:00Z",
      "payload": {
        "locationId": "uuid"
      }
    }
  ]
}
```

## 6. Offline batch response
Each operation must return one of:
- APPLIED
- DUPLICATE_ALREADY_APPLIED
- CONFLICT
- REJECTED_PERMISSION
- REJECTED_VALIDATION
- RETRYABLE_ERROR

## 7. Conflict response example
```json
{
  "clientOperationId": "uuid",
  "status": "CONFLICT",
  "serverVersion": 18,
  "serverState": {},
  "conflictingFields": ["locationId"],
  "resolutionPolicy": "MANUAL_REVIEW"
}
```

## 8. Authorization rule
The API is authoritative for permission checks. The client may hide unauthorized controls for usability, but server-side authorization is mandatory for every protected endpoint.
