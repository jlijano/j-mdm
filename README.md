# Smart Barcode Scanner

Browser-based barcode scanning, local inventory, scan history and CSV export.

Source copied from the Smart Barcode Scanner Site. No backend database or installation is required.

## Run locally

Use Node.js 24 LTS:

```sh
npm ci
npm start
```

Open `http://localhost:3000` on the same computer. Set `PORT` to change the port.
The server binds to `0.0.0.0`. For phone camera access, use an HTTPS host.
Run `npm test` for HTTP, content-type and file isolation checks.

## Hosting

Deploy the contents of `dist/` to an HTTPS static host. Browser storage is local to each device and site address; records do not sync between hosts.

For Render, `render.yaml` describes the `jlijano-mdm` Free Node.js Web Service
on `main`, using the repository root, `npm ci`, `npm start`, `/health`, and
automatic deploys on commits. Render supplies `PORT` and HTTPS. The Node server
serves only `dist/` and a JSON health endpoint; it accepts no uploads and adds
no database, account system or tracking. SIGTERM drains active requests, with
a ten-second shutdown deadline.

The existing Sites deployment and `.openai/hosting.json` remain unchanged.
Sites records do not automatically transfer to the Render origin. Export CSV
from the original browser to keep a backup; the current app has no import flow.

## Privacy

Camera frames are decoded locally and are never uploaded. Only decoded values and item details are saved to IndexedDB in the user's browser.

## Third-party software

The bundled ZXing library is Apache-2.0 licensed. See `dist/vendor/LICENSE.zxing`.
