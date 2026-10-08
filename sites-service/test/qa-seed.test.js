import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import {passwordHash} from '../worker/security.js';
import {database} from './helpers.js';

async function fixture(enable=true){
 const {db,sql}=database();
 const env={DB:db,RENDER_API_SECRET:'qa-gateway',SUPER_ADMIN_EMAIL:'root@example.com',SUPER_ADMIN_PASSWORD_HASH:await passwordHash('root-fixture-password')};
 if(enable){env.ENABLE_QA_SEED='true';env.QA_SEED_PASSWORD='qa-fixture-password-2026';}
 let cookie='';
 async function call(path,method='GET',data){
  const r=await worker.fetch(new Request('https://qa.example'+path,{method,headers:{'x-mdm-api-secret':env.RENDER_API_SECRET,cookie,'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)}),env);
  if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
  let body={};try{body=await r.json();}catch{}
  return{status:r.status,...body};
 }
 async function login(username){cookie='';const r=await call('/api/auth/login','POST',{email:username,password:env.QA_SEED_PASSWORD});assert.equal(r.status,200,`${username}: ${r.message}`);return r;}
 return{db,sql,env,call,login,setCookie:v=>cookie=v};
}

test('QA seed is opt-in, idempotent, and does not reset an existing QA password',async()=>{
 const off=await fixture(false);assert.equal((await off.call('/api/auth/login','POST',{email:'qa.superadmin',password:'anything'})).status,401);assert.equal(off.sql.prepare("SELECT COUNT(*) n FROM users WHERE username LIKE 'qa.%'").get().n,0);
 const x=await fixture(true);await x.login('qa.superadmin');const first=x.sql.prepare("SELECT password_hash FROM users WHERE username='qa.employee'").get().password_hash;
 await x.call('/api/auth/logout','POST',{});const {seedQA}=await import('../worker/qa-seed.js');await seedQA(x.db,x.env);assert.equal(x.sql.prepare("SELECT COUNT(*) n FROM users WHERE username LIKE 'qa.%'").get().n,15);assert.equal(x.sql.prepare("SELECT password_hash FROM users WHERE username='qa.employee'").get().password_hash,first);
 assert.equal(x.sql.prepare("SELECT COUNT(*) n FROM roles WHERE role_code='INVENTORY_CUSTODIAN'").get().n,1);assert.equal(x.sql.prepare("SELECT COUNT(*) n FROM departments WHERE department_code='QA_TEST_DEPT'").get().n,1);assert.equal(x.sql.prepare("SELECT COUNT(*) n FROM assets WHERE asset_tag LIKE 'QA-%'").get().n,5);
});

test('QA personas enforce backend RBAC and ENTERPRISE/DEPARTMENT/SITE/TEAM/SELF scopes',async()=>{
 const x=await fixture(true);
 const me=async name=>{await x.login(name);const r=await x.call('/api/auth/me');assert.equal(r.status,200);return r.user;};
 const deny=async(path,method='GET',data)=>assert.equal((await x.call(path,method,data)).status,403,path);
 const rows=async path=>(await x.call(path)).rows||[];
 let u=await me('qa.finance');assert(u.permissions.includes('finance.manage'));assert(!u.permissions.includes('users.manage'));await deny('/api/admin/options');assert.equal((await x.call('/api/records/asset_financials')).status,200);
 u=await me('qa.security');assert(u.permissions.includes('security.manage'));assert(!u.permissions.includes('finance.manage'));await deny('/api/records/asset_financials','POST',{});
 u=await me('qa.servicedesk');assert(u.permissions.includes('repairs.manage'));assert(!u.permissions.includes('disposal.manage'));await deny('/api/assets/1/actions/disposal-approve','POST',{});
 u=await me('qa.management');assert(u.permissions.includes('assets.view'));assert(!u.permissions.includes('assets.manage'));await deny('/api/records/assets/1','PATCH',{description:'not allowed'});
 await me('qa.deptcustodian');let tags=(await rows('/api/records/assets')).map(a=>a.asset_tag);assert(tags.includes('QA-LAPTOP-001'));assert(!tags.includes('QA-PHONE-001'));
 await me('qa.sitecustodian');tags=(await rows('/api/records/assets')).map(a=>a.asset_tag);assert(tags.includes('QA-LAPTOP-001'));assert(!tags.includes('QA-PHONE-001'));
 await me('qa.teamlead');tags=(await rows('/api/records/assets')).map(a=>a.asset_tag);assert(tags.includes('QA-LAPTOP-001')&&tags.includes('QA-LAPTOP-002'));assert(!tags.includes('QA-DESKTOP-001'));assert(!tags.includes('QA-PHONE-001'));
 await me('qa.employee');tags=(await rows('/api/records/assets')).map(a=>a.asset_tag);assert.deepEqual(tags,['QA-LAPTOP-001']);const other=x.sql.prepare("SELECT asset_id FROM assets WHERE asset_tag='QA-LAPTOP-002'").get().asset_id;assert.equal((await x.call('/api/assets/'+other+'/context')).status,404);
 await me('qa.itadmin');assert.equal((await x.call('/api/records/assets')).rows.length,5);
});

test('QA login, identity, authorization and logout work without exposing passwords',async()=>{
 const x=await fixture(true);
 for(const name of ['qa.servicedesk','qa.inventory','qa.security','qa.deptcustodian','qa.employee']){
  await x.login(name);const me=await x.call('/api/auth/me');assert.equal(me.status,200);assert.equal(me.user.username,name);assert(!JSON.stringify(me).includes('password_hash'));assert(!JSON.stringify(me).includes(x.env.QA_SEED_PASSWORD));
  const list=await x.call('/api/records/assets');assert.equal(list.status,200);assert.equal((await x.call('/api/auth/logout','POST',{})).status,200);assert.equal((await x.call('/api/auth/me')).status,401);
 }
});
