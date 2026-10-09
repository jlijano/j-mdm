import {fail} from './data.js';
const signatures={
 'image/jpeg': b=>b[0]===255&&b[1]===216&&b[2]===255,
 'image/png': b=>b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10,
 'image/webp': b=>b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80,
 'application/pdf': b=>b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45
};
export function validateEvidenceMime(mime,bytes,{photo=false}={}){
 const name=String(mime||'').toLowerCase().trim();
 if(!Object.hasOwn(signatures,name))fail('Choose a supported JPEG, PNG, WebP or PDF file.');
 if(photo&&!name.startsWith('image/'))fail('Photo evidence must be a supported image.');
 if(!signatures[name](bytes))fail('File content does not match its declared format.');
 return name;
}
