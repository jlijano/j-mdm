import {query,one,rows,insert} from './data.js';
import {now,passwordHash} from './security.js';

const ENABLED='true';
const QA_PREFIX='qa_';
const MANAGED_ROLE_KEY=code=>`${QA_PREFIX}managed_role:${code}`;

const managedRoles={
 INVENTORY_CUSTODIAN:{name:'Inventory / Stock Custodian',permissions:['assets.view','barcode.manage','inventory.view','inventory.manage','custody.view','custody.manage','movements.view','movements.manage','master.view','reports.view','exports.view']},
 FINANCE_ASSET_ACCOUNTING:{name:'Finance / Asset Accounting',permissions:['assets.view','finance.view','finance.manage','procurement.view','master.view','reports.view','exports.view']},
 PROCUREMENT:{name:'Procurement / Purchasing',permissions:['assets.view','procurement.view','procurement.manage','finance.view','warranty.view','master.view','reports.view','exports.view']},
 HR_ADMIN:{name:'HR / Employee Administration',permissions:['organization.view','organization.manage','assets.view','custody.view','reports.view','exports.view']},
 DEPARTMENT_MANAGER:{name:'Department Manager',permissions:['assets.view','custody.view','movements.view','reports.view','exports.view']},
 DEPARTMENT_ASSET_CUSTODIAN:{name:'Department Asset Custodian',permissions:['assets.view','barcode.manage','inventory.view','custody.view','custody.manage','movements.view','movements.manage','master.view','reports.view']},
 SITE_ASSET_CUSTODIAN:{name:'Site Asset Custodian',permissions:['assets.view','barcode.manage','inventory.view','custody.view','custody.manage','movements.view','movements.manage','master.view','reports.view']},
 MANAGEMENT_VIEWER:{name:'Management / Executive Viewer',permissions:['assets.view','finance.view','reports.view','exports.view','master.view']},
 GENERAL_EMPLOYEE:{name:'General Employee / Asset Holder',permissions:['assets.view','custody.view']},
 TEAM_ASSET_CUSTODIAN:{name:'Team Lead / Asset Custodian',permissions:['assets.view','barcode.manage','inventory.view','custody.view','custody.manage','movements.view','movements.manage','master.view','reports.view']}
};

const reusedRoles={
 SUPER_ADMIN:{name:'Super Admin',minimum:[]},
 IT_ADMIN:{name:'IT Administrator',minimum:['assets.view','technical.view','technical.manage','barcode.manage']},
 ITAM_MANAGER:{name:'ITAM / Asset Manager',minimum:['assets.view','assets.manage','inventory.view','inventory.manage','custody.manage','movements.manage']},
 SERVICE_DESK:{name:'Service Desk / Technician',minimum:['assets.view','barcode.manage','technical.view','repairs.manage']},
 SECURITY:{name:'Security',minimum:['assets.view','security.view','security.manage','barcode.manage']}
};

const departments=[
 ['QA_IT','IT'],
 ['QA_ITAM','IT / IT Asset Management'],
 ['QA_SERVICE_DESK','IT / Service Desk'],
 ['QA_INVENTORY','IT / Asset Inventory'],
 ['QA_FINANCE','Finance'],
 ['QA_PROCUREMENT','Procurement'],
 ['QA_HR','Human Resources'],
 ['QA_SECURITY','Security'],
 ['QA_MANAGEMENT','Management'],
 ['QA_TEST_DEPT','QA Test Department']
];

