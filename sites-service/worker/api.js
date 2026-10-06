import Decimal from 'decimal.js';
import {metadata,query,one,rows,insert,audit,pk,readonly,moduleFor,allowed,enterprise,scopeSQL,visibleAsset,fail,guard} from './data.js';
import {now,passwordHash} from './security.js';
const serverFields=new Set(['created_at','updated_at','created_by','updated_by','uploaded_at','uploaded_by']);
export function clean(table,input,creating,user){
 const out={};for(const [key,value] of Object.entries(input)){
  const c=metadata[table]?.find(c=>c.name===key);if(!c||serverFields.has(key)||key==='password_hash'||key==='last_login_at'||key==='failed_login_count'||key==='locked_until')continue;
  if(c.key==='PK')continue;
  if(value===null||value===''){if(c.null==='NO')fail(`${key.replaceAll('_',' ')} is required.`);out[key]=null;continue;}
  if(c.type==='BOOLEAN'){if(![true,false,0,1,'0','1'].includes(value))fail(`Invalid ${key}.`);out[key]=Number(value);}
  else if(['INT','BIGINT'].includes(c.type)){if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value)))fail(`Invalid ${key}.`);out[key]=Number(value);}
  else if(c.type.startsWith('DECIMAL')){const [p,s]=c.type.match(/\d+/g).map(Number);let d;try{d=new Decimal(value);}catch{fail(`Invalid ${key}.`);}if(!d.isFinite()||d.isNegative()||d.decimalPlaces()>s||d.gte(new Decimal(10).pow(p-s)))fail(`Invalid ${key} precision.`);out[key]=d.toFixed(s);if(key==='quantity')out[key]=d.toString();}
  else if(c.type==='JSON'){try{const v=typeof value==='string'?JSON.parse(value):value;out[key]=JSON.stringify(v);}catch{fail(`Invalid ${key} JSON.`);}}
  else {if(typeof value!=='string')fail(`Invalid ${key}.`);const max=Number(c.type.match(/\d+/)?.[0]||10000);if(value.length>max)fail(`${key} is too long.`);if(c.type==='DATE'&&!/^\d{4}-\d{2}-\d{2}$/.test(value))fail(`Invalid ${key} date.`);if(c.type==='DATETIME'&&!Number.isFinite(Date.parse(value)))fail(`Invalid ${key} timestamp.`);out[key]=c.type==='DATETIME'?new Date(value).toISOString():value;}
 }
 for(const c of metadata[table]){if(c.name==='created_by'&&creating)out[c.name]=user.user_id;if(c.name==='updated_by')out[c.name]=user.user_id;if(c.name==='updated_at')out[c.name]=now();}
 if(table==='assets'){
  if(creating){out.quantity??='1';out.is_serialized??=1;}
  if(out.is_serialized===1&&out.quantity&&out.quantity!=='1')fail('Serialized assets must have quantity 1.');
  if(out.quantity==='0')fail('Quantity must be greater than zero.');
 }
 if(table==='user_scopes'){if(out.scope_type&&!['ENTERPRISE','BUSINESS_UNIT','SITE','DEPARTMENT','COST_CENTER','SELF'].includes(out.scope_type))fail('TEAM scopes need a team model, which is not defined in this document.');if(out.access_level&&!['VIEW','MANAGE'].includes(out.access_level))fail('Invalid access level.');}
 if(table==='users'&&out.mfa_enabled)fail('MFA enrollment is not implemented; it cannot be enabled.');
 return out;
}
async function assertClassifications(db,d){if(d.asset_type_id&&d.category_id){const t=await one(db,'SELECT category_id FROM asset_types WHERE asset_type_id=? AND is_active=1',d.asset_type_id);if(!t||t.category_id!==d.category_id)fail('The asset type must belong to the selected category.');}if(d.model_id){const m=await one(db,'SELECT * FROM asset_models WHERE model_id=? AND is_active=1',d.model_id);if(!m||['manufacturer_id','category_id','asset_type_id'].some(k=>d[k]&&d[k]!==m[k]))fail('Asset classification must match its model.');}}
export async function recordAPI(req,db,u,table,key,input){
 if(!metadata[table]||table==='app_sessions')fail('Not found.',404);const write=req.method!=='GET';if(!allowed(u,moduleFor(table),write))fail('Permission denied.',403);
 // Only enterprise administrators can manage organization-wide metadata. Narrow roles never gain indirect record access.
 const assetLinked=metadata[table].some(c=>c.name==='asset_id');
 if(!enterprise(u,write)&&!assetLinked&&!['asset_categories','asset_types','asset_classes','manufacturers','asset_models','asset_statuses','asset_conditions','units_of_measure','movement_types','location_types','depreciation_methods','disposal_methods'].includes(table))fail('Enterprise scope is required for this module.',403);
 if(write&&!enterprise(u,true)&&!assetLinked)fail('Enterprise management scope is required.',403);
 if(req.method==='GET'){
  let where='1=1',args=[];const s=scopeSQL(u,false,table==='assets'?'t':'a');if(table==='assets'){where=s.sql;args=s.args;}else if(assetLinked){where=`t.asset_id IN (SELECT a.asset_id FROM assets a WHERE ${s.sql})`;args=s.args;}
  if(key){const ids=key.split(',');if(ids.length!==pk(table).length)fail('Invalid record ID.');where+=' AND '+pk(table).map(c=>`t."${c}"=?`).join(' AND ');args.push(...ids);}
  const url=new URL(req.url),search=(url.searchParams.get('q')||'').slice(0,100),limit=Math.min(500,Math.max(1,Number(url.searchParams.get('limit'))||100));
  if(search){const cols=metadata[table].filter(c=>c.type.startsWith('VARCHAR')&&c.name!=='password_hash');where+=' AND ('+cols.map(c=>`t."${c.name}" LIKE ?`).join(' OR ')+')';args.push(...cols.map(()=>`%${search}%`));}
  const projection=metadata[table].filter(c=>c.name!=='password_hash').map(c=>`t."${c.name}"`).join(',');return{rows:await rows(db,`SELECT ${projection} FROM "${table}" t WHERE ${where} ORDER BY t."${pk(table)[0]}" DESC LIMIT ?`,...args,limit)};
 }
 if(!['POST','PATCH'].includes(req.method))fail('Records are retained. Deactivate master records instead of deleting.',405);
 if(readonly.has(table)||table==='permissions'||table==='asset_lifecycle')fail('Use the lifecycle action for this history record.',405);
 const d=clean(table,input,req.method==='POST',u),ids=key?.split(',');let before=null;
 if(req.method==='PATCH'){
  if(!ids||ids.length!==pk(table).length)fail('Invalid record ID.');before=await one(db,`SELECT * FROM "${table}" WHERE ${pk(table).map(k=>`"${k}"=?`).join(' AND ')}`,...ids);if(!before)fail('Record not found.',404);
  for(const k of pk(table))delete d[k];if(table==='assets'){for(const k of ['status_id','current_location_id'])if(k in d&&d[k]!==before[k])fail('Use an assignment, return, or transfer receipt to change current state.');await assertClassifications(db,{...before,...d});}
 }
 if(assetLinked&&(table!=='assets'||before))await visibleAsset(db,u,table==='assets'?before.asset_id:d.asset_id||before?.asset_id,true);
 if(table==='assets'&&req.method==='POST'){if(!enterprise(u,true))fail('Enterprise scope is required to register assets.',403);d.status_id=(await one(db,"SELECT status_id FROM asset_statuses WHERE status_code='IN_STOCK'")).status_id;await assertClassifications(db,d);}
 if(table==='gate_passes'&&!u.super)fail('Gate pass authorization requires Super Admin.',403);
 if(table==='users'){
  if(before?.user_id===u.user_id&&(d.is_active===0))fail('You cannot deactivate your own account.');
  if(input.password){if(typeof input.password!=='string'||input.password.length<8||input.password.length>256)fail('Use a password of 8–256 characters.');d.password_hash=await passwordHash(input.password);}
  if(req.method==='POST'&&!d.password_hash)fail('A password is required.');
 }
 if(table==='roles'&&before?.role_code==='SUPER_ADMIN'&&d.is_active===0)fail('The Super Admin role must remain active.');
 if(table==='user_roles'&&before?.user_id===u.user_id&&before?.role_id===1)fail('You cannot remove your own Super Admin access.');
 if(!Object.keys(d).length)fail('No editable fields supplied.');
 const statement=req.method==='POST'?insert(db,table,d):query(db,`UPDATE "${table}" SET ${Object.keys(d).map(k=>`"${k}"=?`).join(',')}${table==='assets'?', revision=revision+1':''} WHERE ${pk(table).map(k=>`"${k}"=?`).join(' AND ')}`,...Object.values(d),...ids);
 const safe=v=>v&&Object.fromEntries(Object.entries(v).filter(([k])=>k!=='password_hash'));
 const result=await db.batch([statement,audit(db,u,table,key,req.method==='POST'?'CREATE':'UPDATE',safe(before),safe(d),req)]);return{ok:true,id:result[0].meta.last_row_id};
}
export async function lifecycle(req,db,u,id,action,d){
 const mod=action==='depreciate'?'finance':/repair|refresh|dispos/.test(action)?'support':'assets';if(!allowed(u,mod,true))fail('Permission denied.',403);const a=await visibleAsset(db,u,id,true);const status=await one(db,'SELECT * FROM asset_statuses WHERE status_id=?',a.status_id);if(status.is_terminal)fail('This asset has a terminal status.');const time=now(),statements=[];let nextStatus=a.status_id,nextLocation=a.current_location_id;
 const statusID=async code=>(await one(db,'SELECT status_id FROM asset_statuses WHERE status_code=?',code)).status_id;
 const movement=async(code,values)=>insert(db,'asset_movements',{asset_id:a.asset_id,movement_type_id:(await one(db,'SELECT movement_type_id FROM movement_types WHERE movement_code=?',code)).movement_type_id,from_location_id:a.current_location_id,movement_date:time,requested_by:u.user_id,movement_status:'COMPLETED',completed_at:time,...values});
 const active=await one(db,"SELECT * FROM asset_assignments WHERE asset_id=? AND assignment_status='ACTIVE'",id);
 if(action==='assign'){
  if(active||status.status_code!=='IN_STOCK')fail('Only unassigned in-stock assets can be assigned.');const e=await one(db,'SELECT * FROM employees WHERE employee_id=? AND is_active=1',d.employee_id);if(!e)fail('Select an active employee.');if(!d.location_id)fail('An assignment location is required.');
  nextStatus=await statusID('ASSIGNED');nextLocation=Number(d.location_id);statements.push(insert(db,'asset_assignments',{asset_id:a.asset_id,employee_id:e.employee_id,department_id:e.department_id,cost_center_id:e.cost_center_id,location_id:nextLocation,assigned_date:time,expected_return_date:d.expected_return_date||null,assignment_status:'ACTIVE',assigned_by:u.user_id,assignment_notes:d.notes||null}),await movement('ASSIGNMENT',{to_location_id:nextLocation,to_employee_id:e.employee_id}));
 }else if(action==='return'){
  if(!active)fail('This asset has no active assignment.');if(!d.location_id)fail('A return location is required.');nextStatus=await statusID('IN_STOCK');nextLocation=Number(d.location_id);statements.push(query(db,"UPDATE asset_assignments SET returned_date=?,assignment_status='RETURNED',return_received_by=?,updated_at=? WHERE assignment_id=? AND assignment_status='ACTIVE'",time,u.user_id,time,active.assignment_id),...guard(db),await movement('RETURN',{to_location_id:nextLocation,from_employee_id:active.employee_id}));
 }else if(action==='transfer'){
  if(!d.location_id||Number(d.location_id)===a.current_location_id)fail('Choose a different destination.');if(await one(db,"SELECT movement_id FROM asset_movements WHERE asset_id=? AND movement_status IN ('REQUESTED','APPROVED','IN_TRANSIT')",id))fail('A movement is already pending.');statements.push(await movement('TRANSFER',{to_location_id:Number(d.location_id),movement_status:'IN_TRANSIT',completed_at:null,remarks:d.notes||null}));
 }else if(action==='receive'){
  const m=await one(db,"SELECT m.* FROM asset_movements m JOIN movement_types mt ON mt.movement_type_id=m.movement_type_id WHERE m.asset_id=? AND mt.movement_code='TRANSFER' AND m.movement_status='IN_TRANSIT' ORDER BY m.movement_id DESC LIMIT 1",id);if(!m)fail('No transfer is awaiting receipt.');nextLocation=m.to_location_id;statements.push(query(db,"UPDATE asset_movements SET movement_status='COMPLETED',received_by=?,completed_at=? WHERE movement_id=? AND movement_status='IN_TRANSIT'",u.user_id,time,m.movement_id),...guard(db));
 }else if(action==='repair'){
  if(active)fail('Return the asset before sending it for repair.');if(!d.issue_description)fail('Describe the repair issue.');if(!['IN_HOUSE','THIRD_PARTY'].includes(d.repair_source))fail('Select a repair source.');if(d.repair_source==='THIRD_PARTY'&&!d.vendor_id)fail('Third-party repairs require a vendor.');if(await one(db,"SELECT repair_id FROM asset_repairs WHERE asset_id=? AND repair_status IN ('OPEN','IN_PROGRESS','WAITING_PARTS')",id))fail('An open repair already exists.');nextStatus=await statusID('FOR_REPAIR');statements.push(insert(db,'asset_repairs',{asset_id:a.asset_id,repair_source:d.repair_source,vendor_id:d.vendor_id?Number(d.vendor_id):null,issue_description:d.issue_description,repair_status:'OPEN',sent_date:time,created_by:u.user_id}),await movement('REPAIR_SEND_OUT',{vendor_id:d.vendor_id?Number(d.vendor_id):null}));
 }else if(action==='repair-return'){
  const r=await one(db,"SELECT repair_id FROM asset_repairs WHERE asset_id=? AND repair_status IN ('OPEN','IN_PROGRESS','WAITING_PARTS') ORDER BY repair_id DESC LIMIT 1",id);if(!r)fail('No open repair exists.');const cost=clean('asset_repairs',{repair_cost:d.repair_cost||'0'},false,u).repair_cost;if(!d.location_id)fail('Choose the receiving location.');nextStatus=await statusID('IN_STOCK');nextLocation=Number(d.location_id);statements.push(query(db,"UPDATE asset_repairs SET repair_status='COMPLETED',repair_complete_date=?,returned_date=?,repair_cost=?,repair_action=? WHERE repair_id=?",time,time,cost,d.notes||null,r.repair_id),await movement('REPAIR_RETURN',{to_location_id:nextLocation}));
 }else if(action==='refresh'){
  if(!d.notes)fail('A refresh reason is required.');nextStatus=await statusID('FOR_REFRESH');statements.push(insert(db,'asset_refreshes',{asset_id:a.asset_id,recommended_date:time.slice(0,10),refresh_reason:d.notes,status:'RECOMMENDED'}));
 }else if(action==='disposal-request'){
  if(active)fail('Return the asset before requesting disposal.');if(!d.disposal_method_id)fail('Choose a disposal method.');if(await one(db,"SELECT disposal_id FROM asset_disposals WHERE asset_id=? AND status NOT IN ('COMPLETED','CANCELLED')",id))fail('A disposal is already pending.');nextStatus=await statusID('FOR_DISPOSAL');statements.push(insert(db,'asset_disposals',{asset_id:a.asset_id,disposal_method_id:Number(d.disposal_method_id),requested_date:time.slice(0,10),data_wipe_required:d.data_wipe_required===false?0:1,data_wipe_confirmed:0,status:'REQUESTED',notes:d.notes||null}));
 }else if(action==='disposal-approve'||action==='disposal-complete'){
  const r=await one(db,"SELECT d.*,m.requires_certificate FROM asset_disposals d JOIN disposal_methods m ON m.disposal_method_id=d.disposal_method_id WHERE asset_id=? AND status IN ('REQUESTED','APPROVED','SCHEDULED') ORDER BY disposal_id DESC LIMIT 1",id);if(!r)fail('No pending disposal.');
  if(action==='disposal-approve'){if(!u.super)fail('Super Admin approval is required.',403);if(r.status!=='REQUESTED')fail('Already approved.');statements.push(query(db,"UPDATE asset_disposals SET status='APPROVED',approved_by=?,approved_date=? WHERE disposal_id=?",u.user_id,time.slice(0,10),r.disposal_id));}
  else{if(!r.approved_by||r.status==='REQUESTED')fail('Approve disposal before completing it.');if((r.requires_certificate||r.data_wipe_required)&&!d.certificate_file_id)fail('Upload and select a certificate.');if(r.data_wipe_required&&!d.data_wipe_confirmed)fail('Confirm that data wiping is complete.');if(d.certificate_file_id&&!await one(db,'SELECT f.file_id FROM files f JOIN asset_files af ON af.file_id=f.file_id WHERE f.file_id=? AND af.asset_id=?',d.certificate_file_id,id))fail('Certificate must be attached to this asset.');nextStatus=await statusID('DISPOSED');statements.push(query(db,"UPDATE asset_disposals SET status='COMPLETED',disposal_date=?,data_wipe_confirmed=?,wiped_by=?,wipe_date=?,certificate_file_id=? WHERE disposal_id=?",time.slice(0,10),d.data_wipe_confirmed?1:0,u.email,time,d.certificate_file_id?Number(d.certificate_file_id):null,r.disposal_id),query(db,"INSERT INTO asset_lifecycle(asset_id,lifecycle_stage,disposal_date,updated_at) VALUES (?,'DISPOSED',?,?) ON CONFLICT(asset_id) DO UPDATE SET lifecycle_stage='DISPOSED',disposal_date=excluded.disposal_date,updated_at=excluded.updated_at",id,time.slice(0,10),time),await movement('DISPOSAL',{}));}
 }else if(action==='depreciate'){
  if(!/^\d{4}-\d{2}-01$/.test(d.period_date||''))fail('Use the first day of the depreciation month.');const f=await one(db,'SELECT f.*,p.useful_life_months,p.residual_percentage,m.method_code FROM asset_financials f JOIN depreciation_profiles p ON p.depreciation_profile_id=f.depreciation_profile_id JOIN depreciation_methods m ON m.depreciation_method_id=p.depreciation_method_id WHERE f.asset_id=?',id);if(!f||f.method_code!=='STRAIGHT_LINE'||!f.acquisition_cost||!f.useful_life_months)fail('Configure a straight-line financial profile first.');const last=await one(db,'SELECT * FROM asset_depreciation WHERE asset_id=? ORDER BY period_date DESC LIMIT 1',id);if(last&&d.period_date<=last.period_date)fail('Depreciation periods must be posted in chronological order.');const acquisition=new Decimal(f.acquisition_cost),residual=new Decimal(f.residual_value||acquisition.mul(f.residual_percentage||0).div(100)),opening=new Decimal(last?.closing_book_value||f.current_book_value||f.acquisition_cost),amount=Decimal.max(0,Decimal.min(acquisition.minus(residual).div(f.useful_life_months).toDecimalPlaces(2),opening.minus(residual))),closing=opening.minus(amount),accumulated=new Decimal(last?.accumulated_depreciation||0).plus(amount);statements.push(insert(db,'asset_depreciation',{asset_id:a.asset_id,period_date:d.period_date,opening_value:opening.toFixed(2),depreciation_amount:amount.toFixed(2),accumulated_depreciation:accumulated.toFixed(2),closing_book_value:closing.toFixed(2),calculation_source:'STRAIGHT_LINE',calculated_at:time}),query(db,'UPDATE asset_financials SET current_book_value=?,updated_at=?,updated_by=? WHERE asset_id=?',closing.toFixed(2),time,u.user_id,id));
 }else fail('Unknown asset action.',404);
 if(nextLocation!==null&&!await one(db,'SELECT location_id FROM locations WHERE location_id=? AND is_active=1',nextLocation))fail('Select an active location.');
 await db.batch([query(db,'UPDATE assets SET status_id=?,current_location_id=?,updated_at=?,updated_by=?,revision=revision+1 WHERE asset_id=? AND revision=?',nextStatus,nextLocation,time,u.user_id,id,a.revision),...guard(db),...statements,audit(db,u,'assets',id,action,a,{...a,status_id:nextStatus,current_location_id:nextLocation},req)]);return{ok:true};
}
