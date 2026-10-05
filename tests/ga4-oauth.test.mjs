import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
test('GA4 OAuth requires owner, CSRF state, same browser, PKCE and property access; tokens stay encrypted',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/ga4-oauth-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256'),issuer='https://ga4-test.cloudflareaccess.com',jwk={...await exportJWK(publicKey),kid:'ga4',alg:'RS256',use:'sig'};
 const jwt=email=>new SignJWT({email}).setProtectedHeader({alg:'RS256',kid:'ga4'}).setIssuer(issuer).setAudience('ga4').setIssuedAt().setExpirationTime('10m').sign(privateKey);
 let tokenCalls=0,refreshCalls=0,denyProperty=false,revokeCalls=0;
 const mf=new Miniflare({modules:true,scriptPath:'work/ga4-oauth-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'ga4',GA4_PROPERTY_ID:'554825546',GA4_OAUTH_CLIENT_ID:'fixture.apps.googleusercontent.com',GA4_OAUTH_CLIENT_SECRET:'fixture-secret'},outboundService:async req=>{
 if(req.url===issuer+'/cdn-cgi/access/certs')return Response.json({keys:[jwk]});
 if(req.url==='https://oauth2.googleapis.com/token'){const b=new URLSearchParams(await req.text());assert.equal(b.get('client_secret'),'fixture-secret');if(b.get('grant_type')==='authorization_code'){tokenCalls++;assert.equal(b.get('redirect_uri'),'https://api.vantanoir.store/api/admin/ga4/callback');assert.ok(b.get('code_verifier').length>=43);}else{refreshCalls++;assert.equal(b.get('refresh_token'),'private-refresh');}return Response.json({access_token:'private-access',refresh_token:'private-refresh',scope:'https://www.googleapis.com/auth/analytics.readonly',expires_in:3600});}
 if(req.url==='https://oauth2.googleapis.com/revoke'){revokeCalls++;return new Response('');}
 assert.equal(req.url,'https://analyticsdata.googleapis.com/v1beta/properties/554825546:runReport');assert.equal(req.headers.get('Authorization'),'Bearer private-access');return Response.json({}, {status:denyProperty?403:200});
 }});
 try{const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const rpc=async(action,...args)=>{const r=await mf.dispatchFetch('https://api.example.com/test',{method:'POST',body:JSON.stringify({action,args})});assert.equal(r.status,200);return r.json();};
 await rpc('saveStaff',{email:'staff@example.com',role:'support',active:true},'owner@example.com');const owner=await jwt('owner@example.com'),staff=await jwt('staff@example.com');
 const admin=(token,action,origin='https://api.example.com')=>mf.dispatchFetch('https://api.example.com/api/admin/ga4',{method:action?'POST':'GET',headers:{'cf-access-jwt-assertion':token,Origin:origin,'Content-Type':'application/json'},...(action?{body:JSON.stringify({action})}:{})});
 assert.equal((await admin(staff)).status,403);assert.equal((await admin(staff,'connect')).status,403);assert.equal((await admin(owner,'connect','https://evil.example')).status,403);
 async function start(){const r=await admin(owner,'connect');assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);const cookie=r.headers.get('set-cookie').split(';')[0];const u=new URL((await r.json()).url);assert.equal(u.searchParams.get('scope'),'https://www.googleapis.com/auth/analytics.readonly');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.ok(!u.toString().includes('fixture-secret'));return {cookie,state:u.searchParams.get('state')};}
 const cb=(flow,token=owner,state=flow.state)=>mf.dispatchFetch('https://api.example.com/api/admin/ga4/callback?code=fixture-code&state='+state,{headers:{'cf-access-jwt-assertion':token,Cookie:flow.cookie},redirect:'manual'});
 let flow=await start();assert.equal((await cb(flow,staff)).status,403);assert.equal((await cb(flow,owner,'wrong')).headers.get('location'),'/admin?ga4=failed');assert.equal((await cb({...flow,cookie:''})).headers.get('location'),'/admin?ga4=failed');assert.equal(tokenCalls,0);
 await db.prepare("UPDATE store_meta SET value=json_set(value,'$.expires',0) WHERE key='ga4-oauth-state:owner@example.com'").run();assert.equal((await cb(flow)).headers.get('location'),'/admin?ga4=failed');assert.equal(tokenCalls,0);
 flow=await start();let r=await cb(flow);assert.equal(r.headers.get('location'),'/admin?ga4=connected');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(tokenCalls,1);assert.equal((await cb(flow)).headers.get('location'),'/admin?ga4=failed');assert.equal(tokenCalls,1);
 const c=await rpc('oauthConnection');assert.ok(c.encrypted);assert.ok(!JSON.stringify(c).includes('private-refresh'));assert.equal(await rpc('oauthAccessToken',c),'private-access');assert.equal(await rpc('oauthAccessToken',c),'private-access');assert.equal(refreshCalls,1);
 const status=await (await admin(owner)).json();assert.equal(status.connected,true);assert.ok(!JSON.stringify(status).includes('encrypted'));assert.ok(!JSON.stringify(status).includes('private-'));
 denyProperty=true;flow=await start();assert.equal((await cb(flow)).headers.get('location'),'/admin?ga4=failed');assert.equal((await rpc('oauthConnection')).id,c.id,'Failed reconnect preserves working grant');
 assert.equal((await admin(staff,'disconnect')).status,403);assert.equal((await admin(owner,'disconnect')).status,200);assert.equal((await (await admin(owner)).json()).connected,false);assert.equal(revokeCalls,1);
 const audit=JSON.stringify((await db.prepare("SELECT detail FROM admin_audit WHERE action LIKE '%GA4%'").all()).results);assert.ok(!audit.includes('private-'));assert.ok(!audit.includes('fixture-secret'));
 }finally{await mf.dispose();}
});
