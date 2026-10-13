import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';

test('every admin route rejects anonymous/customer access; CRM only accepts the owner',async()=>{
  const routes=[];
  async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())await walk(path);else if(entry.name==='route.ts')routes.push(path);}}
  await walk('app/api/admin');
  const imports=routes.map((p,i)=>`import * as r${i} from '../${p}';`).join('\n');
  const mapping=routes.map((p,i)=>`${JSON.stringify('/'+p.slice(4,-9))}:r${i}`).join(',');
  const code=`${imports}
import {shippingWeightsAdmin} from '../lib/shipping-weights-admin';
import {bulkDispatchAdmin} from '../lib/bulk-dispatch-admin';
import {shipbubbleAdmin} from '../lib/shipbubble-admin';
const routes={${mapping}};
export default {async fetch(request){const p=new URL(request.url).pathname;
 if(p==='/test/routes')return Response.json(Object.entries(routes).flatMap(([path,r])=>Object.keys(r).filter(m=>['GET','POST','PUT','PATCH','DELETE','HEAD'].includes(m)).map(method=>({path,method}))));
 if(p==='/api/admin/shipping-weights')return shippingWeightsAdmin(request);
 if(p==='/api/admin/bulk-dispatch')return bulkDispatchAdmin(request);
 if(p==='/api/admin/shipbubble')return shipbubbleAdmin(request);
 return routes[p][request.method](request);}};`;
  await mkdir('work',{recursive:true});
  await build({stdin:{contents:code,resolveDir:process.cwd()+'/tests',sourcefile:'admin-boundaries.ts'},outfile:'work/admin-boundaries.mjs',bundle:true,format:'esm',platform:'neutral',conditions:['workerd','browser'],external:['cloudflare:workers']});
  const {publicKey,privateKey}=await generateKeyPair('RS256');
  const jwk={...await exportJWK(publicKey),kid:'access-test',alg:'RS256',use:'sig'},issuer='https://boundary-test.cloudflareaccess.com';
  const token=email=>new SignJWT({email}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer(issuer).setAudience('admin-audience').setExpirationTime('5m').sign(privateKey);
  const mf=new Miniflare({modules:true,scriptPath:'work/admin-boundaries.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{ADMIN_EMAIL:'owner@example.com',AUTH_PROVIDER:'cloudflare-access',CF_ACCESS_TEAM_DOMAIN:issuer,CF_ACCESS_AUD:'admin-audience'},outboundService:async request=>{assert.equal(request.url,issuer+'/cdn-cgi/access/certs');return Response.json({keys:[jwk]});}});
  try{
    const db=await mf.getD1Database('DB');
    for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=(await readFile('drizzle/'+f,'utf8')).replaceAll('--> statement-breakpoint','');await db.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));}
    const list=await (await mf.dispatchFetch('https://api.vantanoir.store/test/routes')).json();
    for(const path of ['/api/admin/shipping-weights','/api/admin/bulk-dispatch','/api/admin/shipbubble'])for(const method of ['GET','POST'])list.push({path,method});
    assert.ok(list.length>=60,'Audit inventory unexpectedly shrank');
    for(const {path,method} of list)for(const headers of [{},{Authorization:'Bearer ordinary-customer-token','X-Role':'owner','cf-access-authenticated-user-email':'owner@example.com'}]){
      const result=await mf.dispatchFetch('https://api.vantanoir.store'+path,{method,headers});
      assert.ok([401,403].includes(result.status),`${method} ${path} unexpectedly returned ${result.status}`);
    }
    // Even a valid Access identity without a server-granted staff role is denied.
    const customer=await token('customer@example.com');
    for(const method of ['GET','POST'])assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/api/admin/crm',{method,headers:{'cf-access-jwt-assertion':customer}})).status,403);
    await db.prepare("INSERT INTO admin_staff(email,role,active) VALUES('support@example.com','support',1)").run();
    const support=await token('support@example.com');
    for(const method of ['GET','POST'])assert.equal((await mf.dispatchFetch('https://api.vantanoir.store/api/admin/crm',{method,headers:{'cf-access-jwt-assertion':support}})).status,403);
    const owner=await token('owner@example.com');
    const result=await mf.dispatchFetch('https://api.vantanoir.store/api/admin/crm',{headers:{'cf-access-jwt-assertion':owner}});
    assert.equal(result.status,200);assert.deepEqual((await result.json()).customers,[]);
  }finally{await mf.dispose();}
});
