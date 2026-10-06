const enc=new TextEncoder();
export const now=()=>new Date().toISOString();
export const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async v=>hex(await crypto.subtle.digest('SHA-256',enc.encode(v)));
export async function passwordHash(password,salt=random()) {
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256);
 return `pbkdf2:${salt}:${hex(bits)}`;
}
export async function verify(password,stored){if(!stored?.startsWith('pbkdf2:'))return false;const actual=await passwordHash(password,stored.split(':')[1]);let diff=actual.length^stored.length;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^(stored.charCodeAt(i)||0);return diff===0;}
export const sessionToken=req=>/\bmdm_session=([a-f0-9]{64})\b/.exec(req.headers.get('cookie')||'')?.[1];
export const sessionCookie=(value,age=28800)=>`mdm_session=${value}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${age}`;
