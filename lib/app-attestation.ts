import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
import {runtimeEnv} from './runtime-env';
import {appSession} from './app-session';
import {type AppAccess} from './app-controls-policy';
const keys=createRemoteJWKSet(new URL('https://firebaseappcheck.googleapis.com/v1/jwks'));
export async function verifyAppCheck(token:string,project:string,appId:string,key:JWTVerifyGetKey=keys){
 if(!/^\d+$/.test(project)||!appId||token.length>12000)throw Error('App verification unavailable.');
 const {payload,protectedHeader}=await jwtVerify(token,key,{algorithms:['RS256'],issuer:`https://firebaseappcheck.googleapis.com/${project}`,audience:`projects/${project}`,requiredClaims:['exp','iat','sub']});
 if(protectedHeader.typ!=='JWT'||payload.sub!==appId)throw Error('This app is not recognised.');
 return true;
}
export function attestationReady(){const e=runtimeEnv();return !!(e.FIREBASE_PROJECT_NUMBER&&e.FIREBASE_ANDROID_APP_ID);}
export async function appAccessContext(request:Request):Promise<AppAccess>{
 const session=await appSession(request);const a={verifiedApp:false,email:session?.email||'',customerId:session?.id||''};
 const token=request.headers.get('X-Firebase-AppCheck'),e=runtimeEnv();
 if(session&&token&&attestationReady())try{a.verifiedApp=await verifyAppCheck(token,e.FIREBASE_PROJECT_NUMBER!,e.FIREBASE_ANDROID_APP_ID!);}catch{/* Exclusive access fails closed; ordinary shopping stays available. */}
 return a;
}
