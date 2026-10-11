import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
const project='vanta-noir';
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
export function validateFirebaseClaims(p:Record<string,unknown>,now=Math.floor(Date.now()/1000)){
 const provider=(p.firebase as {sign_in_provider?:string}|undefined)?.sign_in_provider;
 if(typeof p.sub!=='string'||!p.sub||p.sub.length>128||p.email_verified!==true||typeof p.email!=='string'||typeof p.auth_time!=='number'||p.auth_time>now+30||p.auth_time<now-600||!['password','google.com','apple.com'].includes(provider||''))throw Error('Sign in again with a verified email address.');
 return {uid:p.sub,email:p.email.trim().toLowerCase(),authenticatedAt:p.auth_time*1000};
}
export async function verifyFirebaseToken(token:string,resolver:JWTVerifyGetKey=keys){const {payload}=await jwtVerify(token,resolver,{algorithms:['RS256'],issuer:`https://securetoken.google.com/${project}`,audience:project,requiredClaims:['exp','iat','sub','auth_time'],maxTokenAge:'65m',clockTolerance:30});return validateFirebaseClaims(payload);}
