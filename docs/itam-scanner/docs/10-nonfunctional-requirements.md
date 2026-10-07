# 10 — Nonfunctional Requirements

## Performance
- Scanner UI should become interactive quickly on modern mobile browsers.
- Scan result should be shown within ~1 second on LAN/good mobile network when backend latency permits.
- Inventory lists should use pagination/virtualization for large data sets.

## Security
- TLS required.
- Short-lived access tokens and secure refresh strategy.
- Server-side authorization for every protected action.
- Input validation and output encoding.
- CSRF protection where cookie-based sessions are used.
- Rate limiting for authentication and sensitive endpoints.
- Avoid logging secrets or raw authentication tokens.

## Privacy
- Camera frames should be processed locally when possible and not uploaded unless explicitly required by a documented feature.
- Explain camera usage before permission request.
- Minimize personal data shown in scan results.

## Reliability
- Offline queue persists through refresh/restart.
- All mutation APIs must be idempotent where retry is possible.
- Scanner must tolerate temporary camera interruptions.

## Observability
Capture application metrics for:
- scan attempts/successes/failures
- API latency/error rates
- sync queue size
- conflict rate
- unknown barcode rate
- inventory session completion rate

## Browser targets
Support current stable versions of major mobile and desktop browsers where camera APIs and required storage capabilities are available. Feature-detect Web APIs rather than relying only on user-agent strings.
