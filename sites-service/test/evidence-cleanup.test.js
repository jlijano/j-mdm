import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers.js';
import {cleanupFailedEvidence,retryEvidenceCleanup} from '../worker/evidence-cleanup.js';

test('failed R2 delete persists recovery work and next retry removes object',async()=>{
 const {db,sql}=database();
 const objects=new Set(['temporary-object']);
 let fail=true;
 const bucket={delete:async key=>{if(fail)throw Error('simulated transient error');objects.delete(key);}};
 assert.equal(await cleanupFailedEvidence(db,bucket,'temporary-object'),false);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM evidence_cleanup_queue').get().n,1);
 assert.equal(objects.has('temporary-object'),true);
 fail=false;
 await retryEvidenceCleanup(db,bucket);
 assert.equal(objects.has('temporary-object'),false);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM evidence_cleanup_queue').get().n,0);
});
test('recovery never removes an object referenced by a live file metadata row',async()=>{
 const {db,sql}=database();
 sql.prepare("INSERT INTO evidence_cleanup_queue(storage_path) VALUES ('retained-object')").run();
 sql.prepare("INSERT INTO users(username,email,password_hash) VALUES ('cleanup-fixture','cleanup@example.test','fixture-hash')").run();
 sql.prepare("INSERT INTO files(original_filename,stored_filename,storage_path,uploaded_by) VALUES ('keep.pdf','retained-object','retained-object',1)").run();
 let deletions=0;
 const bucket={delete:async()=>{deletions++;}};
 await retryEvidenceCleanup(db,bucket);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM evidence_cleanup_queue').get().n,1);
 assert.equal(deletions,0,'Referenced objects must never be deleted during recovery');
});
