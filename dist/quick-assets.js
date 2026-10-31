(()=>{'use strict';
const $=id=>document.getElementById(id);
const assetKey='jmdm-quick-records-v1',scanKey='jmdm-quick-scans-v1';
let assets=[],scans=[],tab='assets',tabChosen=false,editOriginal='',editBase=null,noticeTimer;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'' :'&#39;'}[c]));
function load(key){return QuickStore.read(key)}
async function persist(){await QuickStore.write(assetKey,assets)}
function report(message){clearTimeout(noticeTimer);$('notice').textContent=message;$('notice').hidden=false;noticeTimer=setTimeout(()=>$('notice').hidden=true,5000)}
function scanRecords(){const saved=new Map(assets.map(a=>[String(a.barcode).toLowerCase(),a]));return scans.map(s=>({...s,asset:saved.get(String(s.barcode).toLowerCase())||null}))}
function refreshFilters(){const old=$('location-filter').value;const locations=[...new Set(assets.map(a=>a.location).filter(Boolean))].sort();$('location-filter').innerHTML='<option value="">All locations</option>'+locations.map(l=>'<option value="'+safe(l)+'">'+safe(l)+'</option>').join('');$('location-filter').value=locations.includes(old)?old:''}
function render(){
 assets=load(assetKey);scans=load(scanKey);if(!tabChosen)tab=assets.length?'assets':scans.length?'scans':'assets';
 $('new-asset').disabled=!QuickStore.canWrite;if($('data-scope-label'))$('data-scope-label').textContent=QuickStore.active?'Shared entries across authorized devices':'Entries saved in this browser';
 $('saved-count').textContent=assets.length;$('scan-count').textContent=scans.length;
 const known=new Set(assets.map(a=>String(a.barcode).toLowerCase()));
 $('pending-count').textContent=new Set(scans.filter(s=>!known.has(String(s.barcode).toLowerCase())).map(s=>String(s.barcode).toLowerCase())).size;
 $('wah-count').textContent=assets.filter(a=>a.work==='WAH').length;
 refreshFilters();
 $('tab-scans').setAttribute('aria-selected',String(tab==='scans'));$('tab-assets').setAttribute('aria-selected',String(tab==='assets'));
 $('export-active').textContent=tab==='scans'?'Export Scans CSV':'Export Assets CSV';
 $('table-head').innerHTML=tab==='scans'?'<tr><th>Identifier</th><th>Detected</th><th>Source</th><th>Type</th><th>Registration</th><th>Action</th></tr>':'<tr><th>Identifier</th><th>Type</th><th>Location</th><th>Work</th><th>Status</th><th>Assigned To</th><th>Action</th></tr>';
 const text=$('search').value.toLowerCase().trim(),location=$('location-filter').value,work=$('work-filter').value;
 let rows=tab==='scans'?scanRecords():assets;
 rows=rows.filter(row=>{
  const a=row.asset||row;
  if(location&&a.location!==location)return false;
  if(work&&a.work!==work)return false;
  return !text||[row.barcode,row.format,row.source,a.type,a.location,a.work,a.status,a.assignee,a.notes].some(v=>String(v||'').toLowerCase().includes(text))
 });
 const cells=tab==='scans'?rows.map(s=>'<tr><td class="identifier">'+safe(s.barcode)+'</td><td class="small">'+safe(new Date(s.at).toLocaleString())+'</td><td>'+safe(s.source||'camera')+'</td><td>'+safe(s.asset?.type||'—')+'</td><td><span class="tag '+(s.asset?'saved':'pending')+'">'+(s.asset?'Saved':'Not saved')+'</span></td><td class="actions"><button data-action="edit" data-id="'+encodeURIComponent(s.barcode)+'">'+(s.asset?(QuickStore.canWrite?'View / Edit':'View'):'Add Asset')+'</button></td></tr>'):rows.map(a=>'<tr><td class="identifier">'+safe(a.barcode)+'</td><td>'+safe(a.type)+'</td><td>'+safe(a.location||'—')+'</td><td>'+safe(a.work)+'</td><td>'+safe(a.status)+'</td><td>'+safe(a.assignee||'—')+'</td><td class="actions"><button data-action="edit" data-id="'+encodeURIComponent(a.barcode)+'">Edit</button><button class="danger" data-action="delete" data-id="'+encodeURIComponent(a.barcode)+'">Delete</button></td></tr>');
 $('table-body').innerHTML=cells.join('');$('empty').hidden=rows.length>0;const empty=$('empty');empty.querySelector('strong').textContent=text||location||work?'No matching entries':QuickStore.active?'No shared '+(tab==='assets'?'assets':'scans')+' yet':'No entries in this browser';empty.querySelector('span').textContent=text||location||work?'Try a different search or clear the filters.':QuickStore.active?'Upload from the original browser, or scan and add an asset.':'Sign in to view entries uploaded from your other devices.';$('showing').textContent='Showing '+rows.length+' '+(tab==='scans'?'scans':'assets');
}
function openDialog(barcode=''){assets=load(assetKey);const record=assets.find(a=>String(a.barcode).toLowerCase()===String(barcode).toLowerCase());editOriginal=record?.barcode||'';editBase=record||null;const row=record||{barcode,type:'Desktop',work:'B&M',status:'Available'};for(const k of ['barcode','type','work','location','status','assignee','notes'])$('f-'+k).value=row[k]||'';for(const k of ['barcode','type','work','location','status','assignee','notes']){const field=$('f-'+k);if(field.tagName==='SELECT')field.disabled=!QuickStore.canWrite;else field.readOnly=!QuickStore.canWrite} $('f-barcode').readOnly=!QuickStore.canWrite||(QuickStore.active&&!!record);$('save-asset').disabled=!QuickStore.canWrite;$('delete-in-modal').disabled=!QuickStore.canWrite;$('dialog-title').textContent=record?'Edit Asset':'New Asset';$('delete-in-modal').hidden=!record;$('asset-dialog').showModal()}
async function deleteAsset(barcode){const removed=$('asset-dialog').open&&editOriginal===barcode?editBase:assets.find(a=>a.barcode===barcode);if(!removed)return;if(!confirm('Delete asset '+barcode+'? Scan history will be retained.'))return;try{await QuickStore.remove(assetKey,removed);render();report('Asset deleted.')}catch{report('Storage failed; asset was not deleted.')}if($('asset-dialog').open)$('asset-dialog').close()}
$('new-asset').onclick=()=>openDialog();$('close-dialog').onclick=()=>$('asset-dialog').close();$('cancel-dialog').onclick=()=>$('asset-dialog').close();$('delete-in-modal').onclick=()=>deleteAsset(editOriginal);
$('asset-form').onsubmit=async e=>{e.preventDefault();const a={...editBase};for(const k of ['barcode','type','work','location','status','assignee','notes'])a[k]=$('f-'+k).value.trim();if(!a.barcode){report('Barcode is required.');return;}a.updatedAt=new Date().toISOString();const before=load(assetKey);const duplicate=before.find(x=>x.barcode.toLowerCase()===a.barcode.toLowerCase()&&x.barcode!==editOriginal);if(duplicate){report('Identifier already exists.');return;}const idx=before.findIndex(x=>x.barcode===editOriginal);if(idx>=0)before[idx]={...before[idx],...a};else before.unshift(a);try{await QuickStore.write(assetKey,before);$('asset-dialog').close();render();report('Asset saved.')}catch{report('Unable to save asset. Check storage, connection, and account access.')}};
$('table-body').onclick=e=>{const b=e.target.closest('[data-action]');if(!b)return;const value=decodeURIComponent(b.dataset.id);if(b.dataset.action==='delete')deleteAsset(value);else openDialog(value)};
$('tab-scans').onclick=()=>{tabChosen=true;tab='scans';render()};$('tab-assets').onclick=()=>{tabChosen=true;tab='assets';render()};
$('search').oninput=render;$('location-filter').onchange=render;$('work-filter').onchange=render;
const csv=v=>{const t=String(v??'');return '"'+(/^[=+\-@\t\r]/.test(t)?"'"+t:t).replaceAll('"','""')+'"'};
function exportCSV(kind){const records=kind==='scans'?scans:assets;const cols=kind==='scans'?['barcode','format','source','at','ocr']:['barcode','type','work','location','status','assignee','notes','updatedAt'];const body='\ufeff'+[cols,...records.map(r=>cols.map(k=>r[k]??''))].map(r=>r.map(csv).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([body],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='jmdm-'+kind+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('export-active').onclick=()=>{assets=load(assetKey);scans=load(scanKey);exportCSV(tab)};
$('export-both').onclick=()=>{assets=load(assetKey);scans=load(scanKey);exportCSV('scans');exportCSV('assets')};
window.addEventListener('quick-store-change',render);
window.addEventListener('storage',e=>{if(e.key===assetKey||e.key===scanKey)render()});render();
})();