import {insert,fail} from './data.js';
import {random} from './security.js';
import {cleanupFailedEvidence} from './evidence-cleanup.js';

const office = new Map([
 ['application/vnd.openxmlformats-officedocument.wordprocessingml.document','docx'],
 ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx']
]);
export function isOfficeEvidence(mime){return office.has(String(mime||'').toLowerCase().trim());}

function inspectOfficeContainer(bytes,extension){
 const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const u16=i=>data.getUint16(i,true),u32=i=>data.getUint32(i,true);
 const start=Math.max(0,bytes.length-65557);
 let end=-1;
 for(let i=bytes.length-22;i>=start;i--){
  if(u32(i)===0x06054b50&&i+22+u16(i+20)===bytes.length){end=i;break;}
 }
 if(end<0||u16(end+4)!==0||u16(end+6)!==0||u16(end+8)!==u16(end+10))fail('Invalid Office archive directory.');
 const count=u16(end+10),size=u32(end+12),offset=u32(end+16);
 if(!count||count>2000||size>bytes.length||offset>bytes.length-size||offset+size!==end)fail('Invalid Office archive structure.');
 const names=new Set();
 const decoder=new TextDecoder('utf-8',{fatal:true});
 let at=offset,total=0;
 for(let i=0;i<count;i++){
  if(at+46> end||u32(at)!==0x02014b50)fail('Invalid Office archive entry.');
  const flags=u16(at+8),method=u16(at+10),packed=u32(at+20),plain=u32(at+24);
  const nameLength=u16(at+28),extra=u16(at+30),comment=u16(at+32),local=u32(at+42);
  const next=at+46+nameLength+extra+comment;
  if(next>end||!nameLength||flags&1||![0,8].includes(method)||plain>50*1024*1024||packed>bytes.length)fail('Unsafe Office archive entry.');
  let name;try{name=decoder.decode(bytes.subarray(at+46,at+46+nameLength));}catch{fail('Invalid Office archive filename.');}
  if(name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')||name.includes('\0')||names.has(name))fail('Unsafe Office archive filename.');
  if(/(?:^|\/)(?:vbaProject\.bin|[^/]+\.(?:exe|dll|js|vbs|bat|cmd|ps1))$/i.test(name))fail('Executable or macro-enabled Office content is prohibited.');
  if(local+30>offset||u32(local)!==0x04034b50)fail('Invalid Office archive entry offset.');
  const startData=local+30+u16(local+26)+u16(local+28);
  if(startData>offset||packed>offset-startData)fail('Invalid Office archive payload.');
  total+=plain;
  if(total>100*1024*1024)fail('Office archive expands beyond its safe limit.');
  names.add(name);
  at=next;
 }
 if(at!==end||!names.has('[Content_Types].xml')||!names.has('_rels/.rels')||!names.has(extension==='docx'?'word/document.xml':'xl/workbook.xml'))fail('Incomplete Office document package.');
}

export async function quarantineOfficeEvidence(db,bucket,u,assetId,d,bytes){
 const mime=String(d.mime_type||'').toLowerCase().trim(),filename=String(d.filename||'');
 const expected=office.get(mime);
 if(!expected||!filename.toLowerCase().endsWith('.'+expected))fail('Office evidence extension and MIME do not match.');
 if(!bytes.length||bytes.length>15*1024*1024)fail('Office evidence exceeds 15 MB.',413);
 // Preliminary ZIP-container check only. Never serve or approve without full OOXML inspection and malware scan.
 if(!(bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4))fail('Invalid Office package.');
 inspectOfficeContainer(bytes,expected);
 const key='quarantine/'+random();
 await bucket.put(key,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
 try{
  await insert(db,'evidence_quarantine',{asset_id:Number(assetId),document_type:String(d.document_type),original_filename:filename.slice(0,255),mime_type:mime,storage_path:key,file_size:bytes.length,uploaded_by:u.user_id,status:'PENDING_SCAN'}).run();
 }catch(e){await cleanupFailedEvidence(db,bucket,key);throw e;}
 // Never return object path or make a files/asset_files record before an independently verified scan.
 return {ok:true,status:'PENDING_SCAN'};
}
