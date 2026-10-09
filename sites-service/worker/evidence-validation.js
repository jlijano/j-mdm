import {fail} from './data.js';
const MB=1024*1024;
const OFFICE=new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
const media={
 'image/jpeg':{ext:['jpg','jpeg'],check:b=>b[0]===255&&b[1]===216&&b[2]===255},
 'image/png':{ext:['png'],check:b=>b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10},
 'image/webp':{ext:['webp'],check:b=>b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80},
 'application/pdf':{ext:['pdf'],check:b=>b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45}
};
const image=m=>m.startsWith('image/');
export function evidencePolicy({mime,filename,documentType,bytes,employee=false}){
 const type=String(mime||'').toLowerCase().trim(),doc=String(documentType||'').toUpperCase();
 const ext=String(filename||'').toLowerCase().split('.').at(-1);
 if(!filename||!String(filename).includes('.'))fail('File extension is required.');
 const photo=employee||doc==='PHOTO'||doc.endsWith('_PHOTO');
 const inventory=['INVENTORY_REPORT','INVENTORY_RECONCILIATION'].includes(doc);
 const diagnostic=['DIAGNOSTIC','REPAIR_REPORT'].includes(doc);
 const max=employee||photo&&['BARCODE_PHOTO','SERIAL_LABEL_PHOTO','ASSET_TAG_PHOTO'].includes(doc)?5:photo?10:15;
 if(!bytes?.length||bytes.length>max*MB)fail('Evidence exceeds its document limit ('+max+' MB).',413);
 if(OFFICE.has(type)){
  if(photo||!((type.endsWith('wordprocessingml.document')&&ext==='docx')||(type.endsWith('spreadsheetml.sheet')&&ext==='xlsx')))fail('Document MIME or extension mismatch.');
  // Office packages must be structurally inspected and malware scanned by a trusted service.
  // A ZIP signature is never sufficient authorization to expose an Office attachment.
  fail('Office evidence requires quarantine, package inspection and malware scanning before it can be accepted.',503);
 }
 if(type==='text/csv'||type==='text/plain'){
  if(photo||!(type==='text/csv'?inventory:diagnostic)||ext!==(type==='text/csv'?'csv':'txt'))fail('This text format is not permitted for the selected evidence workflow.');
  // Restrict to UTF-8 text: no binary, embedded NUL, or invalid sequences.
  let decoded;try{decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('Invalid UTF-8 evidence.');}
  if(decoded.includes('\0'))fail('Binary content is not accepted as text.');
  // CSV and plain text remain downloads, never executed or rendered as active HTML.
  return type;
 }
 const rule=media[type];
 if(!rule||!rule.ext.includes(ext)||!rule.check(bytes))fail('File type, extension, or signature does not match the supported format.');
 if(photo&&!image(type))fail('Photo evidence must be an image.');
 return type;
}
export function validateEvidenceMime(mime,bytes,{photo=false,filename='',documentType=''}={}){
 return evidencePolicy({mime,bytes,filename,documentType:photo?'PHOTO':documentType});
}
