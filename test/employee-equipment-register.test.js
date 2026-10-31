import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = path => readFile(new URL('../dist/'+path,import.meta.url),'utf8');
test('employee equipment register appears inside the existing authenticated workspace', async () => {
 const [html,app,labels,shell]=await Promise.all(['index.html','itam.js','ui-presentation.js','workspace-shell.js'].map(file));
 assert.match(html,/id="equipment-register-nav"/);
 assert.match(html,/data-equipment-register/);
 assert.match(app,/employee_equipment_register:\['record_date','site','line_number','account','employee_number','employee_name','cpu_serial','monitor_1_serial','monitor_2_serial','headset_serial'\]/);
 assert.match(app,/table==='employee_equipment_register'\?10:8/);
 assert.match(app,/jmdmOpenModule\('employee_equipment_register'\)/);
 assert.match(app,/window\.mdmCreateAssetFromScan=async barcode=>\{currentTable='assets';q\('#module-select'\)\.value='assets';await recordForm\(null,\{barcode,asset_tag:barcode\}\);\}/);
 assert.match(app,/const requestedModule=new URLSearchParams\(location\.search\)\.get\('module'\);currentTable=requestedModule==='employee_equipment_register'/);
 for(const label of ["Date","Site","Account","Employee ID","Name","CPU Serial","Monitor 1 Serial","Monitor 2 Serial","Headset SN"])assert.ok(labels.includes(label));
 assert.match(shell,/enterpriseOnly/);
 assert.match(shell,/employee_equipment_register/);
});
