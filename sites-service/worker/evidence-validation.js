import {fail} from './data.js';
const MB=1024*1024;
const OFFICE={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
const IMAGE=new Set(['image/jpeg','image/png','image/webp']);
const ext={ 'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','application/pdf':'.pdf',[OFFICE.docx]:'.docx',[OFFICE.xlsx]:'.xlsx','text/csv':'.csv','text/plain':'.txt'};
const signatures={
 'image/jpeg':b=>b[0]===255&&b[1]===216&&b[2]===255,
 'image/png':b=>b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10,
 'image/webp':b=>b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80,
 'application/pdf':b=>b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45
};
const lower=v=>String(v||'').trim().toLowerCase();
function checkOffice(bytes,mime){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 // Central-directory inspection only; malware scanning remains mandatory.
 let eocd=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(v.getUint32(i,true)===0x06054b50){eocd=i;break;}}
 if(eocd<0||v.getUint16(eocd+4,true)!==0||v.getUint16(eocd+6,true)!==0)fail('Invalid Office package.');
 const count=v.getUint16(eocd+10,true),start=v.getUint32(eocd+16,true);
 if(!count||count>1500||start>=eocd)fail('Office package exceeds safety limits.');
 let at=start,total=0;const names=new Set();
 for(let i=0;i<count;i++){
  if(at+46>eocd||v.getUint32(at,true)!==0x02014b50)fail('Invalid Office package.');
  const method=v.getUint16(at+10,true),packed=v.getUint32(at+20,true),unpacked=v.getUint32(at+24,true);
  const nl=v.getUint16(at+28,true),extra=v.getUint16(at+30,true),comment=v.getUint16(at+32,true);
  if(method!==0&&method!==8)fail('Unsupported Office compression.');
  if(unpacked>25*MB||packed===0&&unpacked>0||packed&&unpacked/packed>100)fail('Unsafe Office compression ratio.');
  total+=unpacked;if(total>50*MB||nl>1024||at+46+nl+extra+comment>eocd)fail('Office package exceeds safety limits.');
  const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(at+46,at+46+nl)).toLowerCase();
  if(name.includes('..')||name.startsWith('/')||name.includes('\\')||/vbaproject|activex|embeddings\/|externallinks\/|oleobject|\.exe$|\.js$/.test(name))fail('Active Office content is not permitted.');
  names.add(name);at+=46+nl+extra+comment;
 }
 if(!names.has('[content_types].xml')||!names.has('_rels/.rels')||!names.has(mime===OFFICE.docx?'word/document.xml':'xl/workbook.xml'))fail('Office package does not match declared type.');
}
export function evidenceLimit(category,mime){
 if(IMAGE.has(mime))return /BARCODE|SERIAL|LABEL|ASSET_TAG|PROFILE_PHOTO/.test(category)?5*MB:10*MB;
 if(mime==='text/plain'||mime==='text/csv')return 5*MB;
 return 15*MB;
}
export function validateEvidenceMime(mime,bytes,{photo=false,documentType='',filename=''}={}){
 const name=lower(mime),type=String(documentType||'').toUpperCase(),suffix=lower(filename).match(/\.[a-z0-9]+$/)?.[0];
 if(!Object.hasOwn(ext,name))fail('Unsupported evidence file format.');
 if(!suffix||!(name==='image/jpeg'&&suffix==='.jpeg')&&suffix!==ext[name])fail('File extension does not match declared format.');
 if(photo&&!IMAGE.has(name))fail('Photo evidence must be a supported image.');
 if(name==='text/csv'||name==='text/plain'){
  if(!/INVENTORY|RECONCILIATION|DIAGNOSTIC|REPAIR_REPORT/.test(type))fail('Text evidence is limited to approved inventory and diagnostic workflows.');
  const decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(decoded.includes('\0')||/^[\s]*[=+@-]/m.test(decoded))fail('Unsafe text evidence.');
 }else if(name===OFFICE.docx||name===OFFICE.xlsx)checkOffice(bytes,name);
 else if(!signatures[name](bytes))fail('File content does not match its declared format.');
 if(bytes.length===0||bytes.length>evidenceLimit(type,name))fail('Evidence exceeds document size limit.',413);
 return name;
}
export function requiresMalwareScan(mime){return mime===OFFICE.docx||mime===OFFICE.xlsx;}
