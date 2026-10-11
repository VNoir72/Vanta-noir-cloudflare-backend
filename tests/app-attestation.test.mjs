import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from './miniflare.mjs';import {generateKeyPair,exportJWK,SignJWT} from 'jose';import {createHash,randomUUID} from 'node:crypto';
test('signed Android App Check plus customer session required; forged/native labels never grant access',async()=>{
 await build({entryPoints:['tests/app-attestation-worker.ts'],outfile:'work/app-attestation-worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',conditions:['workerd','browser'],external:['cloudflare:workers']});
 const {publicKey,privateKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey);jwk.kid='fixture';const project='12345678',app='1:12345678:android:abc';
 const mf=new Miniflare({modules:true,scriptPath:'work/app-attestation-worker.mjs',compatibilityDate:'2026-10-08',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{CUSTOMER_APP_ENABLED:'true',FIREBASE_PROJECT_NUMBER:project,FIREBASE_ANDROID_APP_ID:app},outboundService:async req=>{assert.equal(req.url,'https://firebaseappcheck.googleapis.com/v1/jwks');return Response.json({keys:[jwk]});}});
 try{const db=await mf.getD1Database('DB');await db.exec('CREATE TABLE app_customers(id TEXT,email TEXT,name TEXT,addresses_json TEXT,favourites_json TEXT); CREATE TABLE app_sessions(digest TEXT,customer_id TEXT,created_at INTEGER,expires_at INTEGER);');await db.prepare('INSERT INTO app_customers VALUES(?,?,?,?,?)').bind('c','a@example.com','A','[]','[]').run();const session=randomUUID()+'-'+randomUUID();await db.prepare('INSERT INTO app_sessions VALUES(?,?,?,?)').bind(createHash('sha256').update(session).digest('hex'),'c',Date.now(),Date.now()+600000).run();
 const token=async(overrides={})=>new SignJWT({sub:app,iss:`https://firebaseappcheck.googleapis.com/${project}`,aud:[`projects/${project}`],iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,...overrides}).setProtectedHeader({alg:'RS256',kid:'fixture',typ:'JWT'}).sign(privateKey);
 const call=async(headers)=>await(await mf.dispatchFetch('https://api.example.com/check',{headers})).json();const auth={Authorization:'Bearer '+session};
 assert.equal((await call({...auth,'X-Client':'native'})).verifiedApp,false);
 assert.equal((await call({...auth,'X-Firebase-AppCheck':'fake'})).verifiedApp,false);
 assert.equal((await call({'X-Firebase-AppCheck':await token()})).verifiedApp,false);
 for(const invalid of [{sub:'1:12345678:web:abc'},{aud:['projects/999']},{exp:1},{iss:'https://evil.example'}])assert.equal((await call({...auth,'X-Firebase-AppCheck':await token(invalid)})).verifiedApp,false);
 assert.equal((await call({...auth,'X-Firebase-AppCheck':await token()})).verifiedApp,true);
 }finally{await mf.dispose();}
});
