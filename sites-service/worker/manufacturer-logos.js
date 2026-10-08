import {one,query,insert,audit,allowed,enterprise,fail} from './data.js';
import {digest,random} from './security.js';
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function initializeManufacturerLogos(db){
 await query(db,'CREATE TABLE IF NOT EXISTS manufacturer_logos (manufacturer_id INTEGER PRIMARY KEY REFERENCES manufacturers(manufacturer_id) ON DELETE CASCADE, file_id INTEGER NOT NULL REFERENCES files(file_id), updated_by INTEGER NOT NULL REFERENCES users(user_id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)').run();
}
export async function manufacturerLogoAPI(req,db,u,path,d,env){
 const match=/^\/api\/manufacturers\/(\d+)\/logo$/.exec(path);
 if(!match)fail('Not found.',404);
 const id=Number(match[1]);
 if(!allowed(u,'master'))fail('Manufacturer permission required.',403);
 if(!await one(db,'SELECT manufacturer_id FROM manufacturers WHERE manufacturer_id=?',id))fail('Manufacturer not found.',404);
 if(req.method==='GET'){
   const f=await one(db,'SELECT f.mime_type,f.storage_path FROM manufacturer_logos ml JOIN files f ON f.file_id=ml.file_id WHERE ml.manufacturer_id=?',id);
   if(!f)fail('Manufacturer logo not found.',404);
   if(!env.BUCKET)fail('File storage unavailable.',503);
   const obj=await env.BUCKET.get(f.storage_path);
   if(!obj)fail('Logo file unavailable.',404);
   return new Response(obj.body,{headers:{'content-type':f.mime_type,'cache-control':'private, max-age=300','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
 }
 if(!['POST','DELETE'].includes(req.method))fail('Method not allowed.',405);
 if(!allowed(u,'master',true)||!allowed(u,'files',true)||!enterprise(u,true))fail('Manufacturer logo management permission required.',403);
 const prior=await one(db,'SELECT file_id FROM manufacturer_logos WHERE manufacturer_id=?',id);
 if(req.method==='DELETE'){
   await db.batch([query(db,'DELETE FROM manufacturer_logos WHERE manufacturer_id=?',id),audit(db,u,'manufacturers',id,'LOGO_REMOVED',prior,null,req)]);
   return response({ok:true});
 }
 if(!env.BUCKET)fail('File storage unavailable.',503);
 const mime=String(d?.mime_type||'');
 if(!['image/jpeg','image/png','image/webp'].includes(mime))fail('Choose a JPEG, PNG, or WebP logo.');
 if(typeof d?.base64!=='string')fail('Invalid upload.');
 let bytes;try{bytes=Uint8Array.from(atob(d.base64),c=>c.charCodeAt(0));}catch{fail('Invalid upload.');}
 if(!bytes.length||bytes.length>2*1024*1024)fail('Logo must be 2 MB or smaller.');
 const b=bytes;
 const valid=mime==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:mime==='image/png'?b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10:b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80;
 if(!valid)fail('Logo content does not match the selected format.');
 const storage=random(),filename=String(d.filename||'manufacturer-logo').replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,120);
 await env.BUCKET.put(storage,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
 try {
   await insert(db,'files',{original_filename:filename,stored_filename:storage,storage_path:storage,mime_type:mime,file_size:bytes.length,checksum:await digest(d.base64),uploaded_by:u.user_id}).run();
   const file=await one(db,'SELECT file_id FROM files WHERE stored_filename=?',storage);
   await db.batch([query(db,'INSERT INTO manufacturer_logos(manufacturer_id,file_id,updated_by,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(manufacturer_id) DO UPDATE SET file_id=excluded.file_id,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP',id,file.file_id,u.user_id),audit(db,u,'manufacturers',id,'LOGO_UPDATED',prior,{file_id:file.file_id},req)]);
   return response({ok:true});
 }catch(e){await env.BUCKET.delete(storage);throw e;}
}
