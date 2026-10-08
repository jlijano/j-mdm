import {one} from './data.js';

// The score reflects verifiable asset-level evidence only. Missing requirements
// are explicit so reviewers can resolve them without guessing.
export async function assetCompleteness(db,assetId,financeAccess){
 const evidence=await one(db,`SELECT
 COUNT(DISTINCT CASE WHEN af.document_type IN ('ASSET_PHOTO','RECEIVING_PHOTO','INVENTORY_PHOTO','DAMAGE_PHOTO','TRANSFER_PHOTO','RETURN_PHOTO','DISPOSAL_PHOTO') THEN af.file_id END) photo_count,
 MAX(CASE WHEN af.document_type IN ('BARCODE_PHOTO','ASSET_TAG_PHOTO') THEN 1 ELSE 0 END) barcode_photo,
 MAX(CASE WHEN af.document_type='PURCHASE_ORDER' THEN 1 ELSE 0 END) po_evidence,
 MAX(CASE WHEN af.document_type='DELIVERY_RECEIPT' THEN 1 ELSE 0 END) dr_evidence,
 MAX(CASE WHEN af.document_type='INVOICE' THEN 1 ELSE 0 END) invoice_evidence
 FROM asset_files af WHERE af.asset_id=? AND af.evidence_status='ACTIVE'`,assetId);
 const asset=await one(db,'SELECT barcode,serial_number FROM assets WHERE asset_id=?',assetId);
 const financial=await one(db,'SELECT purchase_order_id,invoice_id FROM asset_financials WHERE asset_id=?',assetId);
 const delivery=await one(db,'SELECT COUNT(*) count FROM delivery_receipt_lines WHERE asset_id=?',assetId);
 const assignment=await one(db,'SELECT COUNT(*) count FROM asset_assignments WHERE asset_id=?',assetId);
 const checks=[
  {key:'identity',label:'Asset identity (barcode or serial number)',complete:!!(asset?.barcode||asset?.serial_number)},
  {key:'reference_photos',label:'Five asset reference photos',complete:Number(evidence?.photo_count||0)>=5,count:Number(evidence?.photo_count||0),required:5},
  {key:'barcode_photo',label:'Barcode or asset-tag photograph',complete:!!evidence?.barcode_photo},
  {key:'purchase_order',label:'Linked purchase order or supporting document',complete:!!(financial?.purchase_order_id||evidence?.po_evidence)},
  {key:'delivery_receipt',label:'Linked delivery receipt or supporting document',complete:!!(Number(delivery?.count||0)||evidence?.dr_evidence)},
  {key:'invoice',label:'Linked invoice or supporting document',complete:!!(financial?.invoice_id||evidence?.invoice_evidence)},
  {key:'custody',label:'Assignment or custody history',complete:Number(assignment?.count||0)>0}
 ];
 // Do not reveal finance document existence to users lacking finance access.
 const visible=financeAccess?checks:checks.filter(c=>!['purchase_order','invoice'].includes(c.key));
 const completed=visible.filter(c=>c.complete).length;
 return {completed,total:visible.length,percentage:Math.round(completed/visible.length*100),checks:visible,missing:visible.filter(c=>!c.complete).map(c=>c.key)};
}
