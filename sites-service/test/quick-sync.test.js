import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import {database} from './helpers.js';
import {passwordHash,digest} from '../worker/security.js';
import {canonical} from '../worker/quick-sync.js';
test('shared scanner: two devices, idempotent imports, conflicts, tombstones, tenants and revoked sessions',async()=>{
 const {db,sql}=database(),env={DB:db,RENDER_API_SECRET:'test-secret',SUPER_ADMIN_EMAIL:'admin@example.com',SUPER_ADMIN_PASSWORD_HASH:await passwordHash('test-password')};
 let cookie='';
 async function call(path,body,extra={}){const r=await worker.fetch(new Request('https://example.test/api/quick-sync/'+path,{method:body?'POST':'GET',headers:{'x-mdm-api-secret':'test-secret',cookie},body:body?JSON.stringify(body):undefined}),{...env,...extra});return{status:r.status,...await r.json()}}
 assert.equal((await call('events')).status,401);
 const login=await worker.fetch(new Request('https://example.test/api/auth/login',{method:'POST',headers:{'x-mdm-api-secret':'test-secret'},body:JSON.stringify({email:'admin@example.com',password:'test-password'})}),env);cookie=login.headers.get('set-cookie').split(';')[0];assert.equal(login.status,200);
 assert.equal((await call('context')).canWrite,true);
 const payload={barcode:'ABC',assignee:'Private person',notes:'original',custom:{preserved:true}},id=await digest('abc');
 const a={kind:'asset',id,operationId:'import:a',origin:'device-a',base:0,action:'import',payload};
 const first=await call('mutate',a);assert.equal(first.event.revision,1);
 assert.equal((await call('mutate',a)).duplicate,true);
 assert.equal((await call('mutate',{...a,operationId:'import:b',origin:'device-b'})).duplicate,true);
 assert.equal((await call('mutate',{...a,payload:{...payload,notes:'reused key'}})).status,409);
 let deviceB=await call('events');assert.equal(deviceB.events.length,1);assert.equal(deviceB.events[0].payload.custom.preserved,true);
 const edit={...a,action:'put',base:1,operationId:'edit:a',payload:{...payload,notes:'A updated'}};
 assert.equal((await call('mutate',edit)).event.revision,2);
 const conflict=await call('mutate',{...edit,operationId:'edit:b',payload:{...payload,notes:'B concurrent'}});assert.equal(conflict.conflict,true);assert.equal(conflict.current.payload.notes,'A updated');
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM audit_logs WHERE event_type='QUICK_SYNC_CONFLICT'").get().n,1);
 assert.equal((await call('mutate',{...a,operationId:'stale-import',payload:{...payload,notes:'stale local'}})).conflict,true);
 const del=await call('mutate',{...edit,operationId:'delete:a',action:'delete',base:2});assert.equal(del.event.deleted,true);
 const restored=await call('mutate',{...edit,operationId:'restore:a',base:3});assert.equal(restored.event.revision,4);assert.equal(restored.event.deleted,false);
 const scan={...a,kind:'scan',id:await digest(canonical({barcode:'ABC',at:'2026-10-31'})),payload:{barcode:'ABC',at:'2026-10-31'},operationId:'scan:a'};assert.equal((await call('mutate',scan)).event.revision,1);assert.equal((await call('mutate',{...scan,operationId:'scan:b'})).duplicate,true);
 assert.equal((await call('mutate',{...scan,base:1,action:'delete',operationId:'scan-delete'})).status,405);
 assert.equal((await call('events',null,{QUICK_SYNC_TENANT:'another-tenant'})).events.length,0);
 assert.equal((await call('context',null,{QUICK_SYNC_DISABLED:'1'})).status,503);
 const before=sql.prepare('SELECT COUNT(*) n FROM quick_sync_events').get().n;
 assert.throws(()=>sql.exec('DELETE FROM quick_sync_events'),/retained/);assert.equal(sql.prepare('SELECT COUNT(*) n FROM quick_sync_events').get().n,before);
 // Forced failure in the audit statement rolls back the inserted revision.
 sql.exec("CREATE TRIGGER reject_sync_audit BEFORE INSERT ON audit_logs WHEN NEW.event_type='QUICK_SYNC_PUT' BEGIN SELECT RAISE(ABORT,'test fault'); END");
 assert.equal((await call('mutate',{...edit,base:4,operationId:'fault'})).status,503);assert.equal(sql.prepare('SELECT COUNT(*) n FROM quick_sync_events').get().n,before);sql.exec('DROP TRIGGER reject_sync_audit');
 assert.equal((await call('mutate',{...edit,base:4,operationId:'fault'})).event.revision,5);
 const after=await call('events?after='+deviceB.cursor);assert.equal(after.events.length,5);
 // An unauthorized gateway never reaches the database.
 const denied=await worker.fetch(new Request('https://example.test/api/quick-sync/events'),env);assert.equal(denied.status,401);
 sql.exec('DELETE FROM app_sessions');assert.equal((await call('events')).status,401);assert.equal((await call('mutate',{...edit,base:5,operationId:'revoked'})).status,401);
});

test('scanner denies narrow scopes and checks view/manage independently',async()=>{
 const {quickSyncAPI}=await import('../worker/quick-sync.js');const {db}=database();
 const req=new Request('https://test/api/quick-sync/context');
 for(const u of [{permissions:[],scopes:[{scope_type:'ENTERPRISE',access_level:'MANAGE'}]},{permissions:['assets.view','assets.manage'],scopes:[{scope_type:'SITE',scope_reference_id:1,access_level:'MANAGE'}]}])await assert.rejects(quickSyncAPI(req,db,u,'/api/quick-sync/context',null,{}),e=>e.status===403);
 const viewer={permissions:['assets.view'],scopes:[{scope_type:'ENTERPRISE',access_level:'VIEW'}],user_id:1};assert.equal((await quickSyncAPI(req,db,viewer,'/api/quick-sync/context',null,{})).canWrite,false);
 await assert.rejects(quickSyncAPI(new Request(req,{method:'POST'}),db,viewer,'/api/quick-sync/mutate',{},{}),e=>e.status===403);
});
