import test from 'node:test';
import assert from 'node:assert/strict';
import {validatedEvidence} from '../worker/evidence-validation.js';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
const evidence=(bytes,mime_type,filename)=>({base64:Buffer.from(bytes).toString('base64'),mime_type,filename});
test('Evidence validates JPEG/PNG/WebP MIME and extensions',()=>{
 assert.equal(validatedEvidence(evidence(png,'image/png','front.png'),'ASSET_PHOTO').mime,'image/png');
 assert.throws(()=>validatedEvidence(evidence(png,'image/jpeg','front.jpg'),'ASSET_PHOTO'));
 assert.throws(()=>validatedEvidence(evidence(png,'image/png','front.jpg'),'ASSET_PHOTO'));
 assert.throws(()=>validatedEvidence(evidence(Buffer.from('not-image'),'image/png','front.png'),'ASSET_PHOTO'));
});
test('Evidence rejects unscanned documents, executables and invalid paths',()=>{
 assert.throws(()=>validatedEvidence(evidence(Buffer.from('%PDF-1.5\n'),'application/pdf','invoice.pdf'),'INVOICE'));
 assert.throws(()=>validatedEvidence(evidence(Buffer.from('MZ'),'application/octet-stream','bad.exe'),'OTHER'));
 assert.throws(()=>validatedEvidence(evidence(png,'image/png','../front.png'),'ASSET_PHOTO'));
 assert.throws(()=>validatedEvidence(evidence(png,'image/png','front.png'),'ASSET_PHOTO',10));
});
test('Evidence photo categories do not accept documents',()=>{
 assert.throws(()=>validatedEvidence(evidence(Buffer.from('%PDF-1.5\n'),'application/pdf','photo.pdf'),'BARCODE_PHOTO'));
});
