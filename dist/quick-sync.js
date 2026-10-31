/* Shared scanner storage. Legacy keys are read-only after opting into sync. */
(()=>{'use strict';
const assetKey='jmdm-quick-records-v1',scanKey='jmdm-quick-scans-v1',prefix='jmdm-sync-v1:';
const uuid=()=>crypto.randomUUID();
const canonical=v=>JSON.stringify(normal(v));
function normal(v){if(Array.isArray(v))return v.map(normal);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,normal(v[k])]));return v}
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const clean=r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['_syncId','_syncRevision','_syncHash'].includes(k)));
let context=null,namespace='',active=false,busy=false,message='Checking workspace access…',migrationReady=false;
const parse=(key,fallback)=>{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)};
const legacy=key=>{const data=parse(key,[]);if(!Array.isArray(data))throw Error('Local data is not an array. Download the raw JSON backup; no data was changed.');return data};
const keys=()=>Array.from({length:localStorage.length},(_,i)=>localStorage.key(i));
function state(){return parse(namespace+'cache',{cursor:0,entities:{}})}
function pending(){return keys().filter(k=>k.startsWith(namespace+'op:')).map(k=>({...parse(k,null),storageKey:k})).sort((a,b)=>a.order.localeCompare(b.order))}
function notify(){window.dispatchEvent(new Event('quick-store-change'));if(panel)draw()}
function locked(fn){return navigator.locks?navigator.locks.request(prefix+'storage',fn):Promise.reject(Error('This browser needs Web Locks support for safe synchronization. Use an updated browser.'))}
function backup(once=false){const fixed=prefix+'backup:local-original';if(once&&localStorage.getItem(fixed))return JSON.parse(localStorage.getItem(fixed));const data={version:1,createdAt:new Date().toISOString(),recordsRaw:localStorage.getItem(assetKey),scansRaw:localStorage.getItem(scanKey)};const key=once?fixed:prefix+'backup:'+uuid();localStorage.setItem(key,JSON.stringify(data));return data}
function read(key){
 if(!active)return legacy(key);
 const kind=key===assetKey?'asset':'scan',s=state();
 for(const op of pending())s.entities[op.kind+':'+op.id]={kind:op.kind,id:op.id,revision:op.base+1,payload:op.payload,deleted:op.action==='delete'};
 return Object.values(s.entities).filter(e=>e.kind===kind&&!e.deleted).map(e=>({...e.payload,_syncId:e.id,_syncRevision:e.revision,_syncHash:canonical(e.payload)}));
}
async function enqueue(kind,row,action,base,id){
 const op={kind,id,action,base,payload:clean(row),operationId:uuid(),origin:device(),order:nextOrder()};
 localStorage.setItem(namespace+'op:'+op.operationId,JSON.stringify(op));
}
function nextOrder(){const n=Math.max(Date.now()*1000,Number(localStorage.getItem(namespace+'order')||0)+1);localStorage.setItem(namespace+'order',String(n));return String(n)}
function device(){let v=localStorage.getItem(prefix+'device');if(!v){v=uuid();localStorage.setItem(prefix+'device',v)}return v}
async function write(key,list){return locked(async()=>{
 if(!active){backup(true);localStorage.setItem(key,JSON.stringify(list));notify();return}
 if(!context?.canWrite)throw Error('Shared editing requires enterprise asset management permission.');
 const kind=key===assetKey?'asset':'scan',before=read(key);
 // Every item is durable individually; a quota failure never discards an earlier queued item.
 for(const row of list){if(row._syncHash===canonical(clean(row)))continue;const old=before.find(x=>row._syncId?x._syncId===row._syncId:canonical(clean(x))===canonical(clean(row)));
  if(old&&canonical(clean(old))===canonical(clean(row)))continue;
  const id=row._syncId||await hash(kind==='asset'?row.barcode.trim().toLowerCase():canonical(clean(row)));
  await enqueue(kind,row,'put',row._syncRevision||0,id);
 }

 notify();void sync();
})}
async function remove(key,row){return locked(async()=>{if(!active){backup(true);localStorage.setItem(key,JSON.stringify(legacy(key).filter(r=>r.barcode!==row.barcode)))}else{if(!context?.canWrite)throw Error('Management permission is required.');await enqueue('asset',row,'delete',row._syncRevision,row._syncId)}notify();void sync()})}
async function api(path,body){const r=await fetch('/api/quick-sync/'+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});let d;try{d=await r.json()}catch{throw Error('Shared scanner service is not configured or is unavailable.')}if(!r.ok)throw Object.assign(Error(d.message||'Shared service unavailable. Pending work is retained.'),{status:r.status});return d}
async function identity(){const c=await api('context');if(context&&(c.tenant!==context.tenant||c.userId!==context.userId)){active=false;throw Error('Account changed. Reload before synchronizing.')}return c}
async function sync(){
 if(!active||busy)return;busy=true;
 try{await locked(async()=>{
  await identity();let s=state(),page;
  do{page=await api('events?after='+s.cursor);for(const e of page.events)s.entities[e.kind+':'+e.id]=e;s.cursor=page.cursor;localStorage.setItem(namespace+'cache',JSON.stringify(s));}while(page.more);
  const blocked=new Set();
  for(const op of pending()){
   const key=op.kind+':'+op.id;if(blocked.has(key)||op.conflict){blocked.add(key);continue}
   const result=await api('mutate',Object.fromEntries(Object.entries(op).filter(([k])=>!['storageKey','order'].includes(k))));
   if(result.retry)break;
   if(result.conflict){if(result.current){s.entities[key]=result.current;localStorage.setItem(namespace+'cache',JSON.stringify(s))}localStorage.setItem(op.storageKey,JSON.stringify({...op,storageKey:undefined,conflict:result.current||{revision:0}}));blocked.add(key);continue}
   if(!result.event)throw Error('Invalid synchronization receipt. Pending work retained.');
   // Cache the receipt before retiring the operation: unknown responses safely replay the same ID.
   const e=result.event;s.entities[e.kind+':'+e.id]=e;localStorage.setItem(namespace+'cache',JSON.stringify(s));localStorage.removeItem(op.storageKey);
  }
  message=pending().length?'Pending items are retained on this browser. Review conflicts below.':'Synchronized. Updates checked every 3 seconds.';
 });}catch(e){if(e.status===401||e.status===403){active=false;context=null;migrationReady=false;}message=e.message+' Pending work and local backups are retained.'}finally{busy=false;notify()}
}
async function connect(){
 if(!navigator.locks)throw Error('Use an updated browser with Web Locks support.');
 const c=await api('context');context=c;namespace=prefix+encodeURIComponent(c.tenant)+':'+c.userId+':';
 if(!c.canWrite)message='Signed in with read access. Uploading and editing require enterprise asset management permission.';
 const choice=parse(namespace+'enabled',null);let hasLocal=true;try{hasLocal=legacy(assetKey).length+legacy(scanKey).length>0}catch{}
 active=choice===null?!hasLocal:choice;migrationReady=true;message=active?'Loading shared entries…':hasLocal?'This browser has entries that have not been uploaded.':'You are viewing entries saved in this browser.';notify();if(active)await sync();
}
async function migrate(){return locked(async()=>{
 if(!context?.canWrite)throw Error('Sign in with enterprise asset management permission first.');
 await identity();const records=legacy(assetKey),scans=legacy(scanKey);backup();
 // Write import operations before enabling, so reload/partial failure can resume idempotently.
 for(const [kind,list]of [['asset',records],['scan',scans]])for(const row of list){
  const payload=clean(row),id=await hash(kind==='asset'?String(row.barcode).trim().toLowerCase():canonical(payload));
  const operationId='import:'+await hash(device()+':'+kind+':'+canonical(payload));
  const key=namespace+'op:'+operationId;
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({kind,id,base:0,action:'import',payload,operationId,origin:device(),order:new Date().toISOString()+':'+operationId}));
 }
 localStorage.setItem(namespace+'enabled','true');active=true;message='Upload queued. Original browser data is retained.';notify();
})}
let panel=null,lastDraw='';
function download(body,name,type='application/json'){const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csv(list){const cols=[...new Set(list.flatMap(r=>Object.keys(r)))],cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,s=>"'"+s).replaceAll('"','""')+'"';return '\ufeff'+[cols,...list.map(r=>cols.map(k=>r[k]))].map(r=>r.map(cell).join(',')).join('\r\n')}
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function button(label,fn,primary=false){const b=element('button',primary?'primary':'',label);b.type='button';b.dataset.syncAction=label;b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){message=e.message}finally{b.disabled=false;draw()}};return b}
function backupDownload(){download(JSON.stringify({version:1,recordsRaw:localStorage.getItem(assetKey),scansRaw:localStorage.getItem(scanKey),sync:keys().filter(k=>k.startsWith(prefix+'backup:')||(namespace&&k.startsWith(namespace))).map(k=>[k,localStorage.getItem(k)])},null,2),'jmdm-original-and-sync-backup.json');sessionStorage.setItem(prefix+'backup-downloaded','yes');message='Backup download started. Keep this file before uploading.';}
async function viewShared(){localStorage.setItem(namespace+'enabled','true');active=true;notify();await sync()}
function draw(){
 if(!panel)return;
 let localCount=0,unreadable=false;try{localCount=legacy(assetKey).length+legacy(scanKey).length}catch{unreadable=true}
 const queue=namespace?pending():[],conflicts=queue.filter(o=>o.conflict);
 const signature=JSON.stringify({active,message,context,localCount,unreadable,queue});if(signature===lastDraw)return;lastDraw=signature;
 const focused=document.activeElement?.dataset?.syncAction,opened=new Set(Array.from(panel.querySelectorAll('details[open]')).map(d=>d.dataset.section));
 panel.replaceChildren();
 const top=element('div','sync-top'),copy=element('div'),title=element('div','sync-title');title.append(element('h2','','Entry workspace'),element('span','sync-badge'+(active?' shared':''),active?'Shared entries':'This browser'));
 copy.append(title,element('p','sync-subtitle',active?'Entries from all authorized devices · '+(queue.length?queue.length+' pending':'Connected'):localCount?localCount+' local entries · back up and upload to share them':context?'Local workspace selected':'Sign in to see entries uploaded from your other devices.'));
 const actions=element('div','sync-actions');
 if(!context){const link=element('a','button primary','Sign in for shared entries');link.href='/admin/login?returnTo='+encodeURIComponent(location.pathname);actions.append(link,button('Check sign-in',connect));}
 else if(active)actions.append(button('Refresh shared entries',sync));
 else actions.append(button('View shared entries',viewShared,true));
 top.append(copy,actions);panel.append(top);
 const status=element('p','sync-status',message);status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
 const tools=element('details');tools.dataset.section='backup';tools.open=opened.has('backup');tools.append(element('summary','',unreadable?'Local data needs review · download a raw backup':localCount?'Back up & upload this browser’s '+localCount+' entries':'Backups & workspace options'));
 const help=element('div','sync-help');help.append(element('p','','Entries on another device cannot be retrieved remotely. Open this screen in the original browser, download its backup, then upload. Original local records are retained. JSON includes the raw original data and pending changes.'));
 const backups=element('div','backup-actions');backups.append(button('Download JSON backup',backupDownload),button('Assets CSV',()=>download(csv(legacy(assetKey)),'jmdm-original-assets.csv','text/csv')),button('Scans CSV',()=>download(csv(legacy(scanKey)),'jmdm-original-scans.csv','text/csv')));
 if(context?.canWrite&&localCount)backups.append(button('Upload this browser’s entries',async()=>{if(sessionStorage.getItem(prefix+'backup-downloaded')!=='yes')throw Error('Download the JSON backup first. Then upload this browser’s entries.');await migrate();await sync()},true));
 if(active)backups.append(button('Use this browser’s entries',()=>{localStorage.setItem(namespace+'enabled','false');active=false;message='Local workspace selected. Shared entries and pending changes are retained.';notify()}));
 if(context&&!context.canWrite)help.append(element('p','','Your account can view shared entries. Editing or uploading requires asset management access.'));
 help.append(backups);tools.append(help);panel.append(tools);
 for(const op of conflicts){const box=element('details','sync-conflict');box.dataset.section=op.operationId;box.open=opened.has(op.operationId);box.append(element('summary','','Review conflict · '+op.payload.barcode));const text=element('pre','',JSON.stringify({yourPendingVersion:op.payload,sharedVersion:op.conflict.payload,sharedDeleted:op.conflict.deleted},null,2));const choices=element('div','backup-actions');choices.append(button('Keep shared version',()=>resolve(op.operationId,false)),button('Apply my reviewed version',()=>resolve(op.operationId,true)));box.append(text,choices);panel.append(box)}
 if(focused)Array.from(panel.querySelectorAll('[data-sync-action]')).find(b=>b.dataset.syncAction===focused)?.focus({preventScroll:true});
}
async function resolve(operationId,apply){await locked(async()=>{
 const op=pending().find(p=>p.operationId===operationId);if(!op?.conflict)throw Error('Conflict changed. Review the latest pending item.');
 await identity();const archive=namespace+'resolved:'+uuid();const related=pending().filter(p=>p.kind===op.kind&&p.id===op.id);localStorage.setItem(archive,JSON.stringify(related));
 // Refresh before selecting a new base. Another edit still produces a conflict, never an overwrite.
 if(apply)await enqueue(op.kind,op.payload,op.action==='delete'?'delete':'put',op.conflict.revision,op.id)
 for(const item of related)localStorage.removeItem(item.storageKey);
});notify();await sync()}
window.QuickStore={read,write,remove,resolve,connect,migrate,sync,backup,canonical,hash,get active(){return active},get canWrite(){return !active||!!context?.canWrite}};
window.addEventListener('storage',()=>notify());window.addEventListener('online',()=>void sync());window.addEventListener('focus',()=>{if(!context)connect().catch(()=>{})});
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{panel=document.createElement('section');panel.className='sync-panel';panel.setAttribute('aria-label','Global synchronization and backup');const host=document.querySelector('main')||document.querySelector('.container')||document.body;const heading=host.querySelector('.pagehead');if(heading)heading.after(panel);else host.prepend(panel);draw();connect().catch(e=>{message=e.status===401?'Local scanning is ready. Sign in to see shared entries.':e.message+' Local entries are retained.';draw()});setInterval(()=>void sync(),3000)});
})();
