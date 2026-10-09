import {cleanupFailedEvidence} from './evidence-cleanup.js';
import {validateEvidenceMime} from './evidence-validation.js';
import {one,insert,query,audit,allowed,fail} from './data.js';
import {digest,random} from './security.js';

const permitted=u=>allowed(u,'organization');
const canManage=u=>allowed(u,'organization',true)&&allowed(u,'files',true);
const employee=async(db,id)=>one(db,'SELECT employee_id,employee_number,first_name,last_name FROM employees WHERE employee_id=?',id);
const scope=async(db,u,id)=>{
 if(u.super||u.scopes.some(s=>s.scope_type==='ENTERPRISE'))return true;
 if(u.employee_id===id)return true;
 const e=await one(db,'SELECT business_unit_id,department_id,cost_center_id,default_location_id FROM employees WHERE employee_id=?',id);
 if(!e)return false;
 return u.scopes.some(s=>s.scope_type==='BUSINESS_UNIT'&&s.scope_reference_id===e.business_unit_id||s.scope_type==='DEPARTMENT'&&s.scope_reference_id===e.department_id||s.scope_type==='COST_CENTER'&&s.scope_reference_id===e.cost_center_id||s.scope_type==='SITE'&&s.scope_reference_id===e.default_location_id);
};
export async function employeePhotoAPI(req,db,u,path,d,env){
 const m=/^\/api\/employees\/(\d+)\/photo$/.exec(path);if(!m)fail('Not found.',404);
 const id=Number(m[1]);if(!permitted(u)||!await employee(db,id)||!await scope(db,u,id))fail('Employee not found in your permitted scope.',404);
 if(req.method==='GET'){
  if(!allowed(u,'files'))fail('File permission is required.',403);
  const f=await one(db,`SELECT f.* FROM employee_files ef JOIN files f ON f.file_id=ef.file_id WHERE ef.employee_id=? AND ef.document_type='PROFILE_PHOTO' AND ef.is_active=1 ORDER BY ef.employee_file_id DESC LIMIT 1`,id);
  if(!f)fail('Employee photo not found.',404);
  if(!env.BUCKET)fail('File storage unavailable.',503);
  const obj=await env.BUCKET.get(f.storage_path);if(!obj)fail('File unavailable.',404);
  return new Response(obj.body,{headers:{'content-type':f.mime_type,'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
 }
 if(req.method!=='POST'&&req.method!=='DELETE')fail('Method not allowed.',405);
 if(!canManage(u))fail('Employee photo management permission required.',403);
 if(req.method==='DELETE'){
  await db.batch([query(db,"UPDATE employee_files SET is_active=0 WHERE employee_id=? AND document_type='PROFILE_PHOTO' AND is_active=1",id),audit(db,u,'employee_files',id,'PROFILE_PHOTO_REMOVED',null,{employee_id:id},req)]);
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json','cache-control':'no-store'}});
 }
 if(!env.BUCKET)fail('File storage unavailable.',503);
 const mime=String(d?.mime_type||'');if(!['image/jpeg','image/png','image/webp'].includes(mime))fail('Choose a JPEG, PNG, or WebP image.');
 if(typeof d?.base64!=='string')fail('Invalid upload.');
 let bytes;try{bytes=Uint8Array.from(atob(d.base64),c=>c.charCodeAt(0));}catch{fail('Invalid upload.');}
 if(!bytes.length||bytes.length>5*1024*1024)fail('Employee photos must be 5 MB or smaller.');
 validateEvidenceMime(mime,bytes,{photo:true,filename:d.filename});
 const filename=String(d.filename||'employee-photo').replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,120),storage=random();
 await env.BUCKET.put(storage,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
 try{
  await db.batch([
   insert(db,'files',{original_filename:filename,stored_filename:storage,storage_path:storage,mime_type:mime,file_size:bytes.length,checksum:await digest(d.base64),uploaded_by:u.user_id}),
   query(db,"UPDATE employee_files SET is_active=0 WHERE employee_id=? AND document_type='PROFILE_PHOTO' AND is_active=1",id),
   query(db,"INSERT INTO employee_files(employee_id,file_id,document_type,description,is_active,created_by) SELECT ? ,file_id,'PROFILE_PHOTO','Employee identity reference photo',1,? FROM files WHERE stored_filename=?",id,u.user_id,storage),
   audit(db,u,'employee_files',id,'PROFILE_PHOTO_UPLOADED',null,{employee_id:id},req)
  ]);

  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json','cache-control':'no-store'}});
 }catch(e){await cleanupFailedEvidence(db,env.BUCKET,storage);throw e;}
}
