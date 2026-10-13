import {importPKCS8, SignJWT} from 'jose';
import {verifyFirebaseToken} from './firebase-token';
import {runtimeEnv} from './runtime-env';
const project='vanta-noir';
let cached:{token:string;until:number}|undefined;
export function firebaseReady(){return runtimeEnv().FIREBASE_AUTH_ENABLED==='true'&&!!runtimeEnv().FIREBASE_SERVICE_ACCOUNT_JSON;}
async function adminToken(){
 if(cached&&cached.until>Date.now())return cached.token;
 const account=JSON.parse(runtimeEnv().FIREBASE_SERVICE_ACCOUNT_JSON||'{}');
 if(account.project_id!==project||typeof account.client_email!=='string'||typeof account.private_key!=='string')throw Error('Firebase is not configured.');
 const key=await importPKCS8(account.private_key,'RS256');
 const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/identitytoolkit'}).setProtectedHeader({alg:'RS256'}).setIssuer(account.client_email).setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('5m').sign(key);
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(10000)});
 const body=await response.json() as {access_token?:string;expires_in?:number};
 if(!response.ok||!body.access_token)throw Error('Firebase is temporarily unavailable.');
 cached={token:body.access_token,until:Date.now()+Math.min(Number(body.expires_in)||300,3300)*1000};return cached.token;
}
async function adminRequest(action:string,body:unknown){
 const response=await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:${action}`,{method:'POST',headers:{Authorization:'Bearer '+await adminToken(),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const result=await response.json() as {users?:{localId:string;email?:string;emailVerified?:boolean;disabled?:boolean;validSince?:string}[];error?:{message?:string}};
 if(!response.ok&&!(action==='delete'&&result.error?.message==='USER_NOT_FOUND'))throw Error('Firebase account service is temporarily unavailable.');
 return result;
}
export async function verifyFirebaseCustomer(token:string){
 if(!firebaseReady())throw Error('Additional sign-in methods are not available yet.');
 const identity=await verifyFirebaseToken(token);
 const user=(await adminRequest('lookup',{localId:[identity.uid]})).users?.[0];
 if(!user||user.localId!==identity.uid||user.disabled||!user.emailVerified||user.email?.toLowerCase()!==identity.email||Number(user.validSince||0)*1000>identity.authenticatedAt)throw Error('Please sign in again.');
 return identity;
}
export async function deleteFirebaseCustomer(uid:string){await adminRequest('delete',{localId:uid});}

// Check current provider state for every store session; outages fail closed.
export async function firebaseSessionValid(uid:string,email:string,authenticatedAt:number){
 if(!firebaseReady())return false;
 const user=(await adminRequest('lookup',{localId:[uid]})).users?.[0];
 return !!user && user.localId===uid && !user.disabled && !!user.emailVerified && user.email?.toLowerCase()===email && Number(user.validSince||0)*1000<=authenticatedAt;
}
