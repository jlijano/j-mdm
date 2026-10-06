import {metadata,query,one,rows,insert,audit,seed,access,allowed,scopeSQL,visibleAsset,fail,enterprise,readonly,moduleFor} from './data.js';
import {recordAPI,lifecycle} from './api.js';
import {now,verify,sessionToken,sessionCookie,digest,random} from './security.js';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
async function input(req){const text=await req.text();if(text.length>7500000)fail('Request too large.',413);let d;try{d=JSON.parse(text);}catch{fail('Invalid JSON.');}if(!d||typeof d!=='object'||Array.isArray(d))fail('Invalid request.');return d;}
async function current(req,db){const token=sessionToken(req);if(!token)return null;const s=await one(db,'SELECT user_id FROM app_sessions WHERE session_hash=? AND expires_at>?',await digest(token),now());return s?access(db,s.user_id):null;}
export default {async fetch(req,env){
 const path=new URL(req.url).pathname;
 if(!path.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(req):new Response('ITAM database service');
 try{
  // Render is the only API gateway. Sites dispatch access and this independent shared secret both apply.
  if(!env.RENDER_API_SECRET||req.headers.get('x-mdm-api-secret')!==env.RENDER_API_SECRET)fail('Unauthorized gateway.',401);
  if(!env.DB)fail('Database is unavailable.',503);
  await seed(env.DB,env);const db=env.DB;
  if(path==='/api/auth/login'&&req.method==='POST'){
   const d=await input(req);if(typeof d.email!=='string'||typeof d.password!=='string'||d.password.length>256)fail('Enter your email or username and password.');
   const account=await one(db,'SELECT * FROM users WHERE lower(email)=? OR lower(username)=?',d.email.trim().toLowerCase(),d.email.trim().toLowerCase());
   if(account?.locked_until&&account.locked_until>now())return json({message:'Account is temporarily locked. Try again in 15 minutes.'},429);
   if(!account?.is_active||!await verify(d.password,account.password_hash)){
    if(account)await db.batch([query(db,"UPDATE users SET failed_login_count=failed_login_count+1,locked_until=CASE WHEN failed_login_count>=4 THEN ? ELSE locked_until END WHERE user_id=?",new Date(Date.now()+900000).toISOString(),account.user_id),audit(db,null,'users',account.user_id,'LOGIN_FAILED',null,null,req)]);
    return json({message:'Email or password is incorrect.'},401);
   }
   const token=random();await db.batch([query(db,'DELETE FROM app_sessions WHERE expires_at<=?',now()),insert(db,'app_sessions',{session_hash:await digest(token),user_id:account.user_id,expires_at:new Date(Date.now()+28800000).toISOString()}),query(db,'UPDATE users SET last_login_at=?,failed_login_count=0,locked_until=NULL WHERE user_id=?',now(),account.user_id),audit(db,account,'users',account.user_id,'LOGIN',null,null,req)]);return json({ok:true,redirect:'/dashboard'},200,{'set-cookie':sessionCookie(token)});
  }
  if(path==='/api/auth/logout'&&req.method==='POST'){const token=sessionToken(req);if(token)await query(db,'DELETE FROM app_sessions WHERE session_hash=?',await digest(token)).run();return json({ok:true},200,{'set-cookie':sessionCookie('',0)});}
  const u=await current(req,db);if(!u)return json({message:'Please sign in.'},401);
  if(path==='/api/auth/me')return json({user:{...u,role:u.roles.map(r=>r.replaceAll('_',' ')).join(', ')}});
  if(path==='/api/metadata')return json({tables:Object.fromEntries(Object.entries(metadata).filter(([t])=>t!=='app_sessions'&&allowed(u,moduleFor(t))).map(([t,cols])=>[t,{columns:cols.filter(c=>c.name!=='password_hash'),module:moduleFor(t),editable:allowed(u,moduleFor(t),true)&&!readonly.has(t)&&!['permissions','asset_lifecycle'].includes(t)}])),user:u});
  if(path==='/api/dashboard'){
   const s=scopeSQL(u);return json({counts:await rows(db,`SELECT st.status_code,st.status_name,COUNT(*) AS count FROM assets a JOIN asset_statuses st ON st.status_id=a.status_id WHERE ${s.sql} GROUP BY st.status_id`,...s.args),recent:await rows(db,`SELECT a.asset_id,a.asset_tag,a.description,a.updated_at,s.status_name,l.location_name FROM assets a JOIN asset_statuses s ON s.status_id=a.status_id LEFT JOIN locations l ON l.location_id=a.current_location_id WHERE ${s.sql} ORDER BY a.updated_at DESC LIMIT 10`,...s.args)});
  }
  let m=/^\/api\/records\/([a-z_]+)(?:\/([^/]+))?$/.exec(path);if(m)return json(await recordAPI(req,db,u,m[1],m[2],req.method==='GET'?null:await input(req)));
  m=/^\/api\/assets\/(\d+)\/actions\/([a-z-]+)$/.exec(path);if(m&&req.method==='POST')return json(await lifecycle(req,db,u,Number(m[1]),m[2],await input(req)));
  if(path==='/api/scan'&&req.method==='POST'){
   if(!allowed(u,'inventory',true))fail('Scanning permission is required.',403);const d=await input(req);if(typeof d.barcode!=='string'||!d.barcode.trim()||d.barcode.length>255)fail('Enter a valid barcode.');
   const s=scopeSQL(u),a=await one(db,`SELECT a.* FROM assets a WHERE (a.barcode=? OR a.asset_tag=?) AND ${s.sql}`,d.barcode,d.barcode,...s.args);const statements=[insert(db,'barcode_scan_logs',{barcode:d.barcode,asset_id:a?.asset_id||null,scan_type:d.inventory_session_id?'INVENTORY':'LOOKUP',scanned_by:u.user_id,device_type:['PHONE','TABLET','DESKTOP'].includes(d.device_type)?d.device_type:'DESKTOP',scan_timestamp:now(),location_id:d.location_id?Number(d.location_id):null,result:a?'MATCH':'NOT_FOUND'})];let result=a?'MATCH':'UNKNOWN';
   if(d.inventory_session_id){if(!enterprise(u,true))fail('Enterprise inventory scope is required.',403);const session=await one(db,"SELECT * FROM inventory_sessions WHERE inventory_session_id=? AND status='ACTIVE'",d.inventory_session_id);if(!session)fail('Choose an active inventory session.');const loc=d.location_id?Number(d.location_id):session.location_id;const duplicate=a&&await one(db,'SELECT inventory_scan_id FROM inventory_scan_results WHERE inventory_session_id=? AND asset_id=?',session.inventory_session_id,a.asset_id);result=duplicate?'DUPLICATE':!a?'UNKNOWN':a.current_location_id===loc?'MATCH':'LOCATION_MISMATCH';statements.push(insert(db,'inventory_scan_results',{inventory_session_id:session.inventory_session_id,asset_id:a?.asset_id||null,scanned_barcode:d.barcode,scanned_at:now(),scanned_by:u.user_id,expected_location_id:a?.current_location_id||null,actual_location_id:loc,result}));}
   statements.push(audit(db,u,'barcode_scan_logs',a?.asset_id||null,'SCAN',null,{barcode:d.barcode,result},req));await db.batch(statements);return json({asset:a||null,result});
  }
  if(path==='/api/security/check'&&req.method==='POST'){
   if(!allowed(u,'security',true))fail('Security permission is required.',403);const d=await input(req);if(!['ENTRY','EXIT'].includes(d.movement_type))fail('Choose ENTRY or EXIT.');const a=await visibleAsset(db,u,d.asset_id);let result='REVIEW_REQUIRED',pass=null;
   if(d.gate_pass_id)pass=await one(db,"SELECT gp.* FROM gate_passes gp JOIN gate_pass_assets ga ON ga.gate_pass_id=gp.gate_pass_id WHERE gp.gate_pass_id=? AND ga.asset_id=? AND gp.status='APPROVED' AND gp.valid_from<=? AND gp.valid_until>=?",d.gate_pass_id,a.asset_id,now(),now());
   if(pass)result='AUTHORIZED';else if(d.movement_type==='EXIT')result='DENIED';
   const st=[insert(db,'security_movements',{asset_id:a.asset_id,movement_type:d.movement_type,employee_id:d.employee_id?Number(d.employee_id):null,location_id:d.location_id?Number(d.location_id):null,gate_pass_id:d.gate_pass_id?Number(d.gate_pass_id):null,scanned_by:u.user_id,scan_time:now(),verification_result:result,flagged:result==='AUTHORIZED'?0:1,remarks:d.notes||null}),audit(db,u,'security_movements',a.asset_id,'GATE_CHECK',null,{result},req)];if(pass&&d.movement_type==='EXIT')st.push(query(db,"UPDATE gate_passes SET status='USED' WHERE gate_pass_id=? AND status='APPROVED'",pass.gate_pass_id));await db.batch(st);return json({result});
  }
  if(path==='/api/files'&&req.method==='POST'){
   if(!allowed(u,'files',true))fail('Upload permission required.',403);const d=await input(req);await visibleAsset(db,u,d.asset_id,true);if(!env.BUCKET)fail('File storage unavailable.',503);if(!['INVOICE','PO','WARRANTY','PHOTO','REPAIR_REPORT','DATA_WIPE_CERT','DISPOSAL_CERT','ASSIGNMENT_FORM','GATE_PASS','OTHER'].includes(d.document_type))fail('Choose a document type.');let bytes;try{bytes=Uint8Array.from(atob(d.base64),c=>c.charCodeAt(0));}catch{fail('Invalid upload.');}if(!bytes.length||bytes.length>5*1024*1024)fail('Files must be between 1 byte and 5 MB.');const filename=String(d.filename||'file').slice(0,255),storage=random();await env.BUCKET.put(storage,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
   try{await db.batch([insert(db,'files',{original_filename:filename,stored_filename:storage,storage_path:storage,mime_type:String(d.mime_type||'application/octet-stream').slice(0,150),file_size:bytes.length,checksum:await digest(d.base64),uploaded_by:u.user_id}),query(db,'INSERT INTO asset_files(asset_id,file_id,document_type) SELECT ?,file_id,? FROM files WHERE stored_filename=?',Number(d.asset_id),d.document_type,storage),audit(db,u,'files',storage,'UPLOAD',null,{asset_id:d.asset_id,filename},req)]);}catch(e){await env.BUCKET.delete(storage);throw e;}return json({ok:true});
  }
  m=/^\/api\/files\/(\d+)$/.exec(path);if(m&&req.method==='GET'){
   if(!allowed(u,'files'))fail('Permission denied.',403);const f=await one(db,'SELECT f.*,af.asset_id FROM files f JOIN asset_files af ON af.file_id=f.file_id WHERE f.file_id=?',Number(m[1]));if(!f)fail('File not found.',404);await visibleAsset(db,u,f.asset_id);const object=await env.BUCKET.get(f.storage_path);if(!object)fail('File unavailable.',404);return new Response(object.body,{headers:{'content-type':'application/octet-stream','content-disposition':`attachment; filename="${f.original_filename.replace(/[^a-zA-Z0-9_. -]/g,'_')}"`,'cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  fail('Not found.',404);
 }catch(e){console.error('ITAM request failed',path,e.message);const constraint=/constraint|UNIQUE|FOREIGN KEY|CHECK/.test(e.message);return json({message:e.status?e.message:constraint?'The operation conflicts with a related record or concurrent update. Review the values and retry.':'Database operation unavailable. Try again.'},e.status||(constraint?409:503));}
}};
