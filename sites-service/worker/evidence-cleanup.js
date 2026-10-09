import {one,rows,query} from './data.js';

// Persist a failed object deletion without exposing object keys or exception details in logs.
export async function cleanupFailedEvidence(db,bucket,key){
 try { await bucket.delete(key); return true; }
 catch (error) {
  try {
   await query(db,"INSERT INTO evidence_cleanup_queue(storage_path,attempts,last_error,last_attempt_at) VALUES (?,1,'DELETE_FAILED',strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(storage_path) DO UPDATE SET attempts=attempts+1,last_error='DELETE_FAILED',last_attempt_at=excluded.last_attempt_at",key).run();
  } catch { console.error('Evidence cleanup queue persistence failed; manual storage reconciliation required'); }
  return false;
 }
}

// Best-effort, bounded retry. Never delete an object referenced by an active files row.
// Called during initialization and can run again after a new isolate starts.
export async function retryEvidenceCleanup(db,bucket){
 if(!bucket) return;
 let pending;
 try { pending=await rows(db,'SELECT storage_path FROM evidence_cleanup_queue ORDER BY created_at LIMIT 10'); }
 catch { console.error('Evidence cleanup queue unavailable; apply migration before enabling recovery'); return; }
 for(const item of pending){
  if(await one(db,'SELECT file_id FROM files WHERE storage_path=? LIMIT 1',item.storage_path)){
   await query(db,"UPDATE evidence_cleanup_queue SET last_error='OBJECT_REFERENCED' WHERE storage_path=?",item.storage_path).run();
   continue;
  }
  try{
   await bucket.delete(item.storage_path);
   await query(db,'DELETE FROM evidence_cleanup_queue WHERE storage_path=?',item.storage_path).run();
  }catch{
   await query(db,"UPDATE evidence_cleanup_queue SET attempts=attempts+1,last_error='RETRY_FAILED',last_attempt_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE storage_path=?",item.storage_path).run();
  }
 }
}
