import {insert,fail} from './data.js';
import {random} from './security.js';
import {cleanupFailedEvidence} from './evidence-cleanup.js';

const office = new Map([
 ['application/vnd.openxmlformats-officedocument.wordprocessingml.document','docx'],
 ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx']
]);
export function isOfficeEvidence(mime){return office.has(String(mime||'').toLowerCase().trim());}
export async function quarantineOfficeEvidence(db,bucket,u,assetId,d,bytes){
 const mime=String(d.mime_type||'').toLowerCase().trim(),filename=String(d.filename||'');
 const expected=office.get(mime);
 if(!expected||!filename.toLowerCase().endsWith('.'+expected))fail('Office evidence extension and MIME do not match.');
 if(!bytes.length||bytes.length>15*1024*1024)fail('Office evidence exceeds 15 MB.',413);
 // Preliminary ZIP-container check only. Never serve or approve without full OOXML inspection and malware scan.
 if(!(bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4))fail('Invalid Office package.');
 const key='quarantine/'+random();
 await bucket.put(key,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
 try{
  await insert(db,'evidence_quarantine',{asset_id:Number(assetId),document_type:String(d.document_type),original_filename:filename.slice(0,255),mime_type:mime,storage_path:key,file_size:bytes.length,uploaded_by:u.user_id,status:'PENDING_SCAN'}).run();
 }catch(e){await cleanupFailedEvidence(db,bucket,key);throw e;}
 // Never return object path or make a files/asset_files record before an independently verified scan.
 return {ok:true,status:'PENDING_SCAN'};
}
