import {query,one,rows,audit,allowed,enterprise,fail} from './data.js';
import {digest,now} from './security.js';
// A dedicated namespace preserves unstructured scanner records without inventing ITAM assignments.
// Tenant selection is server-only. Each Sites DB belongs to one organization.
export const canonical = value => JSON.stringify(normalize(value));
function normalize(v) {
 if(Array.isArray(v))return v.map(normalize);
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])]));
 return v;
}
export async function quickSyncAPI(req,db,u,path,d,env) {
 if(env.QUICK_SYNC_DISABLED==='1')fail('Shared scanner synchronization is disabled. Local backups are retained.',503);
 const write=req.method!=='GET';
 if(!allowed(u,'assets',write)||!enterprise(u,write))fail('Enterprise asset permission is required for the shared scanner workspace.',403);
 if((await one(db,"SELECT setting_value FROM system_settings WHERE setting_key='feature:assets'"))?.setting_value==='0')fail('Assets are disabled.',403);
 const tenant=env.QUICK_SYNC_TENANT||'quick-default';
 if(path==='/api/quick-sync/context'&&req.method==='GET')return{tenant,userId:u.user_id,canWrite:allowed(u,'assets',true)&&enterprise(u,true)};
 if(path==='/api/quick-sync/events'&&req.method==='GET'){
  const cursor=Number(new URL(req.url).searchParams.get('after')||0);if(!Number.isSafeInteger(cursor)||cursor<0)fail('Invalid cursor.');
  const events=await rows(db,'SELECT * FROM quick_sync_events WHERE tenant=? AND sequence>? ORDER BY sequence LIMIT 200',tenant,cursor);
  return{events:events.map(decode),cursor:events.at(-1)?.sequence??cursor,more:events.length===200};
 }
 if(path!=='/api/quick-sync/mutate'||req.method!=='POST')fail('Not found.',404);
 if(!d||!['asset','scan'].includes(d.kind)||!['put','delete','import'].includes(d.action))fail('Invalid operation.');
 for(const key of ['id','operationId','origin'])if(typeof d[key]!=='string'||!/^[a-zA-Z0-9:_-]{1,180}$/.test(d[key]))fail('Invalid operation identity.');
 if(!Number.isSafeInteger(d.base)||d.base<0)fail('A revision is required.');
 if(d.kind==='scan'&&d.action==='delete')fail('Scan history is retained.',405);
 if(!d.payload||typeof d.payload!=='object'||Array.isArray(d.payload)||typeof d.payload.barcode!=='string'||!d.payload.barcode.trim()||d.payload.barcode.length>256)fail('A valid identifier is required.');
 const payload=canonical(d.payload);if(payload.length>32000)fail('Record too large.',413);
 const hash=await digest(payload),deleted=d.action==='delete'?1:0;
 // Canonical import identity is verified server-side, preventing accidental duplicate imports.
 if(d.base===0){const expected=await digest(d.kind==='asset'?d.payload.barcode.trim().toLowerCase():payload);if(d.id!==expected)fail('Invalid record identity.');}
 if(d.action==='import'&&d.base!==0)fail('Invalid import revision.');
 const prior=await one(db,'SELECT * FROM quick_sync_events WHERE tenant=? AND operation_id=?',tenant,d.operationId);
 if(prior){if(prior.request_hash!==await digest(canonical(d)))fail('Operation identity was reused with different content.',409);return{event:decode(prior),duplicate:true};}
 const current=await one(db,'SELECT * FROM quick_sync_events WHERE tenant=? AND kind=? AND entity_id=? ORDER BY revision DESC LIMIT 1',tenant,d.kind,d.id);
 if(current&&d.kind==='asset'&&JSON.parse(current.payload).barcode.trim().toLowerCase()!==d.payload.barcode.trim().toLowerCase())fail('Shared asset identifiers are permanent. Create a separate asset for a different identifier.');
 if(d.action==='import'&&current&&!current.deleted&&current.content_hash===hash)return{event:decode(current),duplicate:true};
 if((current?.revision||0)!==d.base||d.action==='import'&&current){
  await audit(db,u,'quick_sync_events',d.id,'QUICK_SYNC_CONFLICT',null,{tenant,origin:d.origin,operationId:d.operationId,submitted:d.payload,base:d.base,currentRevision:current?.revision||0},req).run();
  return{conflict:true,current:current?decode(current):null};
 }
 // Unique revision and operation keys serialize concurrent writes. The audit and event commit atomically.
 try{await db.batch([
  query(db,'INSERT INTO quick_sync_events(tenant,kind,entity_id,revision,operation_id,origin,content_hash,request_hash,payload,deleted,actor,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',tenant,d.kind,d.id,d.base+1,d.operationId,d.origin,hash,await digest(canonical(d)),payload,deleted,u.user_id,now()),
  audit(db,u,'quick_sync_events',d.id,'QUICK_SYNC_'+d.action.toUpperCase(),current?decode(current):null,{tenant,origin:d.origin,revision:d.base+1,payload:d.payload,deleted},req)
 ]);}catch(e){if(/UNIQUE|constraint/.test(e.message))return{retry:true};throw e;}
 return{event:decode(await one(db,'SELECT * FROM quick_sync_events WHERE tenant=? AND operation_id=?',tenant,d.operationId))};
}
function decode(e){return{sequence:e.sequence,kind:e.kind,id:e.entity_id,revision:e.revision,payload:JSON.parse(e.payload),deleted:!!e.deleted,origin:e.origin,at:e.created_at};}
