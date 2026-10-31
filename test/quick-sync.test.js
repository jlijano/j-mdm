import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=readFileSync(new URL('../dist/quick-sync.js',import.meta.url),'utf8');
function browser(service,initial={}){
 const map=new Map(Object.entries(initial)),store={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
 let chain=Promise.resolve();const window=new EventTarget();const sandbox={window,localStorage:store,navigator:{locks:{request:(_n,fn)=>{const p=chain.then(fn);chain=p.catch(()=>{});return p}}},crypto:webcrypto,TextEncoder,Event,AbortSignal,fetch:service};vm.runInNewContext(source,sandbox);return{api:window.QuickStore,map,store};
}
function server(){let events=[],seen=new Map(),online=true;return{get events(){return events},set online(v){online=v},async fetch(url,init){if(!online)throw Error('Offline');const path=url.split('/api/quick-sync/')[1];let result;if(path==='context')result={tenant:'test',userId:1,canWrite:true};else if(path.startsWith('events')){const n=Number(new URL('https://test/'+path).searchParams.get('after')||0);result={events:events.filter(e=>e.sequence>n),cursor:events.length,more:false}}else{const op=JSON.parse(init.body),prior=seen.get(op.operationId),current=events.findLast(e=>e.kind===op.kind&&e.id===op.id);if(prior)result={event:prior};else if(op.action==='import'&&current&&JSON.stringify(current.payload)===JSON.stringify(op.payload))result={event:current};else if((current?.revision||0)!==op.base)result={conflict:true,current};else{const event={...op,sequence:events.length+1,revision:op.base+1,deleted:op.action==='delete'};events.push(event);seen.set(op.operationId,event);result={event}}}return{ok:true,json:async()=>result}}}}
const assetKey='jmdm-quick-records-v1',scanKey='jmdm-quick-scans-v1';
const settle=()=>new Promise(r=>setTimeout(r,15));
test('original raw data remains intact through migration, two browsers, offline retry and reversion',async()=>{
 const s=server(),raw='[ {"barcode":"A","assignee":"Original","unknown":"retained"} ]',scans='[{"barcode":"A","at":"2026-10-31"}]';
 const a=browser(s.fetch,{[assetKey]:raw,[scanKey]:scans}),b=browser(s.fetch);
 await a.api.connect();await a.api.migrate();await a.api.sync();assert.equal(s.events.length,2);
 await a.api.migrate();await a.api.sync();assert.equal(s.events.length,2,'duplicate imports replay safely');
 await b.api.connect();await b.api.migrate();await b.api.sync();assert.equal(b.api.read(assetKey)[0].assignee,'Original');
 const oldB=b.api.read(assetKey)[0];s.online=false;
 const edited={...a.api.read(assetKey)[0],assignee:'Offline edit'};await a.api.write(assetKey,[edited]);await settle();assert.equal(a.api.read(assetKey)[0].assignee,'Offline edit');assert([...a.map.keys()].some(k=>k.includes(':op:')));
 s.online=true;await a.api.sync();await b.api.sync();assert.equal(b.api.read(assetKey)[0].assignee,'Offline edit');
 await b.api.write(assetKey,[{...oldB,assignee:'Concurrent edit'}]);await settle();await b.api.sync();assert([...b.map.values()].some(v=>v.includes('"conflict":')));assert.equal(s.events.at(-1).payload.assignee,'Offline edit');
 // A stale unchanged row must never overwrite a remote update or imply deletion.
 await a.api.write(assetKey,[{barcode:'B'}]);await settle();await a.api.sync();assert.equal(a.api.read(assetKey).length,2);
 await a.api.remove(assetKey,a.api.read(assetKey).find(r=>r.barcode==='B'));await settle();await a.api.sync();assert.equal(a.api.read(assetKey).length,1);
 assert.equal(a.store.getItem(assetKey),raw);assert.equal(a.store.getItem(scanKey),scans);assert([...a.map.keys()].some(k=>k.includes('backup:')));
 a.store.setItem('jmdm-sync-v1:test:1:enabled','false');const reverted=browser(s.fetch,Object.fromEntries(a.map));await reverted.api.connect();assert.equal(reverted.api.active,false);assert.equal(reverted.api.read(assetKey)[0].assignee,'Original');
});
test('local writes snapshot exact raw bytes; corrupt source remains downloadable and is not replaced',async()=>{
 const a=browser(server().fetch,{[assetKey]:'[ {"barcode":"OLD"} ]',[scanKey]:'[]'});await a.api.write(assetKey,[{barcode:'NEW'}]);const backups=[...a.map].filter(([k])=>k.includes('backup:'));assert.equal(JSON.parse(backups[0][1]).recordsRaw,'[ {"barcode":"OLD"} ]');
 const bad=browser(server().fetch,{[assetKey]:'not-json'});await bad.api.connect();await assert.rejects(bad.api.migrate());assert.equal(bad.store.getItem(assetKey),'not-json');assert.equal(bad.api.active,false);
});
test('quick scanner inline scripts remain valid after async persistence wiring',()=>{
 const html=readFileSync(new URL('../dist/quick.html',import.meta.url),'utf8');for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())assert.doesNotThrow(()=>new vm.Script(match[1]));
});
test('partial migration and a committed response lost in transit both resume without loss',async()=>{
 const s=server(),raw='[{"barcode":"ONE"},{"barcode":"TWO"}]';let lose=true;
 const a=browser(async(url,init)=>{const r=await s.fetch(url,init);if(url.endsWith('mutate')&&lose){lose=false;throw Error('Response lost after commit')}return r},{[assetKey]:raw,[scanKey]:'[]'});
 await a.api.connect();const originalSet=a.store.setItem;let writes=0;a.store.setItem=(k,v)=>{if(k.includes(':op:')&&++writes===2)throw Error('Quota fixture');originalSet(k,v)};
 await assert.rejects(a.api.migrate(),/Quota/);assert.equal(a.store.getItem(assetKey),raw);assert.equal(a.api.active,false);
 a.store.setItem=originalSet;await a.api.migrate();await a.api.sync();assert.equal(s.events.length,1);assert([...a.map.keys()].some(k=>k.includes(':op:')));
 await a.api.sync();assert.equal(s.events.length,2);assert.equal(a.api.read(assetKey).length,2);assert.equal(a.store.getItem(assetKey),raw);
});
