import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import {passwordHash} from '../worker/security.js';
import {database} from './helpers.js';

test('Asset 360 evidence, custody photos, barcode, condition, reconciliation and permissions',async()=>{
 const {db,sql}=database();
 const stored=new Map();
 const env={DB:db,RENDER_API_SECRET:'asset360-gateway',SUPER_ADMIN_EMAIL:'root360@example.com',SUPER_ADMIN_PASSWORD_HASH:await passwordHash('fixture-password'),BUCKET:{
  put:async(k,b)=>stored.set(k,b),get:async k=>stored.has(k)?{body:stored.get(k)}:null,delete:async k=>stored.delete(k)
 }};
 let cookie='';
 async function call(path,method='GET',data){
  const r=await worker.fetch(new Request('https://test.example'+path,{method,headers:{'x-mdm-api-secret':env.RENDER_API_SECRET,cookie,'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)}),env);
  if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
  if(r.headers.get('content-type')?.includes('application/json'))return{status:r.status,...await r.json()};
  return{status:r.status,contentType:r.headers.get('content-type')};
 }
 assert.equal((await call('/api/auth/login','POST',{email:'root360@example.com',password:'fixture-password'})).status,200);
 async function create(table,data){const r=await call('/api/records/'+table,'POST',data);assert.equal(r.status,200,table+': '+r.message);return r.id;}
 const emp=await create('employees',{employee_number:'PHOTO-1',first_name:'Photo',last_name:'Fixture',employment_status:'ACTIVE'});
 const asset=await create('assets',{asset_tag:'EVID-001',barcode:'EVID001',category_id:1,asset_type_id:1,asset_class_id:1,condition_id:1});
 const url='/api/assets/'+asset+'/360';
 const first=await call(url);assert.equal(first.status,200);assert.equal(first.completeness.percentage<100,true);assert(first.completeness.missing.includes('reference_photos'));
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
 const photo=await call('/api/employees/'+emp+'/photo','POST',{filename:'photo.png',mime_type:'image/png',base64:png});assert.equal(photo.status,200,photo.message);
 assert.equal((await call('/api/employees/'+emp+'/photo')).status,200);
 assert.equal((await call('/api/employees/'+emp+'/photo','POST',{filename:'replacement.png',mime_type:'image/png',base64:png})).status,200);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM employee_files WHERE employee_id=? AND is_active=1").get(emp).n,1);
 const activeBeforeFailure=sql.prepare("SELECT file_id FROM employee_files WHERE employee_id=? AND is_active=1").get(emp).file_id;
 const filesBeforeFailure=sql.prepare('SELECT COUNT(*) n FROM files').get().n;
 const objectsBeforePhotoFailure=stored.size;
 sql.exec("CREATE TRIGGER reject_employee_photo_fixture BEFORE INSERT ON employee_files BEGIN SELECT RAISE(ABORT,'fixture forced employee photo failure'); END;");
 const rejectedPhoto=await call('/api/employees/'+emp+'/photo','POST',{filename:'rollback.png',mime_type:'image/png',base64:png});
 assert.notEqual(rejectedPhoto.status,200,'Forced employee photo association failure must be rejected');
 sql.exec('DROP TRIGGER reject_employee_photo_fixture');
 assert.equal(sql.prepare("SELECT file_id FROM employee_files WHERE employee_id=? AND is_active=1").get(emp).file_id,activeBeforeFailure,'Previous employee photo must remain active');
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM files').get().n,filesBeforeFailure,'Employee file metadata must roll back');
 assert.equal(stored.size,objectsBeforePhotoFailure,'Failed employee photo object must be removed');
 assert.equal((await call('/api/employees/'+emp+'/photo','DELETE')).status,200);
 assert.equal((await call('/api/employees/'+emp+'/photo')).status,404);
 assert.equal((await call('/api/employees/'+emp+'/photo','POST',{filename:'bad.png',mime_type:'image/png',base64:'bm90YW5pbWFnZQ=='})).status,400);
 const fakeOffice=Buffer.from([80,75,3,4,0,0,0,0]).toString('base64');
 const quarantineBefore=stored.size;
 const officeUpload=await call(url+'/evidence','POST',{document_type:'QUOTATION',filename:'quote.docx',mime_type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',base64:fakeOffice});
 assert.equal(officeUpload.status,200);
 assert.equal(officeUpload.ok,true);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM evidence_quarantine WHERE status='PENDING_SCAN'").get().n,1);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM asset_files WHERE document_type='QUOTATION'").get().n,0);
 assert.equal(stored.size,quarantineBefore+1);
 assert.equal((await call(url+'/documents')).rows.some(x=>x.document_type==='QUOTATION'),false,'Pending Office documents must be invisible to evidence listing');
 const quarantineId=sql.prepare("SELECT quarantine_id FROM evidence_quarantine WHERE status='PENDING_SCAN'").get().quarantine_id;
 assert.equal((await call('/api/files/'+quarantineId)).status,404,'Quarantine IDs must not resolve through evidence download');
 const objectsBeforeInvalid=stored.size;
 const badMime=await call(url+'/evidence','POST',{document_type:'ASSET_PHOTO',filename:'wrong.jpg',mime_type:'image/jpeg',base64:png});
 assert.equal(badMime.status,400,'PNG bytes declared JPEG must be rejected');
 assert.equal(stored.size,objectsBeforeInvalid,'Rejected files must not be persisted');
 const nonImage=await call(url+'/evidence','POST',{document_type:'ASSET_PHOTO',filename:'wrong.txt',mime_type:'text/plain',base64:png});
 assert.equal(nonImage.status,400,'Photo evidence requires an image');
 assert.equal(stored.size,objectsBeforeInvalid);
 const beforeFailureCount=sql.prepare('SELECT COUNT(*) n FROM files').get().n;
 const beforeFailureObjects=stored.size;
 const failedRelation=await call(url+'/evidence','POST',{document_type:'ASSET_PHOTO',filename:'invalid-link.png',mime_type:'image/png',base64:png,related_assignment_id:999999999});
 assert.notEqual(failedRelation.status,200,'Invalid related assignment must fail');
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM files').get().n,beforeFailureCount,'D1 file metadata must roll back on association failure');
 assert.equal(stored.size,beforeFailureObjects,'R2 object must be compensated on D1 failure');
 for(let i=0;i<5;i++)assert.equal((await call(url+'/evidence','POST',{document_type:'ASSET_PHOTO',evidence_type:'FRONT',filename:'evidence-'+i+'.png',mime_type:'image/png',base64:png})).status,200);
 assert.equal((await call(url+'/evidence','POST',{document_type:'BARCODE_PHOTO',evidence_type:'BARCODE',filename:'barcode.png',mime_type:'image/png',base64:png})).status,200);
 const score=(await call(url)).completeness;assert.equal(score.checks.find(x=>x.key==='reference_photos').complete,true);assert.equal(score.checks.find(x=>x.key==='barcode_photo').complete,true);
 assert.equal((await call(url+'/barcode','POST',{new_barcode:'EVID002',replacement_reason:'Damaged label'})).status,200);
 assert.equal(sql.prepare('SELECT barcode FROM assets WHERE asset_id=?').get(asset).barcode,'EVID002');
 assert.equal((await call(url+'/condition','POST',{condition_id:1,event_type:'INSPECTION',notes:'Checked'})).status,200);
 assert.equal((await call(url+'/condition')).rows.length,1);
 assert.equal((await call(url+'/timeline')).status,200);
 const vendor=await create('vendors',{vendor_code:'V360',vendor_name:'Test Supplier',vendor_type:'SUPPLIER'});
 const po=await create('purchase_orders',{po_number:'PO-360',vendor_id:vendor,order_date:'2026-10-08',total_amount:'100',currency_code:'USD',status:'OPEN'});
 const invoice=await create('invoices',{invoice_number:'INV-360',vendor_id:vendor,purchase_order_id:po,invoice_date:'2026-10-08',amount:'100',currency_code:'USD'});
 await create('asset_financials',{asset_id:asset,purchase_order_id:po,invoice_id:invoice,acquisition_cost:'100'});
 const rec=await call(url+'/procurement');assert.equal(rec.status,200,rec.message);assert.equal(rec.reconciliation.cost_matched,true);
 sql.prepare("UPDATE invoices SET amount='101' WHERE invoice_id=?").run(invoice);
 assert.equal((await call(url+'/procurement')).reconciliation.cost_matched,false);
 assert.equal((await call(url)).completeness.checks.find(x=>x.key==='purchase_order').complete,true);
 const financePdf=Buffer.from('%PDF-1.7\\n1 0 obj <<>> endobj\\n%%EOF').toString('base64');
 assert.equal((await call(url+'/evidence','POST',{document_type:'INVOICE',filename:'invoice.pdf',mime_type:'application/pdf',base64:financePdf})).status,200);
 const restrictedFile=sql.prepare("SELECT af.file_id FROM asset_files af WHERE af.asset_id=? AND af.document_type='INVOICE' ORDER BY af.file_id DESC LIMIT 1").get(asset).file_id;
 const rootCookie=cookie;
 cookie='';
 assert.equal((await call('/api/files/'+restrictedFile)).status,401,'Unauthenticated evidence GET must be denied');
 async function loginViewer(name,scoped){
  const pass=await passwordHash('fixture-viewer-password');
  const id=Number(sql.prepare("INSERT INTO users(username,email,password_hash,is_active) VALUES (?,?,?,1)").run(name,name+'@example.test',pass).lastInsertRowid);
  for(const perm of ['assets.view','files.view']){
   sql.prepare("INSERT INTO user_permission_overrides(user_id,permission_id,effect) SELECT ?,permission_id,'ALLOW' FROM permissions WHERE permission_code=?").run(id,perm);
  }
  if(scoped)sql.prepare("INSERT INTO user_scopes(user_id,scope_type,access_level) VALUES (?,'ENTERPRISE','VIEW')").run(id);
  cookie='';
  const login=await call('/api/auth/login','POST',{email:name+'@example.test',password:'fixture-viewer-password'});
  assert.equal(login.status,200);
 }
 await loginViewer('finance-limited',true);
 assert.equal((await call('/api/files/'+restrictedFile)).status,403,'Non-finance enterprise viewer cannot download financial evidence');
 await loginViewer('outside-asset-scope',false);
 assert.equal((await call('/api/files/'+restrictedFile)).status,404,'Out-of-scope viewer cannot download evidence');
 cookie=rootCookie;
 assert.equal((await call('/api/files/'+restrictedFile)).status,200,'Authorized administrator can retrieve document');
 assert(sql.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action IN ('PROFILE_PHOTO_UPLOADED','PROFILE_PHOTO_REMOVED','BARCODE_REPLACED','CONDITION_RECORDED')").get().n>=4);
});
