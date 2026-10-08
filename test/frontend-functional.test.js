import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../dist/' + name, import.meta.url), 'utf8');
const html = read('index.html');
const app = read('app.js');
const nav = read('navigation.js');
const itam = read('itam.js');
const css = read('itam.css');

test('navigation supports direct routes, SPA changes, browser history, and module reload events', () => {
  for (const route of [
    'href="/dashboard"',
    'href="/dashboard#records"',
    'href="/assets/scanner"',
    'href="/dashboard#inventory"',
    'href="/dashboard#history"',
    'href="/dashboard#master-data"',
    'href="/dashboard#users"',
    'href="/dashboard#settings"'
  ]) assert.ok(html.includes(route), route);
  assert.ok(app.includes('window.jmdmSetPage=setPage'));
  assert.ok(app.includes("new CustomEvent('jmdm:pagechange'"));
  assert.ok(app.includes("window.addEventListener('popstate'"));
  assert.ok(app.includes("if(location.pathname==='/assets/scanner')return'scanner'"));
  assert.ok(nav.includes('location.assign(target)'));
  assert.ok(itam.includes("document.addEventListener('jmdm:pagechange'"));
  assert.ok(itam.includes("ev.detail?.page==='records'"));
});

test('scanner requires confirmation and keeps gallery and camera photo inputs separate', () => {
  assert.ok(html.includes('id="scan-confirm-dialog"'));
  assert.ok(html.includes('Correct — Save Scan'));
  assert.ok(html.includes('Not Correct'));
  assert.ok(html.includes('id="upload-scan-file" type="file" accept="image/*" hidden'));
  assert.ok(html.includes('id="upload-camera-file" type="file" accept="image/*" capture="environment" hidden'));
  assert.ok(app.includes("$('#upload-gallery-button').onclick=()=>$('#upload-scan-file').click()"));
  assert.ok(app.includes("$('#upload-camera-button').onclick=()=>$('#upload-camera-file').click()"));
  assert.ok(app.includes("pendingScan={barcode:value"));
  assert.ok(app.includes("await mutate('scans','put',scan)"));
  assert.ok(app.indexOf("pendingScan={barcode:value") < app.indexOf("await mutate('scans','put',scan)"));
  assert.ok(app.includes("Detection discarded. Nothing was saved."));
});

test('uploaded-label analysis supports crop, rotation, OCR orientations, service tags, and mismatch warning', () => {
  for (const id of ['crop-rotate-left','crop-rotate-right','crop-reset','crop-analyze','crop-selection']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.ok(app.includes('rotateCrop(-90)'));
  assert.ok(app.includes('rotateCrop(90)'));
  assert.ok(app.includes("for(const rotation of (fromCrop?[0]:[0,90,270,180]))"));
  assert.ok(app.includes('Tesseract.recognize'));
  assert.ok(app.includes("tag\\s*\\/\\s*sn"));
  assert.ok(app.includes('Barcode/text mismatch'));
  assert.ok(app.includes("topText?'Image OCR / Label Text'"));
});

test('asset forms expose empty lookup state, dependent filters, validation, saving state, and backend errors', () => {
  assert.ok(itam.includes("No options configured"));
  assert.ok(itam.includes("allTypes.filter(r=>String(r.category_id)===String(category.value))"));
  assert.ok(itam.includes("String(r.manufacturer_id)===String(manufacturer.value)"));
  assert.ok(itam.includes("String(r.asset_type_id)===String(type.value)"));
  assert.ok(itam.includes('validateCloudForm()'));
  assert.ok(itam.includes("button.textContent='Saving…'"));
  assert.ok(itam.includes("error.textContent=err.message||'The record could not be saved.'"));
});

test('mobile navigation and form contrast hardening remain present', () => {
  assert.ok(css.includes('@media(max-width:650px)'));
  assert.ok(css.includes('#mobile-nav .mobile-nav-link'));
  assert.ok(css.includes('#main-nav .nav-link.active'));
  assert.ok(css.includes('background:#FFFFFF !important'));
  assert.ok(css.includes('color:#0F172A !important'));
  assert.ok(css.includes('.crop-handle'));
  assert.ok(css.includes('width:24px'));
});

test('master data cards route to every required reference module', () => {
  for (const table of [
    'manufacturers','asset_categories','asset_types','asset_classes',
    'asset_conditions','units_of_measure','locations','asset_models'
  ]) assert.ok(html.includes('data-master-table="' + table + '"'), table);
  assert.ok(itam.includes('window.jmdmOpenModule=async table=>'));
});
