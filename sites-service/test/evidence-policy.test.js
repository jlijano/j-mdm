import test from 'node:test';
import assert from 'node:assert/strict';
import {evidencePolicy} from '../worker/evidence-validation.js';
const b=s=>new TextEncoder().encode(s);
const pdf=b('%PDF-1.7\n%EOF');
test('business PDF and approved text workflows',()=>{
 assert.equal(evidencePolicy({mime:'application/pdf',filename:'po.pdf',documentType:'PURCHASE_ORDER',bytes:pdf}),'application/pdf');
 assert.equal(evidencePolicy({mime:'text/csv',filename:'count.csv',documentType:'INVENTORY_REPORT',bytes:b('asset,qty\nA1,1')}),'text/csv');
 assert.equal(evidencePolicy({mime:'text/plain',filename:'notes.txt',documentType:'DIAGNOSTIC',bytes:b('test log')}),'text/plain');
});
test('reject spoofing, prohibited workflow text and over-limit uploads',()=>{
 for(const p of [
  {mime:'application/pdf',filename:'po.exe',documentType:'PURCHASE_ORDER',bytes:pdf},
  {mime:'text/csv',filename:'x.csv',documentType:'INVOICE',bytes:b('a,b')},
  {mime:'text/plain',filename:'x.txt',documentType:'OTHER',bytes:b('data')},
  {mime:'application/octet-stream',filename:'x.exe',documentType:'OTHER',bytes:b('MZ')},
  {mime:'application/pdf',filename:'invoice.pdf',documentType:'INVOICE',bytes:new Uint8Array(15*1024*1024+1)}
 ])assert.throws(()=>evidencePolicy(p));
});
test('unscanned Office documents fail closed and cannot be published as clean',()=>{
 for(const [mime,name] of [
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document','purchase.docx'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','register.xlsx']
 ])assert.throws(()=>evidencePolicy({mime,filename:name,documentType:'QUOTATION',bytes:b('PK\u0003\u0004not yet scanned')}),/quarantine|scan/i);
});
