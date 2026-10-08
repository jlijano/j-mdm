import {rows,one,query,insert,audit,allowed,enterprise,visibleAsset,fail} from './data.js';
import {now,digest,random} from './security.js';

const DOC_TYPES=new Set(['ASSET_PHOTO','BARCODE_PHOTO','ASSET_TAG_PHOTO','SERIAL_LABEL_PHOTO','MANUFACTURER_LABEL_PHOTO','RECEIVING_PHOTO','DAMAGE_PHOTO','INVENTORY_PHOTO','TRANSFER_PHOTO','RETURN_PHOTO','DISPOSAL_PHOTO','PURCHASE_REQUEST','QUOTATION','PURCHASE_ORDER','DELIVERY_RECEIPT','INVOICE','ASSIGNMENT_FORM','RETURN_FORM','TRANSFER_FORM','GATE_PASS','WARRANTY_DOCUMENT','REPAIR_QUOTATION','REPAIR_INVOICE','REPAIR_REPORT','DATA_WIPE_CERTIFICATE','DISPOSAL_CERTIFICATE','OTHER']);
const PHOTO_TYPES=new Set(['FRONT','BACK','LEFT','RIGHT','TOP','BOTTOM','SERIAL_LABEL','MANUFACTURER_LABEL','BARCODE','ASSET_TAG','PACKAGING','RECEIVING','ASSIGNMENT','RETURN','DAMAGE','REPAIR_BEFORE','REPAIR_AFTER','INVENTORY','TRANSFER','DISPOSAL','OTHER']);
const FINANCIAL_DOCS=new Set(['PURCHASE_ORDER','INVOICE','REPAIR_INVOICE']);
const cleanText=(v,n=1000)=>v==null?null:String(v).trim().slice(0,n)||null;
const num=v=>v==null||v===''?null:Number(v);
async function base(db,u,id){
 const a=await visibleAsset(db,u,id);
 return one(db,`SELECT a.asset_id,a.asset_tag,a.barcode,a.serial_number,a.description,a.created_at,a.updated_at,
  m.manufacturer_name,am.model_name,am.model_number,c.category_name,t.type_name,cl.class_name,
  s.status_name,co.condition_name,l.location_name
  FROM assets a
  LEFT JOIN manufacturers m ON m.manufacturer_id=a.manufacturer_id
  LEFT JOIN asset_models am ON am.model_id=a.model_id
  JOIN asset_categories c ON c.category_id=a.category_id JOIN asset_types t ON t.asset_type_id=a.asset_type_id
  JOIN asset_classes cl ON cl.asset_class_id=a.asset_class_id JOIN asset_statuses s ON s.status_id=a.status_id
  JOIN asset_conditions co ON co.condition_id=a.condition_id LEFT JOIN locations l ON l.location_id=a.current_location_id
  WHERE a.asset_id=?`,id);
}
async function assignment(db,id){
 return one(db,`SELECT aa.assignment_id,aa.employee_id,aa.assigned_date,aa.expected_return_date,aa.assignment_status,
 e.employee_number,e.first_name,e.last_name,d.department_name,l.location_name,
 (SELECT ef.file_id FROM employee_files ef WHERE ef.employee_id=e.employee_id AND ef.document_type='PROFILE_PHOTO' AND ef.is_active=1 ORDER BY ef.employee_file_id DESC LIMIT 1) profile_file_id
 FROM asset_assignments aa JOIN employees e ON e.employee_id=aa.employee_id
 LEFT JOIN departments d ON d.department_id=aa.department_id LEFT JOIN locations l ON l.location_id=aa.location_id
 WHERE aa.asset_id=? AND aa.assignment_status='ACTIVE' ORDER BY aa.assignment_id DESC LIMIT 1`,id);
}
async function section(db,u,id,name){
 const finance=allowed(u,'finance');
 if(name==='photos'||name==='documents'){
  if(!allowed(u,'files'))fail('File permission is required.',403);
  const photo=name==='photos';
  let list=await rows(db,`SELECT af.asset_file_id,af.file_id,af.document_type,af.evidence_type,af.caption,af.description,af.lifecycle_stage,af.captured_at,af.evidence_status,
   f.original_filename,f.mime_type,f.file_size,f.uploaded_at,u.username uploaded_by_name,co.condition_name,l.location_name
   FROM asset_files af JOIN files f ON f.file_id=af.file_id LEFT JOIN users u ON u.user_id=f.uploaded_by
   LEFT JOIN asset_conditions co ON co.condition_id=af.condition_id LEFT JOIN locations l ON l.location_id=af.location_id
   WHERE af.asset_id=? AND af.evidence_status<>'VOIDED' ORDER BY COALESCE(af.captured_at,f.uploaded_at) DESC LIMIT 100`,id);
  list=list.filter(x=>photo?(x.document_type.endsWith('_PHOTO')||x.document_type==='ASSET_PHOTO'):!(x.document_type.endsWith('_PHOTO')||x.document_type==='ASSET_PHOTO'));
  if(!finance)list=list.filter(x=>!FINANCIAL_DOCS.has(x.document_type));
  return{rows:list};
 }
 if(name==='assignment')return{current:await assignment(db,id),history:await rows(db,`SELECT aa.assignment_id,aa.assigned_date,aa.expected_return_date,aa.returned_date,aa.assignment_status,aa.assignment_notes,e.employee_number,e.first_name,e.last_name,d.department_name,l.location_name FROM asset_assignments aa JOIN employees e ON e.employee_id=aa.employee_id LEFT JOIN departments d ON d.department_id=aa.department_id LEFT JOIN locations l ON l.location_id=aa.location_id WHERE aa.asset_id=? ORDER BY aa.assigned_date DESC LIMIT 100`,id)};
 if(name==='technical')return{row:await one(db,'SELECT * FROM asset_technical_details WHERE asset_id=?',id)};
 if(name==='financial'){if(!finance)fail('Financial permission is required.',403);return{row:await one(db,`SELECT af.*,v.vendor_name,po.po_number,i.invoice_number FROM asset_financials af LEFT JOIN vendors v ON v.vendor_id=af.vendor_id LEFT JOIN purchase_orders po ON po.purchase_order_id=af.purchase_order_id LEFT JOIN invoices i ON i.invoice_id=af.invoice_id WHERE af.asset_id=?`,id),depreciation:await rows(db,'SELECT * FROM asset_depreciation WHERE asset_id=? ORDER BY period_end DESC LIMIT 100',id)};}
 if(name==='procurement'){
  if(!allowed(u,'procurement')&&!finance)fail('Procurement permission is required.',403);
  const fin=await one(db,'SELECT vendor_id,purchase_order_id,invoice_id FROM asset_financials WHERE asset_id=?',id);
  const po=fin?.purchase_order_id?await one(db,`SELECT po.*,v.vendor_name FROM purchase_orders po LEFT JOIN vendors v ON v.vendor_id=po.vendor_id WHERE po.purchase_order_id=?`,fin.purchase_order_id):null;
  const invoice=fin?.invoice_id?await one(db,`SELECT i.*,v.vendor_name FROM invoices i LEFT JOIN vendors v ON v.vendor_id=i.vendor_id WHERE i.invoice_id=?`,fin.invoice_id):null;
  const dr=await one(db,`SELECT dr.*,v.vendor_name,l.location_name FROM delivery_receipt_lines dl JOIN delivery_receipts dr ON dr.delivery_receipt_id=dl.delivery_receipt_id LEFT JOIN vendors v ON v.vendor_id=dr.vendor_id LEFT JOIN locations l ON l.location_id=dr.receiving_location_id WHERE dl.asset_id=? ORDER BY dr.delivery_receipt_id DESC LIMIT 1`,id);
  if(!finance){if(po){delete po.total_amount;}if(invoice){delete invoice.amount;}}
  return{purchase_order:po,delivery_receipt:dr,invoice:invoice,reconciliation:{po_found:!!po,dr_found:!!dr,invoice_found:!!invoice,serial_recorded:!!(await one(db,'SELECT serial_number FROM assets WHERE asset_id=? AND serial_number IS NOT NULL',id)),cost_matched:null}};
 }
 const map={warranty:['asset_warranties','warranty_id'],inventory:['inventory_scan_results','scanned_at'],movements:['asset_movements','movement_date'],condition:['asset_condition_history','inspection_date'],repairs:['asset_repairs','opened_at'],lifecycle:['asset_lifecycle','updated_at'],refresh:['asset_refreshes','recommended_date'],security:['gate_pass_assets','gate_pass_id'],scans:['barcode_scan_logs','scan_timestamp'],barcodes:['barcode_history','date_applied'],disposal:['asset_disposals','disposal_id']};
 if(map[name]){
  const [table,order]=map[name];
  if(name==='security')return{rows:await rows(db,`SELECT gp.* FROM gate_pass_assets ga JOIN gate_passes gp ON gp.gate_pass_id=ga.gate_pass_id WHERE ga.asset_id=? ORDER BY gp.created_at DESC LIMIT 100`,id)};
  if(name==='inventory')return{rows:await rows(db,`SELECT r.*,s.session_name,el.location_name expected_location,al.location_name actual_location FROM inventory_scan_results r JOIN inventory_sessions s ON s.inventory_session_id=r.inventory_session_id LEFT JOIN locations el ON el.location_id=r.expected_location_id LEFT JOIN locations al ON al.location_id=r.actual_location_id WHERE r.asset_id=? ORDER BY r.scanned_at DESC LIMIT 100`,id)};
  return{rows:await rows(db,`SELECT * FROM ${table} WHERE asset_id=? ORDER BY ${order} DESC LIMIT 100`,id)};
 }
 if(name==='audit'){
  if(!allowed(u,'audit'))fail('Audit permission is required.',403);
  return{rows:await rows(db,`SELECT al.audit_id,al.event_timestamp,al.action,al.module,al.old_values,al.new_values,u.username actor FROM audit_logs al LEFT JOIN users u ON u.user_id=al.user_id WHERE (al.table_name='assets' AND al.record_id=?) OR (al.new_values LIKE ?) ORDER BY al.audit_id DESC LIMIT 100`,String(id),'%"asset_id":'+id+'%')};
 }
 fail('Unknown Asset 360 section.',404);
}
async function timeline(db,u,id){
 const out=[];
 const add=(list,type,date,title,detail)=>list.forEach(x=>out.push({type,date:x[date],title:title(x),detail:detail(x)}));
 add(await rows(db,'SELECT assigned_date,returned_date,assignment_status,employee_id FROM asset_assignments WHERE asset_id=? ORDER BY assigned_date DESC LIMIT 50',id),'ASSIGNMENT','assigned_date',x=>x.assignment_status==='ACTIVE'?'ASSIGNED':'ASSIGNMENT',x=>'Employee #'+x.employee_id);
 add(await rows(db,'SELECT movement_date,movement_status,reference_number FROM asset_movements WHERE asset_id=? ORDER BY movement_date DESC LIMIT 50',id),'MOVEMENT','movement_date',x=>'MOVED · '+x.movement_status,x=>x.reference_number||'');
 add(await rows(db,'SELECT inspection_date,event_type,condition_id,damage_description FROM asset_condition_history WHERE asset_id=? ORDER BY inspection_date DESC LIMIT 50',id),'CONDITION','inspection_date',x=>x.event_type||'CONDITION INSPECTION',x=>x.damage_description||'');
 add(await rows(db,'SELECT opened_at,repair_status,issue_description FROM asset_repairs WHERE asset_id=? ORDER BY opened_at DESC LIMIT 50',id),'REPAIR','opened_at',x=>'REPAIR · '+x.repair_status,x=>x.issue_description||'');
 add(await rows(db,'SELECT scan_timestamp,result,barcode FROM barcode_scan_logs WHERE asset_id=? ORDER BY scan_timestamp DESC LIMIT 50',id),'SCAN','scan_timestamp',x=>'SCAN · '+x.result,x=>x.barcode);
 add(await rows(db,'SELECT date_applied,status,barcode_value,replacement_reason FROM barcode_history WHERE asset_id=? ORDER BY date_applied DESC LIMIT 50',id),'BARCODE','date_applied',x=>'BARCODE · '+x.status,x=>x.barcode_value+(x.replacement_reason?' · '+x.replacement_reason:''));
 add(await rows(db,'SELECT disposal_date,status,notes FROM asset_disposals WHERE asset_id=? ORDER BY disposal_id DESC LIMIT 20',id),'DISPOSAL','disposal_date',x=>'DISPOSAL · '+x.status,x=>x.notes||'');
 if(allowed(u,'files'))add(await rows(db,`SELECT f.uploaded_at,af.document_type,f.original_filename FROM asset_files af JOIN files f ON f.file_id=af.file_id WHERE af.asset_id=? AND af.evidence_status<>'VOIDED' ORDER BY f.uploaded_at DESC LIMIT 50`,id),'EVIDENCE','uploaded_at',x=>x.document_type,x=>x.original_filename);
 return{rows:out.filter(x=>x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,150)};
}
async function upload(req,db,u,id,d,env){
 if(!allowed(u,'files',true))fail('Upload permission required.',403);await visibleAsset(db,u,id,true);if(!env.BUCKET)fail('File storage unavailable.',503);
 const type=cleanText(d.document_type,60);if(!DOC_TYPES.has(type))fail('Choose a valid document type.');
 const evidence=cleanText(d.evidence_type,60);if(evidence&&!PHOTO_TYPES.has(evidence))fail('Choose a valid evidence type.');
 let bytes;try{bytes=Uint8Array.from(atob(d.base64),c=>c.charCodeAt(0));}catch{fail('Invalid upload.');}
 if(!bytes.length||bytes.length>10*1024*1024)fail('Files must be between 1 byte and 10 MB.');
 const declared=cleanText(d.mime_type,150)||'application/octet-stream';const image=declared.startsWith('image/');
 const sig=[...bytes.slice(0,12)];const validImage=!image||((sig[0]===255&&sig[1]===216&&sig[2]===255)||(sig[0]===137&&sig[1]===80&&sig[2]===78&&sig[3]===71)||(sig[0]===82&&sig[1]===73&&sig[2]===70&&sig[3]===70)||(sig[0]===71&&sig[1]===73&&sig[2]===70));
 if(!validImage)fail('The uploaded image content does not match its declared type.');
 const filename=cleanText(d.filename,255)||'file',storage=random();await env.BUCKET.put(storage,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
 try{
  const fileStmt=insert(db,'files',{original_filename:filename,stored_filename:storage,storage_path:storage,mime_type:declared,file_size:bytes.length,checksum:await digest(d.base64),uploaded_by:u.user_id});
  await fileStmt.run();const file=await one(db,'SELECT file_id FROM files WHERE stored_filename=?',storage);
  await db.batch([insert(db,'asset_files',{asset_id:id,file_id:file.file_id,document_type:type,description:cleanText(d.description),evidence_type:evidence,caption:cleanText(d.caption,500),condition_id:num(d.condition_id),lifecycle_stage:cleanText(d.lifecycle_stage,60),captured_at:cleanText(d.captured_at,40),location_id:num(d.location_id),related_assignment_id:num(d.related_assignment_id),related_repair_id:num(d.related_repair_id),related_inventory_session_id:num(d.related_inventory_session_id),related_movement_id:num(d.related_movement_id),related_disposal_id:num(d.related_disposal_id),evidence_status:'ACTIVE'}),audit(db,u,'asset_files',null,'EVIDENCE_UPLOADED',null,{asset_id:id,file_id:file.file_id,document_type:type,evidence_type:evidence},req)]);
  return{ok:true,file_id:file.file_id};
 }catch(e){await env.BUCKET.delete(storage);throw e;}
}
export async function asset360API(req,db,u,path,d,env){
 if(path==='/api/locations/smart'){
  if(req.method!=='POST')fail('Method not allowed.',405);if(!allowed(u,'organization',true)&&!allowed(u,'assets',true))fail('Location management permission required.',403);
  const name=cleanText(d.location_name,255);if(!name)fail('Enter a location.');const normalized=name.toLowerCase().replace(/\s+/g,' ').trim();
  let existing=await one(db,`SELECT * FROM locations WHERE lower(trim(replace(replace(location_name,'  ',' '),'  ',' ')))=? LIMIT 1`,normalized);if(existing)return{location:existing,created:false};
  if(!enterprise(u,true))fail('Enterprise management scope is required to create a new location.',403);
  const lt=await one(db,`SELECT location_type_id FROM location_types ORDER BY location_type_id LIMIT 1`);if(!lt)fail('Configure a location type first.');
  await insert(db,'locations',{location_type_id:lt.location_type_id,location_name:name,building:cleanText(d.building,100),floor:cleanText(d.floor,100),room_area:cleanText(d.room_area,100),city:cleanText(d.city,100),province:cleanText(d.province,100),country:cleanText(d.country,100),is_active:1}).run();
  existing=await one(db,'SELECT * FROM locations WHERE location_id=last_insert_rowid()');return{location:existing,created:true};
 }
 const m=/^\/api\/assets\/(\d+)\/360(?:\/([a-z-]+))?$/.exec(path);if(!m)fail('Not found.',404);const id=Number(m[1]);await visibleAsset(db,u,id,req.method!=='GET');
 const part=m[2];
 if(!part&&req.method==='GET'){const a=await base(db,u,id),current=await assignment(db,id);return{asset:a,current_assignment:current,permissions:{finance:allowed(u,'finance'),procurement:allowed(u,'procurement'),files:allowed(u,'files'),audit:allowed(u,'audit'),manage_evidence:allowed(u,'files',true)},completeness:null};}
 if(part==='timeline'&&req.method==='GET')return timeline(db,u,id);
 if(part==='evidence'&&req.method==='POST')return upload(req,db,u,id,d,env);
 if(part==='condition'&&req.method==='POST'){
  if(!allowed(u,'assets',true))fail('Asset management permission required.',403);const condition=num(d.condition_id);if(!condition||!await one(db,'SELECT condition_id FROM asset_conditions WHERE condition_id=?',condition))fail('Choose a valid condition.');
  await db.batch([insert(db,'asset_condition_history',{asset_id:id,inspection_date:cleanText(d.inspection_date,40)||now(),condition_id:condition,cosmetic_condition:cleanText(d.cosmetic_condition),functional_condition:cleanText(d.functional_condition),damage_description:cleanText(d.damage_description),missing_components:cleanText(d.missing_components),inspector_user_id:u.user_id,location_id:num(d.location_id),event_type:cleanText(d.event_type,60),notes:cleanText(d.notes)}),query(db,'UPDATE assets SET condition_id=?,updated_at=?,updated_by=?,revision=revision+1 WHERE asset_id=?',condition,now(),u.user_id,id),audit(db,u,'asset_condition_history',null,'CONDITION_RECORDED',null,{asset_id:id,condition_id:condition,event_type:d.event_type||null},req)]);return{ok:true};
 }
 if(part==='barcode'&&req.method==='POST'){
  if(!allowed(u,'barcode',true)&&!allowed(u,'assets',true))fail('Barcode management permission required.',403);const value=cleanText(d.new_barcode,255);if(!value)fail('Enter the replacement barcode.');const a=await visibleAsset(db,u,id,true);if(await one(db,'SELECT asset_id FROM assets WHERE barcode=? AND asset_id<>?',value,id))fail('Barcode is already assigned.',409);
  await db.batch([insert(db,'barcode_history',{asset_id:id,barcode_value:value,status:'ACTIVE',date_applied:cleanText(d.date_applied,40)||now(),replacement_reason:cleanText(d.replacement_reason),replaced_by:u.user_id,previous_barcode:a.barcode,new_barcode:value,barcode_file_id:num(d.barcode_file_id)}),query(db,'UPDATE barcode_history SET status=\'REPLACED\',date_replaced=? WHERE asset_id=? AND status=\'ACTIVE\' AND barcode_history_id<>last_insert_rowid()',now(),id),query(db,'UPDATE assets SET barcode=?,updated_at=?,updated_by=?,revision=revision+1 WHERE asset_id=?',value,now(),u.user_id,id),audit(db,u,'barcode_history',null,'BARCODE_REPLACED',{barcode:a.barcode},{asset_id:id,barcode:value,reason:d.replacement_reason||null},req)]);return{ok:true};
 }
 if(req.method==='GET')return section(db,u,id,part);
 fail('Method not allowed.',405);
}
