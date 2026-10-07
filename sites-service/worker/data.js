import metadata from '../db/metadata.json' with {type:'json'};
import { now,random } from './security.js';
export { metadata };
export const query=(db,sql,...values)=>db.prepare(sql).bind(...values);
export const one=(db,sql,...v)=>query(db,sql,...v).first();
export const rows=async(db,sql,...v)=>(await query(db,sql,...v).all()).results;
export function insert(db,table,data){const names=Object.keys(data);return query(db,`INSERT INTO "${table}" (${names.map(k=>`"${k}"`).join(',')}) VALUES (${names.map(()=>'?').join(',')})`,...names.map(k=>data[k]));}
export function audit(db,user,table,id,action,before,after,req){const d={user_id:user?.user_id??null,event_type:action,module:table,table_name:table,record_id:String(id??''),action,old_values:before?JSON.stringify(before):null,new_values:after?JSON.stringify(after):null,ip_address:req.headers.get('x-mdm-client-ip'),user_agent:req.headers.get('user-agent'),event_timestamp:now()};if(id===null||id===undefined){const keys=Object.keys(d);return query(db,`INSERT INTO audit_logs (${keys.join(',')}) VALUES (${keys.map(k=>k==='record_id'?'CAST(last_insert_rowid() AS TEXT)':'?').join(',')})`,...keys.filter(k=>k!=='record_id').map(k=>d[k]));}return insert(db,'audit_logs',d);}
export const pk=t=>metadata[t].filter(c=>c.key.includes('PK')).map(c=>c.name);
export const lookupTables=['asset_categories','asset_types','asset_classes','manufacturers','asset_models','asset_statuses','asset_conditions','units_of_measure','movement_types','location_types','depreciation_methods','disposal_methods'];
export const readonly=new Set(['asset_assignments','asset_movements','asset_depreciation','asset_disposals','asset_repairs','asset_refreshes','security_movements','inventory_scan_results','barcode_scan_logs','audit_logs','files','asset_files','app_sessions']);
export const modules=['assets','organization','finance','procurement','support','inventory','security','users','master','files','audit'];
export function moduleFor(t){if(t==='asset_technical_details')return'technical';if(t==='asset_warranties')return'warranty';if(t==='asset_repairs')return'repairs';if(t==='asset_refreshes')return'refresh';if(t==='asset_disposals')return'disposal';if(t==='asset_assignments')return'custody';if(t==='asset_movements')return'movements';if(lookupTables.includes(t))return'master';if(['business_units','departments','cost_centers','employees','locations'].includes(t))return'organization';if(['users','roles','permissions','user_roles','role_permissions','user_scopes','dashboard_types','user_dashboards','app_sessions'].includes(t))return'users';if(t.includes('depreciation')||t==='asset_financials')return'finance';if(['vendors','purchase_orders','purchase_order_items','invoices'].includes(t))return'procurement';if(/warrant|repair|refresh|disposal/.test(t))return'support';if(t.startsWith('inventory')||t==='barcode_scan_logs')return'inventory';if(/gate_pass|security_movement/.test(t))return'security';if(/files/.test(t))return'files';if(t==='audit_logs')return'audit';return'assets';}
export async function access(db,id){
 const user=await one(db,'SELECT user_id,username,email,employee_id,is_active,force_password_change,mfa_required,mfa_enabled FROM users WHERE user_id=?',id);if(!user?.is_active)return null;
 const date=now();user.roles=(await rows(db,`SELECT r.role_code FROM roles r JOIN user_roles ur ON ur.role_id=r.role_id WHERE ur.user_id=? AND r.is_active=1 AND (ur.effective_from IS NULL OR ur.effective_from<=?) AND (ur.effective_to IS NULL OR ur.effective_to>?)`,id,date,date)).map(r=>r.role_code);
 user.super=user.roles.includes('SUPER_ADMIN');user.permissions=(await rows(db,`SELECT DISTINCT p.permission_code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.permission_id JOIN roles r ON r.role_id=rp.role_id JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=? AND r.is_active=1 AND (ur.effective_from IS NULL OR ur.effective_from<=?) AND (ur.effective_to IS NULL OR ur.effective_to>?)`,id,date,date)).map(r=>r.permission_code);
 const overrides=await rows(db,'SELECT p.permission_code,o.effect FROM user_permission_overrides o JOIN permissions p ON p.permission_id=o.permission_id WHERE o.user_id=?',id);const permissions=new Set(user.permissions);for(const o of overrides){if(o.effect==='DENY')permissions.delete(o.permission_code);else permissions.add(o.permission_code);}user.permissions=[...permissions];
 user.scopes=await rows(db,'SELECT * FROM user_scopes WHERE user_id=? AND (effective_from IS NULL OR effective_from<=?) AND (effective_to IS NULL OR effective_to>?)',id,date,date);return user;
}
export function allowed(u,mod,write=false){return u.super||u.permissions.includes(`${mod}.${write?'manage':'view'}`);}
export function enterprise(u,write=false){return u.super||u.scopes.some(s=>s.scope_type==='ENTERPRISE'&&(!write||s.access_level==='MANAGE'));}
export function scopeSQL(u,write=false,alias='a'){
 if(enterprise(u,write))return{sql:'1=1',args:[]};let tests=[],args=[];
 for(const s of u.scopes){if(write&&s.access_level!=='MANAGE')continue;const id=s.scope_reference_id;
 if(s.scope_type==='SELF'&&u.employee_id){tests.push(`${alias}.asset_id IN (SELECT asset_id FROM asset_assignments WHERE assignment_status='ACTIVE' AND employee_id=?)`);args.push(u.employee_id);}
 if(['BUSINESS_UNIT','DEPARTMENT','COST_CENTER'].includes(s.scope_type)){const column={BUSINESS_UNIT:'business_unit_id',DEPARTMENT:'department_id',COST_CENTER:'cost_center_id'}[s.scope_type];tests.push(`${alias}.asset_id IN (SELECT aa.asset_id FROM asset_assignments aa JOIN employees e ON e.employee_id=aa.employee_id WHERE aa.assignment_status='ACTIVE' AND e.${column}=?)`);args.push(id);}
 if(s.scope_type==='SITE'){tests.push(`${alias}.current_location_id IN (WITH RECURSIVE site(location_id) AS (SELECT location_id FROM locations WHERE location_id=? UNION SELECT l.location_id FROM locations l JOIN site ON l.parent_location_id=site.location_id) SELECT location_id FROM site)`);args.push(id);}
 if(s.scope_type==='TEAM'){tests.push(`${alias}.asset_id IN (SELECT aa.asset_id FROM asset_assignments aa JOIN team_members tm ON tm.employee_id=aa.employee_id JOIN teams t ON t.team_id=tm.team_id WHERE aa.assignment_status='ACTIVE' AND tm.team_id=? AND t.is_active=1)`);args.push(id);}
 }
 return{sql:tests.length?'('+tests.join(' OR ')+')':'0=1',args};
}
export async function visibleAsset(db,u,id,write=false){const s=scopeSQL(u,write);const a=await one(db,`SELECT a.* FROM assets a WHERE a.asset_id=? AND ${s.sql}`,id,...s.args);if(!a)throw Object.assign(new Error('Asset not found in your permitted scope.'),{status:404});return a;}
export const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function seed(db,env){
 const existing=await one(db,'SELECT user_id FROM users LIMIT 1');if(existing)return;
 if(!env.SUPER_ADMIN_PASSWORD_HASH?.startsWith('pbkdf2:'))fail('Administrator sign-in is not configured.',503);
 const statements=[];const add=(t,d)=>statements.push(insert(db,t,d));
 const codes={asset_statuses:['IN_STOCK','ASSIGNED','FOR_REPAIR','FOR_REFRESH','FOR_DISPOSAL','DISPOSED','LOST','STOLEN'],asset_conditions:['NEW','GOOD','FAIR','DAMAGED'],roles:['SUPER_ADMIN','IT_ADMIN','FINANCE_ADMIN','ITAM_TEAM','SECURITY','MANAGEMENT_VIEWER','GENERAL_USER'],dashboard_types:['IT','FINANCE','ITAM','OPERATIONS','HR','SECURITY','GENERAL','EXECUTIVE'],movement_types:['STOCK_IN','STOCK_OUT','ASSIGNMENT','RETURN','TRANSFER','REPAIR_SEND_OUT','REPAIR_RETURN','REFRESH','DISPOSAL','GATE_ENTRY','GATE_EXIT'],location_types:['STORAGE','OFFICE','WFH','DATA_CENTER','REPAIR_CENTER','TRANSIT','DISPOSAL_AREA','THIRD_PARTY'],depreciation_methods:['STRAIGHT_LINE','DECLINING_BALANCE','NONE'],disposal_methods:['RECYCLE','RESALE','DONATION','RETURN_VENDOR','DESTROYED','TRADE_IN','OTHER']};
 for(const [t,values]of Object.entries(codes)){const cs=metadata[t];const code=cs.find(c=>c.name.endsWith('_code')).name,name=cs.find(c=>c.name.endsWith('_name')).name;for(const v of values){const d={[code]:v,[name]:v.replaceAll('_',' ')};if(t==='asset_statuses'){d.lifecycle_stage=v==='DISPOSED'?'DISPOSED':'ACTIVE';d.is_terminal=['DISPOSED','LOST','STOLEN'].includes(v)?1:0;}if(t==='movement_types'){d.changes_location=1;d.changes_custody=['ASSIGNMENT','RETURN'].includes(v)?1:0;}if(t==='disposal_methods')d.requires_certificate=1;add(t,d);}}
 add('asset_categories',{category_name:'Computer'});add('asset_types',{category_id:1,type_name:'Laptop'});add('asset_classes',{class_name:'Trackable Asset'});add('units_of_measure',{uom_code:'EA',uom_name:'Each'});
 add('users',{username:'superadmin',email:env.SUPER_ADMIN_EMAIL||'a@a.a.com',password_hash:env.SUPER_ADMIN_PASSWORD_HASH});
 let permissionId=0;for(const mod of modules)for(const action of ['view','manage']){permissionId++;add('permissions',{permission_code:`${mod}.${action}`,module:mod,action});for(let role=1;role<=7;role++){
 const grants={1:modules,2:['assets','organization','support','inventory','master','files'],3:['finance','procurement'],4:['assets','inventory','support','files'],5:['security'],6:modules.filter(x=>!['users','audit'].includes(x)),7:['assets']};
 if((grants[role].includes(mod)&&(!(role>=6)||action==='view'))||(mod==='master'&&action==='view')||(role===5&&mod==='assets'&&action==='view'))add('role_permissions',{role_id:role,permission_id:permissionId});}}
 add('user_roles',{user_id:1,role_id:1});add('user_scopes',{user_id:1,scope_type:'ENTERPRISE',access_level:'MANAGE'});add('user_dashboards',{user_id:1,dashboard_type_id:3,is_default:1});
 try{await db.batch(statements);}catch(e){if(!await one(db,"SELECT user_id FROM users WHERE username='superadmin'"))throw e;}
}
// D1 batch is atomic. A CHECK guard turns a lost optimistic lock into full rollback.
export function guard(db){const id=random();return [query(db,'INSERT INTO operation_guards (guard_id,passed) VALUES (?,changes())',id),query(db,'DELETE FROM operation_guards WHERE guard_id=?',id)];}