const accounts=[
 {username:'qa.superadmin',email:'qa.superadmin@jmdm.test',first:'QA',last:'Super Administrator',role:'SUPER_ADMIN',department:null,scope:'ENTERPRISE',access:'MANAGE'},
 {username:'qa.itadmin',email:'qa.itadmin@jmdm.test',first:'QA',last:'IT Administrator',role:'IT_ADMIN',department:'QA_IT',scope:'ENTERPRISE',access:'MANAGE'},
 {username:'qa.itam',email:'qa.itam@jmdm.test',first:'QA',last:'ITAM Manager',role:'ITAM_MANAGER',department:'QA_ITAM',scope:'ENTERPRISE',access:'MANAGE'},
 {username:'qa.servicedesk',email:'qa.servicedesk@jmdm.test',first:'QA',last:'Service Desk',role:'SERVICE_DESK',department:'QA_SERVICE_DESK',scope:'ENTERPRISE',access:'MANAGE'},
 {username:'qa.inventory',email:'qa.inventory@jmdm.test',first:'QA',last:'Inventory Custodian',role:'INVENTORY_CUSTODIAN',department:'QA_INVENTORY',scope:'ENTERPRISE',access:'MANAGE'},
 {username:'qa.finance',email:'qa.finance@jmdm.test',first:'QA',last:'Finance',role:'FINANCE_ASSET_ACCOUNTING',department:'QA_FINANCE',scope:'ENTERPRISE',access:'MANAGE'},
 {username:'qa.procurement',email:'qa.procurement@jmdm.test',first:'QA',last:'Procurement',role:'PROCUREMENT',department:'QA_PROCUREMENT',scope:'ENTERPRISE',access:'MANAGE'},
 {username:'qa.hr',email:'qa.hr@jmdm.test',first:'QA',last:'Human Resources',role:'HR_ADMIN',department:'QA_HR',scope:'ENTERPRISE',access:'MANAGE'},
 {username:'qa.security',email:'qa.security@jmdm.test',first:'QA',last:'Security Officer',role:'SECURITY',department:'QA_SECURITY',scope:'ENTERPRISE',access:'MANAGE'},
 {username:'qa.deptmanager',email:'qa.deptmanager@jmdm.test',first:'QA',last:'Department Manager',role:'DEPARTMENT_MANAGER',department:'QA_TEST_DEPT',scope:'DEPARTMENT',access:'VIEW',employee:'QA-MGR-001'},
 {username:'qa.deptcustodian',email:'qa.deptcustodian@jmdm.test',first:'QA',last:'Department Custodian',role:'DEPARTMENT_ASSET_CUSTODIAN',department:'QA_TEST_DEPT',scope:'DEPARTMENT',access:'MANAGE',employee:'QA-CUST-001'},
 {username:'qa.sitecustodian',email:'qa.sitecustodian@jmdm.test',first:'QA',last:'Site Custodian',role:'SITE_ASSET_CUSTODIAN',department:'QA_TEST_DEPT',scope:'SITE',access:'MANAGE',employee:'QA-SITE-001'},
 {username:'qa.management',email:'qa.management@jmdm.test',first:'QA',last:'Management Viewer',role:'MANAGEMENT_VIEWER',department:'QA_MANAGEMENT',scope:'ENTERPRISE',access:'VIEW'},
 {username:'qa.employee',email:'qa.employee@jmdm.test',first:'QA',last:'Employee One',role:'GENERAL_EMPLOYEE',department:'QA_TEST_DEPT',scope:'SELF',access:'VIEW',employee:'QA-EMP-001'},
 {username:'qa.teamlead',email:'qa.teamlead@jmdm.test',first:'QA',last:'Team Lead',role:'TEAM_ASSET_CUSTODIAN',department:'QA_TEST_DEPT',scope:'TEAM',access:'MANAGE',employee:'QA-TEAM-001'}
];

function logSkip(message){console.warn(message);return{enabled:false,skipped:true,message};}
async function run(db,sql,...args){return query(db,sql,...args).run();}
async function qaAudit(db,table,id,action,details){
 await insert(db,'audit_logs',{user_id:null,event_type:action,module:'qa_seed',table_name:table,record_id:String(id??''),action,new_values:details?JSON.stringify(details):null,event_timestamp:now(),remarks:'QA seed'}).run();
}
async function setting(db,key){return (await one(db,'SELECT setting_value FROM system_settings WHERE setting_key=?',key))?.setting_value;}
async function mark(db,key,value='1'){await run(db,'INSERT INTO system_settings(setting_key,setting_value) VALUES (?,?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value',key,value);}

