import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { hashPassword } from '../auth.js';

async function fixture(t, options={}) {
 const server=createServer({adminEmail:'admin@example.com',passwordHash:await hashPassword('test-password'),secureCookies:true,...options});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const login=(email='admin@example.com',password='test-password',origin=base)=>fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password}),redirect:'manual'});
 return {base,login};
}
test('login-first, credential validation, protected assets, admin session, logout revocation',async t=>{
 const {base,login}=await fixture(t);
 for(const route of ['/','/dashboard','/index.html','/app.js','/vendor/zxing.min.js']){const r=await fetch(base+route,{redirect:'manual'});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/login')}
 assert.equal((await fetch(base+'/login')).status,200);
 assert.equal((await fetch(base+'/api/auth/me')).status,401);
 assert.equal((await login('admin@example.com','wrong')).status,401);
 assert.equal((await login('other@example.com')).status,401);
 assert.equal((await login('admin@example.com','test-password','https://attacker.example')).status,403);
 const r=await login(' ADMIN@EXAMPLE.COM ');assert.equal(r.status,200);assert.equal((await r.json()).redirect,'/dashboard');
 const setCookie=r.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);assert.match(setCookie,/Secure/);
 const cookie=setCookie.split(';')[0],headers={Cookie:cookie};
 const who=await fetch(base+'/api/auth/me',{headers});assert.deepEqual(await who.json(),{user:{email:'admin@example.com',role:'Super Admin'}});
 const dashboard=await fetch(base+'/dashboard',{headers});assert.equal(dashboard.status,200);assert.match(await dashboard.text(),/Main Dashboard/);
 assert.equal((await fetch(base+'/app.js',{headers})).status,200);
 assert.equal((await fetch(base+'/login',{headers,redirect:'manual'})).headers.get('location'),'/dashboard');
 const logout=await fetch(base+'/api/auth/logout',{method:'POST',headers:{...headers,Origin:base}});assert.equal(logout.status,200);
 assert.equal((await fetch(base+'/api/auth/me',{headers})).status,401);
 assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:cookie.replace(/.$/,'0')}})).status,401);
});
test('failed attempts are limited',async t=>{const {login}=await fixture(t);for(let n=0;n<5;n++)assert.equal((await login('admin@example.com','wrong')).status,401);assert.equal((await login()).status,429)});
test('expired sessions and missing configuration fail closed',async t=>{
 const {base,login}=await fixture(t,{sessionTTL:1});const r=await login();const cookie=r.headers.get('set-cookie').split(';')[0];await new Promise(resolve=>setTimeout(resolve,5));assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).status,401);
 const missing=await fixture(t,{passwordHash:'invalid'});assert.equal((await missing.login()).status,503);
});
