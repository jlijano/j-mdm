import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import metadata from '../db/metadata.json' with { type: 'json' };
import { clean, recordAPI } from '../worker/api.js';
import { moduleFor } from '../worker/data.js';

const sample = {
  record_date: null,
  site: 'TEST SITE T2',
  line_number: 1,
  account: 'SAMPLE ACCOUNT',
  employee_number: 'EMP000123',
  employee_name: 'Sample, Employee',
  cpu_serial: 'CPU-TEST-001',
  monitor_1_serial: 'MON-TEST-001',
  monitor_2_serial: 'MON-TEST-002',
  headset_serial: 'HS-TEST-001'
};

test('register metadata exposes all requested columns and uses custody authorization', () => {
  const names=metadata.employee_equipment_register.map(c=>c.name);
  for(const key of Object.keys(sample)) assert.ok(names.includes(key), key);
  assert.equal(moduleFor('employee_equipment_register'),'custody');
  assert.equal(metadata.employee_equipment_register.find(c=>c.name==='employee_number').type,'VARCHAR(50)');
});

test('register validation keeps serial IDs as strings and dates optional', () => {
  const data=clean('employee_equipment_register', sample, true, {user_id:7});
  assert.equal(data.employee_number,'EMP000123');
  assert.equal(data.headset_serial,'HS-TEST-001');
  assert.equal(data.created_by,7);
  assert.equal(data.updated_by,7);
  assert.equal(data.record_date,null);
  assert.equal(clean('employee_equipment_register',{record_date:'2026-11-01'},true,{user_id:7}).record_date,'2026-11-01');
  assert.throws(()=>clean('employee_equipment_register',{record_date:'2026-02-30'},true,{user_id:7}),/Invalid date/);
  assert.throws(()=>clean('employee_equipment_register',{line_number:0},true,{user_id:7}),/positive/);
  assert.throws(()=>clean('employee_equipment_register',{employee_name:'   '},true,{user_id:7}),/required/);
});

test('employee register is not available without custody permission and enterprise scope', async () => {
  const req=new Request('http://localhost/api/records/employee_equipment_register',{method:'GET'});
  await assert.rejects(recordAPI(req,null,{super:false,permissions:['custody.view'],scopes:[]},'employee_equipment_register',null,null),e=>e.status===403);
  await assert.rejects(recordAPI(req,null,{super:false,permissions:[],scopes:[{scope_type:'ENTERPRISE',access_level:'VIEW'}]},'employee_equipment_register',null,null),e=>e.status===403);
});

test('additive SQL migration preserves existing asset data and accepts the sample employee kit', async () => {
  const db=new DatabaseSync(':memory:');
  try{
    db.exec('CREATE TABLE users(user_id integer primary key); CREATE TABLE assets(asset_id integer primary key, serial_number text); INSERT INTO users VALUES (7); INSERT INTO assets VALUES (1,\'PRESERVED-ASSET-001\');');
    const sql=await readFile(new URL('../drizzle/0007_employee_equipment_register.sql',import.meta.url),'utf8');
    assert.doesNotMatch(sql,/\b(?:DROP|ALTER|DELETE)\s+TABLE\b/i);
    db.exec(sql.replaceAll('--> statement-breakpoint',''));
    const cols=Object.keys(sample).filter(k=>sample[k]!==null);
    const insert=db.prepare('INSERT INTO employee_equipment_register ('+cols.map(k=>'"'+k+'"').join(',')+',created_by,updated_by) VALUES ('+cols.map(()=>'?').join(',')+',?,?)');
    insert.run(...cols.map(k=>sample[k]),7,7);
    const saved=db.prepare('SELECT * FROM employee_equipment_register WHERE employee_number=?').get('EMP000123');
    assert.equal(saved.site,'TEST SITE T2');
    assert.equal(saved.record_date,null);
    assert.equal(saved.cpu_serial,'CPU-TEST-001');
    assert.equal(saved.monitor_2_serial,'MON-TEST-002');
    assert.equal(saved.headset_serial,'HS-TEST-001');
    assert.equal(db.prepare('SELECT serial_number FROM assets WHERE asset_id=1').get().serial_number,'PRESERVED-ASSET-001');
    assert.throws(()=>db.prepare('INSERT INTO employee_equipment_register(site,line_number,account,employee_number,employee_name,created_by,updated_by) VALUES (?,?,?,?,?,?,?)').run('TEST SITE T2',0,'SAMPLE ACCOUNT','EMP000123','Sample, Employee',7,7));
  } finally {db.close();}
});