async function ensureBusinessUnit(db,code,name){
 let row=await one(db,'SELECT * FROM business_units WHERE business_unit_code=?',code);
 if(row)return row;
 await insert(db,'business_units',{business_unit_code:code,business_unit_name:name,is_active:1}).run();
 row=await one(db,'SELECT * FROM business_units WHERE business_unit_code=?',code);
 await qaAudit(db,'business_units',row.business_unit_id,'QA_SEED_CREATED',{business_unit_code:code});
 return row;
}
async function ensureDepartment(db,bu,code,name){
 let row=await one(db,'SELECT * FROM departments WHERE business_unit_id=? AND department_code=?',bu.business_unit_id,code);
 if(row)return row;
 await insert(db,'departments',{business_unit_id:bu.business_unit_id,department_code:code,department_name:name,is_active:1}).run();
 row=await one(db,'SELECT * FROM departments WHERE business_unit_id=? AND department_code=?',bu.business_unit_id,code);
 await qaAudit(db,'departments',row.department_id,'QA_SEED_CREATED',{department_code:code});
 return row;
}
async function ensureLocation(db,code,name,parent=null){
 let row=await one(db,'SELECT * FROM locations WHERE location_code=?',code);
 if(row)return row;
 const type=await one(db,"SELECT location_type_id FROM location_types WHERE location_type_code='OFFICE' AND is_active=1");
 if(!type)throw new Error('QA seed requires active location type OFFICE.');
 await insert(db,'locations',{location_type_id:type.location_type_id,parent_location_id:parent?.location_id??null,location_code:code,location_name:name,site_code:parent?null:code,is_active:1}).run();
 row=await one(db,'SELECT * FROM locations WHERE location_code=?',code);
 await qaAudit(db,'locations',row.location_id,'QA_SEED_CREATED',{location_code:code});
 return row;
}
async function ensureEmployee(db,{number,first,last,bu,department,location,manager=null}){
 let row=await one(db,'SELECT * FROM employees WHERE employee_number=?',number);
 if(row)return row;
 await insert(db,'employees',{employee_number:number,first_name:first,last_name:last,email:`${number.toLowerCase()}@jmdm.test`,business_unit_id:bu.business_unit_id,department_id:department.department_id,manager_employee_id:manager?.employee_id??null,default_location_id:location.location_id,employment_status:'ACTIVE',is_active:1}).run();
 row=await one(db,'SELECT * FROM employees WHERE employee_number=?',number);
 await qaAudit(db,'employees',row.employee_id,'QA_SEED_CREATED',{employee_number:number});
 return row;
}
async function ensureTeam(db,name,department,members){
 let row=await one(db,'SELECT * FROM teams WHERE team_name=?',name);
 if(!row){
  await insert(db,'teams',{team_name:name,department_id:department.department_id,is_active:1}).run();
  row=await one(db,'SELECT * FROM teams WHERE team_name=?',name);
  await qaAudit(db,'teams',row.team_id,'QA_SEED_CREATED',{team_name:name});
 }
 for(const e of members)await run(db,'INSERT OR IGNORE INTO team_members(team_id,employee_id) VALUES (?,?)',row.team_id,e.employee_id);
 return row;
}
async function rolePermissions(db,roleId){
 return (await rows(db,'SELECT p.permission_code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.permission_id WHERE rp.role_id=? ORDER BY p.permission_code',roleId)).map(x=>x.permission_code);
}
async function ensureRoles(db){
 const conflicts=[];
 for(const [code,def] of Object.entries(managedRoles)){
  let role=await one(db,'SELECT * FROM roles WHERE role_code=?',code);
  if(!role){
   await insert(db,'roles',{role_code:code,role_name:def.name,description:'QA-supported least-privilege role',is_active:1}).run();
   role=await one(db,'SELECT * FROM roles WHERE role_code=?',code);
   await mark(db,MANAGED_ROLE_KEY(code));
   await qaAudit(db,'roles',role.role_id,'QA_SEED_CREATED',{role_code:code});
  }
  const missingPermissions=[];
  for(const codeName of def.permissions)if(!await one(db,'SELECT permission_id FROM permissions WHERE permission_code=?',codeName))missingPermissions.push(codeName);
  if(missingPermissions.length){conflicts.push({role:code,reason:'MISSING_PERMISSIONS',permissions:missingPermissions});continue;}
  const managed=await setting(db,MANAGED_ROLE_KEY(code));
  if(managed==='1'){
   await run(db,'DELETE FROM role_permissions WHERE role_id=?',role.role_id);
   for(const permission of def.permissions)await run(db,'INSERT OR IGNORE INTO role_permissions(role_id,permission_id) SELECT ?,permission_id FROM permissions WHERE permission_code=?',role.role_id,permission);
  }else{
   const current=await rolePermissions(db,role.role_id),expected=[...def.permissions].sort();
   if(JSON.stringify(current)!==JSON.stringify(expected))conflicts.push({role:code,reason:'PREEXISTING_ROLE_PERMISSION_CONFLICT',current,expected});
  }
 }
 for(const [code,def] of Object.entries(reusedRoles)){
  const role=await one(db,'SELECT * FROM roles WHERE role_code=? AND is_active=1',code);
  if(!role){conflicts.push({role:code,reason:'MISSING_REUSED_ROLE'});continue;}
  const current=await rolePermissions(db,role.role_id),missing=def.minimum.filter(p=>!current.includes(p));
  if(missing.length)conflicts.push({role:code,reason:'REUSED_ROLE_MISSING_EXPECTED_PERMISSIONS',permissions:missing});
 }
 return conflicts;
}
async function ensureUser(db,account,password,refs,conflicts){
 if(conflicts.some(c=>c.role===account.role&&c.reason==='PREEXISTING_ROLE_PERMISSION_CONFLICT'))return null;
 const role=await one(db,'SELECT * FROM roles WHERE role_code=? AND is_active=1',account.role);if(!role)return null;
 let user=await one(db,'SELECT * FROM users WHERE lower(username)=lower(?) OR lower(email)=lower(?)',account.username,account.email);
 if(!user){
  const department=account.department?refs.departments[account.department]:null,employee=account.employee?refs.employees[account.employee]:null;
  const hash=await passwordHash(password);
  await insert(db,'users',{employee_id:employee?.employee_id??null,first_name:account.first,last_name:account.last,department_id:department?.department_id??null,business_unit_id:department?refs.qaBU.business_unit_id:null,site_id:account.scope==='SITE'?refs.qaSite.location_id:null,username:account.username,email:account.email,password_hash:hash,is_active:1,force_password_change:0,mfa_required:0}).run();
  user=await one(db,'SELECT * FROM users WHERE lower(username)=lower(?)',account.username);
  await qaAudit(db,'users',user.user_id,'QA_SEED_CREATED',{username:account.username,role:account.role});
 }
 await run(db,'INSERT OR IGNORE INTO user_roles(user_id,role_id) VALUES (?,?)',user.user_id,role.role_id);
 const existingScopes=await rows(db,'SELECT * FROM user_scopes WHERE user_id=?',user.user_id);
 if(!existingScopes.length){
  const refId=account.scope==='DEPARTMENT'?refs.departments.QA_TEST_DEPT.department_id:account.scope==='SITE'?refs.qaSite.location_id:account.scope==='TEAM'?refs.qaTeam.team_id:null;
  await insert(db,'user_scopes',{user_id:user.user_id,scope_type:account.scope,scope_reference_id:refId,access_level:account.access}).run();
 }
 return user;
}
async function classification(db,categoryName,typeName){
 const category=await one(db,'SELECT category_id FROM asset_categories WHERE category_name=? AND is_active=1',categoryName);
 if(!category)throw new Error(`QA seed requires active category ${categoryName}.`);
 const type=await one(db,'SELECT asset_type_id FROM asset_types WHERE category_id=? AND type_name=? AND is_active=1',category.category_id,typeName);
 if(!type)throw new Error(`QA seed requires active asset type ${typeName}.`);
 return{category_id:category.category_id,asset_type_id:type.asset_type_id};
}
async function ensureAsset(db,{tag,barcode,category,type,location,creator,description}){
 let row=await one(db,'SELECT * FROM assets WHERE asset_tag=?',tag);if(row)return{row,created:false};
 const cls=await one(db,"SELECT asset_class_id FROM asset_classes WHERE class_name='Trackable Asset'");
 const cond=await one(db,"SELECT condition_id FROM asset_conditions WHERE condition_code='GOOD'");
 const status=await one(db,"SELECT status_id FROM asset_statuses WHERE status_code='IN_STOCK' AND is_active=1");
 const uom=await one(db,"SELECT unit_of_measure_id FROM units_of_measure WHERE uom_code='EA' AND is_active=1");
 if(!cls||!cond||!status)throw new Error('QA seed requires Trackable Asset, GOOD, and IN_STOCK master data.');
 const c=await classification(db,category,type);
 await insert(db,'assets',{asset_tag:tag,barcode,description,${''}category_id:c.category_id,asset_type_id:c.asset_type_id,asset_class_id:cls.asset_class_id,status_id:status.status_id,condition_id:cond.condition_id,current_location_id:location.location_id,unit_of_measure_id:uom?.unit_of_measure_id??null,quantity:'1',is_serialized:1,is_active:1,created_by:creator.user_id,updated_by:creator.user_id}).run();
 row=await one(db,'SELECT * FROM assets WHERE asset_tag=?',tag);await qaAudit(db,'assets',row.asset_id,'QA_SEED_CREATED',{asset_tag:tag});return{row,created:true};
}
async function assignIfNew(db,assetResult,employee,location,actor){
 if(!assetResult.created)return;
 const active=await one(db,"SELECT assignment_id FROM asset_assignments WHERE asset_id=? AND assignment_status='ACTIVE'",assetResult.row.asset_id);if(active)return;
 await insert(db,'asset_assignments',{asset_id:assetResult.row.asset_id,employee_id:employee.employee_id,department_id:employee.department_id,location_id:location.location_id,assigned_date:now(),assignment_status:'ACTIVE',assigned_by:actor.user_id,assignment_notes:'QA seed assignment'}).run();
 const assigned=await one(db,"SELECT status_id FROM asset_statuses WHERE status_code='ASSIGNED'");
 await run(db,'UPDATE assets SET status_id=?,current_location_id=?,updated_at=?,updated_by=? WHERE asset_id=?',assigned.status_id,location.location_id,now(),actor.user_id,assetResult.row.asset_id);
}

