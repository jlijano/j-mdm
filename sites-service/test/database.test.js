import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import worker from '../dist/server/index.js';
import {passwordHash} from '../worker/security.js';
function database(){const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(`drizzle/${file}`,'utf8'));
 const db={prepare(text){return{bind(...values){return{async first(){return sql.prepare(text).get(...values)||null;},async all(){return{results:sql.prepare(text).all(...values)};},async run(){const r=sql.prepare(text).run(...values);return{meta:{last_row_id:Number(r.lastInsertRowid),changes:Number(r.changes)}};}};}};},async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};return{db,sql};}
test('D1 schema, authentication, RBAC, custody history, transfer receipt and exact depreciation',async()=>{
 const{db,sql}=database(),env={DB:db,RENDER_API_SECRET:'test-secret',SUPER_ADMIN_EMAIL:'a@a.a.com',SUPER_ADMIN_PASSWORD_HASH:await passwordHash('fixture-password')};let cookie='';
 async function call(path,method='GET',data){const r=await worker.fetch(new Request(`https://data.example${path}`,{method,headers:{'x-mdm-api-secret':'test-secret',cookie,'content-type':'application/json'},body:data?JSON.stringify(data):undefined}),env);const body=await r.json();if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{status:r.status,...body};}
 const unauth=await worker.fetch(new Request('https://data.example/api/metadata'),env);assert.equal(unauth.status,401);
 assert.equal((await call('/api/auth/login','POST',{email:'a@a.a.com',password:'fixture-password'})).status,200);
 assert.equal((await call('/api/auth/me')).user.super,true);assert.equal(Object.keys((await call('/api/metadata')).tables).length,51);
 const create=async(t,d)=>{const r=await call(`/api/records/${t}`,'POST',d);assert.equal(r.status,200,`${t}: ${r.message}`);return r.id;};
 const bu=await create('business_units',{business_unit_code:'TEST',business_unit_name:'Test Business'});
 const loc=await create('locations',{location_type_id:1,location_name:'Store'}),dest=await create('locations',{location_type_id:2,location_name:'Office'}),emp=await create('employees',{employee_number:'E1',first_name:'Fixture',last_name:'Employee',employment_status:'ACTIVE',business_unit_id:bu});
 const id=await create('assets',{asset_tag:'A001',barcode:'001234',category_id:1,asset_type_id:1,asset_class_id:1,condition_id:1,current_location_id:loc});
 assert.equal((await call('/api/records/assets','POST',{asset_tag:'A002',category_id:1,asset_type_id:1,asset_class_id:1,condition_id:1,quantity:'2',is_serialized:1})).status,400);
 const action=async(name,d={})=>{const r=await call(`/api/assets/${id}/actions/${name}`,'POST',d);assert.equal(r.status,200,`${name}: ${r.message}`);};
 await action('assign',{employee_id:emp,location_id:dest});assert.equal(sql.prepare("SELECT COUNT(*) n FROM asset_assignments WHERE assignment_status='ACTIVE'").get().n,1);
 assert.equal((await call(`/api/assets/${id}/actions/assign`,'POST',{employee_id:emp,location_id:dest})).status,400);
 await action('return',{location_id:loc});await action('assign',{employee_id:emp,location_id:dest});await action('return',{location_id:loc});assert.equal(sql.prepare('SELECT COUNT(*) n FROM asset_assignments').get().n,2);
 await action('transfer',{location_id:dest});assert.equal(sql.prepare('SELECT current_location_id FROM assets WHERE asset_id=?').get(id).current_location_id,loc);await action('receive');assert.equal(sql.prepare('SELECT current_location_id FROM assets WHERE asset_id=?').get(id).current_location_id,dest);
 const profile=await create('depreciation_profiles',{profile_name:'Three months',depreciation_method_id:1,useful_life_months:3,residual_percentage:'0',effective_from:'2026-01-01'});
 await create('asset_financials',{asset_id:id,acquisition_cost:'100.00',current_book_value:'100.00',residual_value:'0',depreciation_profile_id:profile});await action('depreciate',{period_date:'2026-01-01'});assert.equal(sql.prepare('SELECT depreciation_amount FROM asset_depreciation').get().depreciation_amount,'33.33');
 assert.equal((await call(`/api/assets/${id}/actions/depreciate`,'POST',{period_date:'2026-01-01'})).status,400);
 assert.ok(sql.prepare('SELECT COUNT(*) n FROM audit_logs').get().n>10);
 const low=await create('users',{username:'viewer',email:'viewer@example.com',password:'fixture-password',employee_id:emp});await create('user_roles',{user_id:low,role_id:7});await create('user_scopes',{user_id:low,scope_type:'SELF',access_level:'VIEW'});
 cookie='';await call('/api/auth/login','POST',{email:'viewer@example.com',password:'fixture-password'});assert.equal((await call('/api/records/assets')).rows.length,0);assert.equal((await call(`/api/assets/${id}/actions/assign`,'POST',{employee_id:emp,location_id:loc})).status,403);
 cookie='';await call('/api/auth/login','POST',{email:'a@a.a.com',password:'fixture-password'});await action('assign',{employee_id:emp,location_id:loc});await create('user_scopes',{user_id:low,scope_type:'BUSINESS_UNIT',scope_reference_id:bu,access_level:'VIEW'});cookie='';await call('/api/auth/login','POST',{email:'viewer@example.com',password:'fixture-password'});assert.equal((await call('/api/records/assets')).rows.length,1);
 await call('/api/auth/logout','POST',{});assert.equal((await call('/api/auth/me')).status,401);
});
