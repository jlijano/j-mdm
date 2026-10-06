import {createAuth} from './auth.js';
export function createRemoteAuth(options={}){
 const siteURL=options.siteURL||process.env.SITE_API_URL;
 if(!siteURL)return createAuth(options);
 const origin=new URL(siteURL);if(origin.protocol!=='https:'&&!options.allowHTTP)throw new Error('SITE_API_URL must use HTTPS');
 const secret=options.siteSecret||process.env.SITE_API_SECRET,bearer=options.siteBearer||process.env.SITE_SERVICE_TOKEN;
 if(!secret||!bearer)throw new Error('Sites API credentials are missing');
 const publicPaths=new Set(['/login','/login.js','/login.css','/style.css','/icon.svg']);const attempts=new Map();
 async function remote(req,pathname,{method=req.method,body}={}){
  const url=new URL(pathname,origin);if(url.origin!==origin.origin)throw new Error('Invalid API path');
  return fetch(url,{method,headers:{'OAI-Sites-Authorization':`Bearer ${bearer}`,'x-mdm-api-secret':secret,'content-type':'application/json',cookie:req.headers.cookie||'','user-agent':req.headers['user-agent']||'mdm-render-gateway'},body,redirect:'manual',signal:AbortSignal.timeout(25000)});
 }
 const send=(res,code,data)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(data));};
 const redirect=(res,url)=>{res.writeHead(303,{location:url});res.end();};
 async function authenticated(req){const r=await remote(req,'/api/auth/me',{method:'GET'});if(r.status===401)return false;if(!r.ok)throw new Error('Database sign-in unavailable');return true;}
 return{
  async handle(req,res,pathname){
   if(pathname.startsWith('/api/')){
    try{
     if(!['GET','POST','PATCH'].includes(req.method)){send(res,405,{message:'Method not allowed.'});return true;}
     if(req.method!=='GET'){
      let same=false;try{const o=new URL(req.headers.origin);same=o.host===req.headers.host&&['https:','http:'].includes(o.protocol);}catch{}if(!same){send(res,403,{message:'This request is not allowed.'});return true;}
     }
     if(pathname==='/api/auth/login'&&req.method==='POST'){
      const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim(),time=Date.now();for(const [k,v]of attempts)if(v.until<=time)attempts.delete(k);
      const a=attempts.get(ip)||{count:0,until:time+900000};if(a.count>=5||attempts.size>=10000){send(res,429,{message:'Too many attempts. Try again in 15 minutes.'});return true;}a.count++;attempts.set(ip,a);
     }
     let body;if(req.method!=='GET'){if(!(req.headers['content-type']||'').startsWith('application/json')){send(res,400,{message:'JSON request required.'});return true;}body='';for await(const c of req){body+=c;if(Buffer.byteLength(body)>7500000){send(res,413,{message:'Request too large.'});return true;}}}
     const upstream=await remote(req,req.url,{body});if(upstream.status>=300&&upstream.status<400)throw new Error('Sites gateway unavailable');
     if(pathname==='/api/auth/login'&&upstream.ok){const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim();attempts.delete(ip);}
     res.writeHead(upstream.status,{'content-type':upstream.headers.get('content-type')||'application/json',...(upstream.headers.get('set-cookie')?{'set-cookie':upstream.headers.get('set-cookie')}:{}),...(upstream.headers.get('content-disposition')?{'content-disposition':upstream.headers.get('content-disposition')}:{} )});res.end(Buffer.from(await upstream.arrayBuffer()));
    }catch{send(res,503,{message:'Shared database is unavailable. Please try again.'});}return true;
   }
   if(pathname==='/'||pathname==='/login'){try{const logged=await authenticated(req);if(pathname==='/'||logged){redirect(res,logged?'/dashboard':'/login');return true;}}catch{if(pathname==='/'){redirect(res,'/login');return true;}}}return false;
  },
  async deny(req,res,pathname){if(publicPaths.has(pathname))return false;try{if(await authenticated(req))return false;redirect(res,'/login');}catch{send(res,503,{message:'Shared database unavailable. Please try again.'});}return true;}
 };
}
