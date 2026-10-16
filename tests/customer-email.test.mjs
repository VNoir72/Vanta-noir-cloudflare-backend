import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,mkdir} from 'node:fs/promises';
import {generateKeyPair,exportJWK,exportPKCS8,SignJWT} from 'jose';
import {Miniflare} from './miniflare.mjs';
test('Resend auth email validates identity, keeps reset responses private and rate-limits retries',async()=>{
 await mkdir('work',{recursive:true});await build({entryPoints:['tests/customer-app-worker.ts'],outfile:'work/customer-email.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256',{extractable:true}),jwk={...await exportJWK(publicKey),kid:'email-test'};let sends=[],links=[],resendFailure=false,disabled=false;
 const mf=new Miniflare({modules:true,scriptPath:'work/customer-email.mjs',compatibilityDate:'2026-10-08',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{CUSTOMER_APP_ENABLED:'true',FIREBASE_AUTH_ENABLED:'true',RESEND_API_KEY:'fixture',EMAIL_FROM:'test@example.invalid',FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'vanta-noir',client_email:'test@vanta-noir.iam.gserviceaccount.com',private_key:await exportPKCS8(privateKey)})},outboundService:async req=>{
  if(req.url.includes('/jwk/securetoken@'))return Response.json({keys:[jwk]});
  if(req.url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test',expires_in:3600});
  const data=await req.json();
  if(req.url.endsWith('accounts:lookup'))return Response.json({users:data.email?.[0]==='absent@example.invalid'?[]:[{localId:'email-user',email:'buyer@example.invalid',emailVerified:false,disabled,validSince:'0'}]});
  if(req.url.endsWith('accounts:sendOobCode')){links.push(data);assert.equal(data.returnOobLink,true);assert.equal(data.continueUrl,'https://vantanoir.store/account');return Response.json({oobLink:'https://vanta-noir.firebaseapp.com/__/auth/action?mode='+data.requestType+'&oobCode=fixture-secret'});}
  assert.equal(req.url,'https://api.resend.com/emails');assert.ok(req.headers.get('Idempotency-Key'));sends.push(data);return Response.json({id:'fixture'},{status:resendFailure?503:200});
 }});
 try{
  const db=await mf.getD1Database('DB');await db.batch([db.prepare('CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)'),db.prepare('CREATE TABLE request_limits(key TEXT PRIMARY KEY,hits INTEGER,expires_at INTEGER)')]);
  const token=await new SignJWT({sub:'email-user',email:'buyer@example.invalid',email_verified:false,auth_time:Math.floor(Date.now()/1000),firebase:{sign_in_provider:'password'}}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuer('https://securetoken.google.com/vanta-noir').setAudience('vanta-noir').setIssuedAt().setExpirationTime('1h').sign(privateKey);
  const send=async body=>{const r=await mf.dispatchFetch('https://test/api/customer/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  const success=await send({purpose:'verification',idToken:token});assert.equal(success.status,200);assert.equal(sends.length,1);assert.deepEqual(sends[0].to,['buyer@example.invalid']);assert.ok(sends[0].html.includes('fixture-secret'));assert.ok(!JSON.stringify(success.data).includes('fixture-secret'));
  assert.equal((await send({purpose:'verification',idToken:token})).status,429);assert.equal(sends.length,1);
  await db.prepare('DELETE FROM request_limits').run();
  disabled=true;assert.equal((await send({purpose:'verification',idToken:token})).status,401);disabled=false;
  const absent=await send({purpose:'reset',email:'absent@example.invalid'});assert.equal(absent.status,200);assert.equal(sends.length,1);
  const present=await send({purpose:'reset',email:'buyer@example.invalid'});assert.deepEqual(present,absent);assert.equal(links.at(-1).requestType,'PASSWORD_RESET');
  await db.prepare('DELETE FROM request_limits').run();resendFailure=true;
  assert.equal((await send({purpose:'verification',idToken:token})).status,503,'provider failure is not reported as delivery success');
 }finally{await mf.dispose();}
});
