// Print-only asset label generator. Identifiers are read from authorized Asset 360 data.
(()=>{
 const $=id=>document.getElementById(id);
 let current=null,canvas=null;
 const dialog=()=> $('asset-label-dialog');
 function render(){
  const target=$('asset-label-preview'),error=$('asset-label-error');
  target.replaceChildren();error.hidden=true;canvas=null;
  if(!current)return;
  try{
   const value=current.value,type=$('asset-label-type').value;
   if(!value||value.length>128)throw Error('The asset identifier must be between 1 and 128 characters.');
   const sheet=document.createElement('div');sheet.className='asset-label-sheet';
   const heading=document.createElement('strong');heading.textContent='J-MDM · ASSET';sheet.append(heading);
   if(type==='barcode'){
    if(!/^[\x20-\x7E]+$/.test(value))throw Error('Code 128 supports printable ASCII only. Select QR code for this identifier.');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('aria-label','Code 128 for '+value);svg.setAttribute('role','img');
    sheet.append(svg);
    JsBarcode(svg,value,{format:'CODE128',width:2,height:92,margin:12,displayValue:false,lineColor:'#000',background:'#fff'});
   }else{
    const slot=document.createElement('div');slot.className='asset-label-qr';sheet.append(slot);
    new QRCode(slot,{text:value,width:208,height:208,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
   }
   const label=document.createElement('b');label.textContent=current.tag;sheet.append(label);
   const sub=document.createElement('small');sub.textContent=value;sheet.append(sub);
   target.append(sheet);
   canvas=document.createElement('canvas');canvas.width=760;canvas.height=type==='qr'?850:500;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.fillStyle='#101c35';ctx.textAlign='center';ctx.font='bold 26px Arial';ctx.fillText('J-MDM  |  ASSET',380,62);
   const finish=()=>{
    ctx.fillStyle='#101c35';ctx.textAlign='center';ctx.font='bold 30px Arial';
    ctx.fillText(current.tag.slice(0,38),380,canvas.height-93);
    ctx.font='20px Arial';ctx.fillText(value.slice(0,55),380,canvas.height-54);
   };
   if(type==='barcode'){
    const svg=sheet.querySelector('svg');const xml=new XMLSerializer().serializeToString(svg);
    const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));
    const img=new Image();canvas=null;img.onload=()=>{ctx.drawImage(img,65,105,630,215);finish();canvas=ctx.canvas;URL.revokeObjectURL(url);};img.onerror=()=>{URL.revokeObjectURL(url);error.textContent='Unable to prepare the barcode image. Try again.';error.hidden=false;};img.src=url;
   }else{
    const source=sheet.querySelector('canvas, img');
    if(!source)throw Error('QR image could not be rendered.');
    if(source.tagName==='CANVAS'){ctx.drawImage(source,172,125,416,416);finish();}
    else {const img=new Image();canvas=null;img.onload=()=>{ctx.drawImage(img,172,125,416,416);finish();canvas=ctx.canvas;};img.src=source.src;}
   }
  }catch(e){error.textContent=e.message||'Label cannot be generated.';error.hidden=false;target.textContent='Label unavailable.';}
 }
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-asset-label]');
  if(!button)return;
  current={value:button.dataset.labelValue||'',tag:button.dataset.labelTag||''};
  if(!current.value)return;
  $('asset-label-type').value='barcode';dialog().showModal();render();
 });
 $('asset-label-type').addEventListener('change',render);
 $('asset-label-close').addEventListener('click',()=>dialog().close());
 $('asset-label-download').addEventListener('click',()=>{
  if(!canvas){$('asset-label-error').textContent='Label image is not ready. Please try again.';$('asset-label-error').hidden=false;return;}
  const a=document.createElement('a');a.download='J-MDM-asset-label-'+(current.tag.replace(/[^a-z0-9_-]/gi,'_').slice(0,40)||'asset')+'.png';a.href=canvas.toDataURL('image/png');a.click();
 });
 $('asset-label-print').addEventListener('click',()=>{
  if(!canvas){$('asset-label-error').textContent='Label image is not ready. Please try again.';$('asset-label-error').hidden=false;return;}
  const w=window.open('','_blank','noopener,noreferrer,width=800,height=650');
  if(!w){$('asset-label-error').textContent='Allow pop-ups to print the label.';$('asset-label-error').hidden=false;return;}
  const doc=w.document;doc.title='J-MDM Asset Label';const style=doc.createElement('style');
  style.textContent='@page{size:60mm 45mm;margin:2mm}body{margin:0;display:grid;place-items:center}img{width:100%;max-height:40mm;object-fit:contain;print-color-adjust:exact}';
  doc.head.append(style);const img=doc.createElement('img');img.alt='Asset identification label';img.src=canvas.toDataURL('image/png');
  img.onload=()=>{w.focus();w.print();};doc.body.append(img);
 });
})();