export async function seedQA(db,env={}){
 if(String(env.ENABLE_QA_SEED||'')!==ENABLED)return logSkip('QA account seed skipped because ENABLE_QA_SEED is not exactly true.');
 if(typeof env.QA_SEED_PASSWORD!=='string'||env.QA_SEED_PASSWORD.length<12)return logSkip('QA account seed skipped because QA_SEED_PASSWORD is not configured with at least 12 characters.');
 const conflicts=await ensureRoles(db);
 const qaBU=await ensureBusinessUnit(db,'QA_BU','QA Business Unit');
 const controlBU=await ensureBusinessUnit(db,'QA_CONTROL_BU','QA Control Business Unit');
 const deptMap={};for(const [code,name] of departments)deptMap[code]=await ensureDepartment(db,qaBU,code,name);
 const controlDept=await ensureDepartment(db,controlBU,'QA_CONTROL_DEPT','QA Control Department');
 const qaSite=await ensureLocation(db,'QA_SITE','QA Test Site');
 const qaRoom=await ensureLocation(db,'QA_SITE_ROOM_1','QA Test Site - Room 1',qaSite);
 const controlSite=await ensureLocation(db,'QA_CONTROL_SITE','QA Control Site');
 const manager=await ensureEmployee(db,{number:'QA-MGR-001',first:'QA',last:'Department Manager',bu:qaBU,department:deptMap.QA_TEST_DEPT,location:qaSite});
 const custodian=await ensureEmployee(db,{number:'QA-CUST-001',first:'QA',last:'Department Custodian',bu:qaBU,department:deptMap.QA_TEST_DEPT,location:qaSite,manager});
 const teamLead=await ensureEmployee(db,{number:'QA-TEAM-001',first:'QA',last:'Team Lead',bu:qaBU,department:deptMap.QA_TEST_DEPT,location:qaSite,manager});
 const siteCustodian=await ensureEmployee(db,{number:'QA-SITE-001',first:'QA',last:'Site Custodian',bu:qaBU,department:deptMap.QA_TEST_DEPT,location:qaSite,manager});
 const emp1=await ensureEmployee(db,{number:'QA-EMP-001',first:'QA',last:'Employee One',bu:qaBU,department:deptMap.QA_TEST_DEPT,location:qaRoom,manager});
 const emp2=await ensureEmployee(db,{number:'QA-EMP-002',first:'QA',last:'Employee Two',bu:qaBU,department:deptMap.QA_TEST_DEPT,location:qaRoom,manager});
 const controlEmp=await ensureEmployee(db,{number:'QA-CTRL-001',first:'QA',last:'Control Employee',bu:controlBU,department:controlDept,location:controlSite});
 const qaTeam=await ensureTeam(db,'QA Test Team',deptMap.QA_TEST_DEPT,[teamLead,emp1,emp2]);
 await ensureTeam(db,'QA Control Team',controlDept,[controlEmp]);
 const refs={qaBU,controlBU,departments:deptMap,qaSite,qaRoom,controlSite,qaTeam,employees:{'QA-MGR-001':manager,'QA-CUST-001':custodian,'QA-TEAM-001':teamLead,'QA-SITE-001':siteCustodian,'QA-EMP-001':emp1,'QA-EMP-002':emp2,'QA-CTRL-001':controlEmp}};
 const users={};for(const account of accounts){const user=await ensureUser(db,account,env.QA_SEED_PASSWORD,refs,conflicts);if(user)users[account.username]=user;}
 const actor=users['qa.superadmin'];if(actor){
  const a1=await ensureAsset(db,{tag:'QA-LAPTOP-001',barcode:'QA-LAPTOP-001',category:'Computer',type:'Laptop',location:qaRoom,creator:actor,description:'QA employee self/team/department/site scope asset'});
  const a2=await ensureAsset(db,{tag:'QA-LAPTOP-002',barcode:'QA-LAPTOP-002',category:'Computer',type:'Laptop',location:qaRoom,creator:actor,description:'QA team asset for second employee'});
  const a3=await ensureAsset(db,{tag:'QA-DESKTOP-001',barcode:'QA-DESKTOP-001',category:'Computer',type:'Desktop',location:qaSite,creator:actor,description:'QA department asset outside QA Test Team'});
  const a4=await ensureAsset(db,{tag:'QA-MONITOR-001',barcode:'QA-MONITOR-001',category:'Peripheral',type:'Monitor',location:qaSite,creator:actor,description:'QA department/site custody asset'});
  const a5=await ensureAsset(db,{tag:'QA-PHONE-001',barcode:'QA-PHONE-001',category:'Mobile Device',type:'Smartphone',location:controlSite,creator:actor,description:'QA control asset outside primary business unit, department, site and team'});
  await assignIfNew(db,a1,emp1,qaRoom,actor);await assignIfNew(db,a2,emp2,qaRoom,actor);await assignIfNew(db,a3,manager,qaSite,actor);await assignIfNew(db,a4,custodian,qaSite,actor);await assignIfNew(db,a5,controlEmp,controlSite,actor);
 }
 await mark(db,'qa_seed_v1_last_run',now());
 if(conflicts.length)console.warn('QA seed completed with RBAC conflicts:',JSON.stringify(conflicts));
 return{enabled:true,skipped:false,accounts:Object.keys(users),conflicts};
}

export const qaAccountDefinitions=accounts;
export const qaManagedRoleDefinitions=managedRoles;
