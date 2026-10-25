import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {generateKeyPair,exportJWK,exportPKCS8,SignJWT} from 'jose';
import {Miniflare} from './miniflare.mjs';
import {JSDOM} from 'jsdom';

test('native admin passwords enforce verified identity, current roles, CSRF, revocation, expiry and logout',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/admin-password-worker.ts'],outfile:'work/admin-password.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256',{extractable:true}),jwk={...await exportJWK(publicKey),kid:'password-test'},now=Math.floor(Date.now()/1000);
 let disabled=false,validSince='0',unavailable=false;const seen=[];
 const mf=new Miniflare({modules:true,scriptPath:'work/admin-password.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_PASSWORD_LOGIN_ENABLED:'true',ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:'https://test.cloudflareaccess.com',CF_ACCESS_AUD:'legacy',FIREBASE_AUTH_ENABLED:'true',FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'vanta-noir',client_email:'test@vanta-noir.iam.gserviceaccount.com',private_key:await exportPKCS8(privateKey)})},outboundService:async request=>{
  seen.push(request.url);if(request.url.includes('/jwk/securetoken@'))return Response.json({keys:[jwk]});
  if(request.url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test',expires_in:3600});
  assert.ok(request.url.endsWith('accounts:lookup'),'Native credentials must never reach Cloudflare identity endpoints');
  if(unavailable)return Response.json({error:{message:'UNAVAILABLE'}},{status:503});
  const body=await request.json();return Response.json({users:[{localId:body.localId[0],email:body.localId[0]+'@example.com',emailVerified:true,disabled,validSince}]});
 }});
 try {
  const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=(await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','');await db.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));}
  let ip=0;const token=(user='owner',claims={},issuer='https://securetoken.google.com/vanta-noir')=>new SignJWT({sub:user,email:user+'@example.com',email_verified:true,auth_time:now,firebase:{sign_in_provider:'password'},...claims}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(issuer).setAudience('vanta-noir').setIssuedAt().setExpirationTime('1h').sign(privateKey);
  const post=(path,body,headers={})=>mf.dispatchFetch('https://test/api/admin-auth/'+path,{method:'POST',headers:{Origin:'https://test','Content-Type':'application/json','cf-connecting-ip':'192.0.2.'+(++ip),...headers},body:JSON.stringify(body)});
  const read=(cookie='',path='/api/admin/crm',headers={})=>mf.dispatchFetch('https://test'+path,{headers:{Cookie:cookie,...headers}});
  const owner=await token();
  assert.equal((await read()).status,401);
  assert.equal((await read('customer-session=ordinary','/api/admin/crm',{Authorization:'Bearer '+owner,'X-Role':'owner','cf-access-jwt-assertion':owner})).status,401);
  assert.equal((await post('session',{idToken:owner},{Origin:'https://evil.invalid'})).status,403);
  assert.equal((await post('session',{idToken:owner},{Origin:''})).status,403);
  assert.equal((await post('session',{idToken:owner},{'Content-Type':'text/plain'})).status,415);
  assert.equal((await post('session',{idToken:'forged'.repeat(30)})).status,401);
  for(const bad of [await token('owner',{email_verified:false}),await token('owner',{auth_time:now-700}),await token('owner',{},'https://securetoken.google.com/other-project'),await token('owner',{firebase:{sign_in_provider:'google.com'}})])assert.equal((await post('session',{idToken:bad})).status,401);
  assert.equal((await post('session',{idToken:await token('customer')})).status,403);
  disabled=true;assert.equal((await post('session',{idToken:owner})).status,401);disabled=false;
  validSince=String(now+1);assert.equal((await post('session',{idToken:owner})).status,401);validSince='0';
  const login=async(user='owner',headers={})=>{const r=await post('session',{idToken:await token(user)},headers);assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true});const c=r.headers.get('Set-Cookie');assert.match(c,/HttpOnly; Secure; SameSite=Strict; Max-Age=28800/);assert.ok(!c.includes('Domain='));return c.split(';')[0];};
  let cookie=await login();assert.equal((await read(cookie)).status,200);
  const records=await db.prepare("SELECT key,value FROM store_meta WHERE key LIKE 'admin-password-session:%'").all();assert.equal(records.results.length,1);assert.ok(!JSON.stringify(records).includes(cookie.split('=')[1]));assert.ok(!JSON.stringify(records).includes(owner));
  assert.equal((await db.prepare("SELECT count(*) n FROM admin_audit WHERE action='admin sign-in'").first()).n,1);
  assert.equal((await mf.dispatchFetch('https://test/api/admin/crm',{method:'POST',headers:{Cookie:cookie,Origin:'https://evil.invalid'}})).status,403);
  assert.equal((await post('logout',{}, {Cookie:cookie,Origin:'https://evil.invalid'})).status,403);assert.equal((await read(cookie)).status,200);
  const old=cookie;cookie=await login('owner',{Cookie:cookie});assert.equal((await read(old)).status,401);
  unavailable=true;assert.equal((await read(cookie)).status,503);unavailable=false;
  validSince=String(now+1);assert.equal((await read(cookie)).status,401);validSince='0';assert.equal((await read(cookie)).status,401,'revoked sessions stay invalid');
  cookie=await login();disabled=true;assert.equal((await read(cookie)).status,401);disabled=false;
  cookie=await login();await db.prepare("UPDATE store_meta SET value=json_set(value,'$.expiresAt',1) WHERE key LIKE 'admin-password-session:%'").run();assert.equal((await read(cookie)).status,401);
  cookie=await login();const logout=await post('logout',{}, {Cookie:cookie});assert.equal(logout.status,200);assert.match(logout.headers.get('Set-Cookie'),/Max-Age=0/);assert.equal((await read(cookie)).status,401);
  await db.prepare("INSERT INTO admin_staff(email,role,active) VALUES('support@example.com','support',1)").run();cookie=await login('support');assert.equal((await read(cookie,'/api/admin/support')).status,200);assert.equal((await read(cookie)).status,403);
  await db.prepare("UPDATE admin_staff SET active=0 WHERE email='support@example.com'").run();assert.equal((await read(cookie,'/api/admin/support')).status,401);
  for(let i=0;i<10;i++)assert.equal((await post('session',{idToken:'invalid'.repeat(20)},{'cf-connecting-ip':'rate-test'})).status,401);
  assert.equal((await post('session',{idToken:owner},{'cf-connecting-ip':'rate-test'})).status,429);
  await db.prepare("INSERT INTO store_meta(key,value) VALUES('admin-password-session:expired',?)").bind(JSON.stringify({expiresAt:1})).run();await mf.dispatchFetch('https://test/test/cleanup');assert.equal(await db.prepare("SELECT key FROM store_meta WHERE key='admin-password-session:expired'").first(),null);

  const page=await mf.dispatchFetch('https://test/admin-login'),html=await page.text();assert.match(page.headers.get('Content-Security-Policy'),/default-src 'none'/);
  const dom=new JSDOM(html,{url:'https://test/admin-login',runScripts:'dangerously',beforeParse(window){window.AbortSignal=AbortSignal;window.fetch=async(url,options)=>{assert.ok(!url.includes('accounts:signUp'),'reset must not create an account');assert.equal(url,'/api/admin-auth/email');assert.deepEqual(JSON.parse(options.body),{purpose:'reset',email:'owner@example.com'});return {ok:true,json:async()=>({message:'If this account exists, check your email for reset instructions.'})};};}});
  const d=dom.window.document;d.querySelector('[data-mode="setup"]').click();assert.equal(d.querySelector('#password').minLength,12);assert.equal(d.querySelector('#confirmation').required,true);
  d.querySelector('[data-mode="reset"]').click();assert.equal(d.querySelector('#password-field').hidden,true);d.querySelector('#email').value='owner@example.com';d.querySelector('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await new Promise(resolve=>setTimeout(resolve,20));assert.match(d.querySelector('#message').textContent,/If this account exists/);dom.window.close();
 }finally {await mf.dispose();}
});
