import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {mkdir,readdir,readFile} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
test('shared chat authenticates every role, deduplicates retries, tracks per-user reads and revokes access',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/commerce-worker.ts'],outfile:'work/chat-test-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256',{extractable:true}),issuer='https://chat-test.cloudflareaccess.com',jwk={...await exportJWK(publicKey),kid:'chat',alg:'RS256',use:'sig'};
 const mf=new Miniflare({modules:true,scriptPath:'work/chat-test-worker.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'chat'},outboundService:async()=>Response.json({keys:[jwk]})});
 try{const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch((await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','').split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const tokens={};for(const role of ['owner','support','sales','catalogue','fulfilment','analyst']){tokens[role]=await new SignJWT({email:role+'@example.com'}).setProtectedHeader({alg:'RS256',kid:'chat'}).setIssuer(issuer).setAudience('chat').setIssuedAt().setExpirationTime('10m').sign(privateKey);if(role!=='owner')await db.prepare('INSERT INTO admin_staff(email,role,active) VALUES(?,?,1)').bind(role+'@example.com',role).run();}
 const req=(role,body,query='',origin='https://api.example.com')=>mf.dispatchFetch('https://api.example.com/api/admin/chat'+query,{method:body?'POST':'GET',headers:{'cf-access-jwt-assertion':tokens[role]||'',Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await req('anonymous')).status,403);for(const role of Object.keys(tokens))assert.equal((await req(role)).status,200);
 const msg={action:'send',id:crypto.randomUUID(),channel:'all',body:'Please check the delivery.'};assert.equal((await req('support',msg)).status,201);assert.equal((await req('support',msg)).status,200);assert.equal((await req('sales',msg)).status,409);
 let data=await (await req('sales')).json();assert.equal(data.messages.length,1);assert.equal(data.unread,1);assert.equal(data.messages[0].author,'support@example.com');assert.equal((await req('sales',{action:'read',channel:'all',seq:data.messages[0].seq})).status,200);assert.equal((await (await req('sales')).json()).unread,0);assert.equal((await (await req('owner')).json()).unread,1);
 assert.equal((await req('sales',{...msg,id:crypto.randomUUID(),author:'owner@example.com'})).status,400);assert.equal((await req('sales',{...msg,id:crypto.randomUUID()},'','https://evil.example')).status,403);
 assert.equal((await req('sales',{...msg,id:crypto.randomUUID(),channel:'support'})).status,201);assert.equal((await (await req('support',undefined,'?channel=support')).json()).messages.length,1);
 await db.prepare("UPDATE admin_staff SET active=0 WHERE email='sales@example.com'").run();assert.equal((await req('sales')).status,403);assert.equal((await req('sales',{...msg,id:crypto.randomUUID()})).status,403);
 for(let i=0;i<29;i++)assert.equal((await req('support',{...msg,id:crypto.randomUUID()})).status,201);assert.equal((await req('support',{...msg,id:crypto.randomUUID()})).status,429);
 }finally{await mf.dispose();}
});
