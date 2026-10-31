import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/login.js',import.meta.url),'utf8');
for(const retained of [true,false])test(`login ${retained?'navigates only after a confirmed session':'shows an error when the browser loses the session'}`,async()=>{
 const form={email:{value:'fixture@example.com'},password:{value:'fixture-password'}},error={hidden:true},button={},show={},requests=[],navigations=[];
 const elements={'#login-form':form,'#login-error':error,'#login-submit':button,'#show-password':show};
 const context={URLSearchParams,document:{querySelector:s=>elements[s]},location:{replace:p=>navigations.push(p)},fetch:async(path,opts)=>{requests.push({path,opts});return{ok:path.endsWith('/login')||retained,status:path.endsWith('/login')||retained?200:401,json:async()=>({ok:true})};}};
 vm.runInNewContext(source,context);await form.onsubmit({preventDefault(){}});
 assert.equal(requests.length,2);assert.equal(requests[1].path,'/api/auth/me');assert.equal(requests[1].opts.credentials,'same-origin');
 if(retained)assert.deepEqual(navigations,['/dashboard']);else{assert.deepEqual(navigations,[]);assert.equal(error.hidden,false);assert.match(error.textContent,/session could not be saved/);assert.equal(button.disabled,false);}
});

for(const [returnTo,target]of [['/quick/assets','/quick/assets'],['/quick','/quick'],['https://attacker.invalid','/dashboard'],['//attacker.invalid','/dashboard']])test('login return target is constrained: '+returnTo,async()=>{
 const form={email:{value:'fixture'},password:{value:'fixture'}},navigations=[];
 const elements={'#login-form':form,'#login-error':{},'#login-submit':{},'#show-password':{}};
 vm.runInNewContext(source,{URLSearchParams,document:{querySelector:s=>elements[s]},location:{search:'?returnTo='+encodeURIComponent(returnTo),replace:p=>navigations.push(p)},fetch:async()=>({ok:true,json:async()=>({})})});
 await form.onsubmit({preventDefault(){}});assert.deepEqual(navigations,[target]);
});
