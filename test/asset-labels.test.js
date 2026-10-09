import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../dist/itam.js',import.meta.url),'utf8');
const generator=readFileSync(new URL('../dist/asset-labels.js',import.meta.url),'utf8');
test('asset label generator is wired to existing Asset 360 details',()=>{
 assert.match(ui,/data-asset-label=/);
 assert.match(ui,/a\.barcode\|\|a\.asset_tag/);
 assert.match(html,/id="asset-label-dialog"/);
 assert.match(html,/asset-labels\.js/);
 assert.match(html,/JsBarcode\.code128\.min\.js/);
 assert.match(html,/qrcode\.min\.js/);
});
test('asset label generator supports both formats, printing and PNG without mutating asset records',()=>{
 assert.match(generator,/CODE128/);
 assert.match(generator,/new QRCode\(/);
 assert.match(generator,/toDataURL\('image\/png'\)/);
 assert.match(generator,/\.print\(\)/);
 assert.doesNotMatch(generator,/\/api\/records|\/api\/assets|method:\s*'POST'/);
});
