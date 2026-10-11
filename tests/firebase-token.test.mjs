import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {generateKeyPair,exportJWK,SignJWT,createLocalJWKSet} from 'jose';
await mkdir('work',{recursive:true});
await build({entryPoints:['lib/firebase-token.ts'],outfile:'work/firebase-token.mjs',bundle:true,platform:'node',format:'esm'});
const {verifyFirebaseToken}=await import('../work/firebase-token.mjs');
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk=await exportJWK(publicKey);jwk.kid='test';const resolver=createLocalJWKSet({keys:[jwk]});
const now=Math.floor(Date.now()/1000);
async function token(extra={},options={}){return new SignJWT({sub:'customer',email:'Owner@example.com',email_verified:true,auth_time:now,firebase:{sign_in_provider:'google.com'},...extra}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(options.issuer||'https://securetoken.google.com/vanta-noir').setAudience(options.audience||'vanta-noir').setIssuedAt().setExpirationTime(options.exp||'1h').sign(privateKey);}
test('Firebase accepts only verified recent identities issued for this project',async()=>{const v=await verifyFirebaseToken(await token(),resolver);assert.equal(v.email,'owner@example.com');for(const extra of [{email_verified:false},{auth_time:now-601},{auth_time:now+100},{firebase:{sign_in_provider:'anonymous'}},{sub:''}])await assert.rejects(()=>token(extra).then(t=>verifyFirebaseToken(t,resolver)));});
test('Firebase rejects foreign projects, expired tokens and tampered signatures',async()=>{for(const options of [{issuer:'https://securetoken.google.com/other'},{audience:'other'},{exp:now-100}])await assert.rejects(()=>token({},options).then(t=>verifyFirebaseToken(t,resolver)));const t=await token();await assert.rejects(()=>verifyFirebaseToken(t.slice(0,-10)+'AAAAAAAAAA',resolver));});
