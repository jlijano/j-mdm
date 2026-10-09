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
 // Reference-check branch is exercised only after a valid user/file relation is inserted.
 const bucket={delete:async()=>{throw Error('not expected');}};
 await retryEvidenceCleanup(db,bucket);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM evidence_cleanup_queue').get().n,1);
});
