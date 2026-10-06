# Smart Barcode Scanner

Browser-based barcode scanning, local inventory, scan history and CSV export.

Source copied from the Smart Barcode Scanner Site. No backend database or installation is required.

## Run locally

Serve `dist/` with a local web server, for example:

```sh
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000` on the same computer. For phone camera access, use an HTTPS host.

## Hosting

Deploy the contents of `dist/` to an HTTPS static host. Browser storage is local to each device and site address; records do not sync between hosts.

## Privacy

Camera frames are decoded locally and are never uploaded. Only decoded values and item details are saved to IndexedDB in the user's browser.

## Third-party software

The bundled ZXing library is Apache-2.0 licensed. See `dist/vendor/LICENSE.zxing`.
