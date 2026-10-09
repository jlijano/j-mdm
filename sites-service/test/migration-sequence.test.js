import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url)));
const file=tag=>new URL('../drizzle/'+tag+'.sql',import.meta.url);
function apply(db,entries){
 for(const entry of entries)db.exec(readFileSync(file(entry.tag),'utf8'));
}
test('Drizzle journal registers every SQL migration in strict sequence',()=>{
 assert.deepEqual(journal.entries.map(e=>e.idx),journal.entries.map((_,i)=>i));
 assert.deepEqual(journal.entries.slice(-2).map(e=>e.tag),['0005_asset_360','0006_evidence_cleanup_queue']);
 assert(journal.entries.every((e,i)=>existsSync(file(e.tag))&&(i===0||e.when>journal.entries[i-1].when)));
});
test('fresh schema applies all journaled migrations including cleanup queue',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 try{apply(db,journal.entries);assert(db.prepare("SELECT name FROM sqlite_master WHERE name='evidence_cleanup_queue'").get());assert(db.prepare("SELECT name FROM sqlite_master WHERE name='asset_condition_history'").get());}finally{db.close();}
});
test('existing schema through migration 0004 upgrades additively, preserving data',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 try{
  apply(db,journal.entries.slice(0,5));
  db.prepare("INSERT INTO system_settings(setting_key,setting_value) VALUES ('fixture:preserve','retained')").run();
  apply(db,journal.entries.slice(5));
  assert.equal(db.prepare("SELECT setting_value FROM system_settings WHERE setting_key='fixture:preserve'").get().setting_value,'retained');
  assert(db.prepare("SELECT name FROM sqlite_master WHERE name='evidence_cleanup_queue'").get());
  assert(db.prepare("SELECT name FROM sqlite_master WHERE name='asset_condition_history'").get());
 }finally{db.close();}
});
