import {createRemoteJWKSet,importJWK,jwtVerify,SignJWT} from 'jose';
import {runtimeEnv} from './runtime-env';
import {staffRole} from './operations';
let remoteKeys:ReturnType<typeof createRemoteJWKSet>|undefined;
function signingMaterial(){
 const raw=runtimeEnv().ACCESS_EVALUATION_SIGNING_JWK;
 if(!raw)throw new Error('Staff sign-in is not configured.');
 const key=JSON.parse(raw);
 if(key.kty!=='RSA'||!key.d||!key.n||!key.e||!key.kid)throw new Error('Invalid signing key.');
 return key;
}
export async function accessKeys(){
 try{const {n,e,kid}=signingMaterial();return Response.json({keys:[{kty:'RSA',n,e,kid,alg:'RS256',use:'sig'}]},{headers:{'Cache-Control':'public, max-age=300'}});}
 catch{return Response.json({error:'Unavailable'},{status:503});}
}
export async function evaluateAccess(request:Request){
 try{
  const raw=await request.text();if(raw.length>32768)return new Response('Too large',{status:413});
  const {token}=JSON.parse(raw);if(typeof token!=='string')throw new Error('Invalid token');
  const team=new URL(runtimeEnv().CF_ACCESS_TEAM_DOMAIN||'');
  if(team.protocol!=='https:'||!team.hostname.endsWith('.cloudflareaccess.com'))throw new Error('Invalid team');
  remoteKeys??=createRemoteJWKSet(new URL('/cdn-cgi/access/certs',team));
  // External evaluation tokens are signed by the account, rather than an application audience.
  const {payload}=await jwtVerify(token,remoteKeys,{algorithms:['RS256'],requiredClaims:['exp']});
  if(typeof payload.nonce!=='string'||!payload.nonce||payload.nonce.length>512)throw new Error('Invalid nonce');
  const identity=payload.identity as {email?:unknown}|undefined;
  const email=identity?.email;
  const success=typeof email==='string'&&email.length<=200&&Boolean(await staffRole(email));
  const jwk=signingMaterial(),key=await importJWK(jwk,'RS256');
  const signed=await new SignJWT({success,nonce:payload.nonce}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setIssuedAt().setExpirationTime('60s').sign(key);
  return Response.json({token:signed},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({success:false},{status:403,headers:{'Cache-Control':'no-store'}});}
}
