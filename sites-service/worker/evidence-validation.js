// Evidence validation shared by legacy and Asset 360 upload endpoints.
// DOCX/XLSX require a configured scanner and deep Office inspection; fail closed here.
import {fail} from './data.js';
const images={ 'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp' };
const photoType=t=>t==='PHOTO'||t.endsWith('_PHOTO')||t==='ASSET_TAG_PHOTO'||t==='SERIAL_LABEL_PHOTO'||t==='MANUFACTURER_LABEL_PHOTO';
export function validatedEvidence(data,documentType,maxBytes=10*1024*1024){
 if(typeof data?.base64!=='string'||!data.base64||data.base64.length>Math.ceil(maxBytes/3)*4+8)fail('Invalid or oversized upload.',400);
 let bytes;try{bytes=Uint8Array.from(atob(data.base64),x=>x.charCodeAt(0));}catch{fail('Invalid base64 upload.',400);}
 if(!bytes.length||bytes.length>maxBytes)fail('File size exceeds the approved limit.',400);
 const mime=String(data.mime_type||'').trim().toLowerCase();
 const filename=String(data.filename||'').trim();
 if(!filename||filename.length>255||/[/\\\x00-\x1f]/.test(filename))fail('Choose a valid filename.',400);
 const ext=filename.slice(filename.lastIndexOf('.')).toLowerCase();
 const starts=(...v)=>v.every((n,i)=>bytes[i]===n);
 const jpeg=bytes.length>=4&&starts(255,216,255)&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217;
 const png=bytes.length>=24&&starts(137,80,78,71,13,10,26,10);
 const webp=bytes.length>=16&&starts(82,73,70,70)&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 const pdf=bytes.length>=8&&starts(37,80,68,70,45);
 if(photoType(documentType)&&!Object.hasOwn(images,mime))fail('This evidence category requires a JPEG, PNG or WebP image.',400);
 if(Object.hasOwn(images,mime)){
  const valid=mime==='image/jpeg'?jpeg:mime==='image/png'?png:webp;
  if(!valid||!(ext===images[mime]||(mime==='image/jpeg'&&ext==='.jpeg')))fail('Image extension or content does not match the declared format.',400);
  return {bytes,mime,filename};
 }
 if(mime==='application/pdf'&&ext==='.pdf'&&pdf){
  // PDF uploads require a deployed malware scanning/quarantine workflow.
  fail('PDF evidence upload is unavailable until malware scanning and quarantine are configured.',503);
 }
 if(['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime)){
  fail('Office evidence requires content inspection and malware scanning before upload.',503);
 }
 fail('Unsupported or unverified evidence format.',400);
}
