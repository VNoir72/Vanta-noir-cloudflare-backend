import {apiUrl} from './api-client';
const SESSION='vn-customer-session';
const EXPIRY='vn-customer-session-expires';
const MAX_AGE=30*86400000;
function sessionToken(){
 try {
  const token=localStorage.getItem(SESSION);
  if(token){const expiry=Number(localStorage.getItem(EXPIRY));if(!expiry||expiry<=Date.now()){clearCustomerSession();return null;}return token;}
 } catch {/* Some private browsers only allow tab storage. */}
 try{return sessionStorage.getItem(SESSION);}catch{return null;}
}
export function customerHeaders():Record<string,string>{const token=sessionToken();return token?{Authorization:`Bearer ${token}`}:{}}
export function saveCustomerSession(token:string,expiresAt=Date.now()+MAX_AGE){
 const expiry=Math.min(expiresAt,Date.now()+MAX_AGE);
 try{localStorage.setItem(EXPIRY,String(expiry));localStorage.setItem(SESSION,token);try{sessionStorage.removeItem(SESSION);}catch{}return;}catch{/* Fall back when persistent storage is unavailable. */}
 sessionStorage.setItem(SESSION,token);
}
export function clearCustomerSession(){for(const name of ['localStorage','sessionStorage'] as const){try{window[name].removeItem(SESSION);window[name].removeItem(EXPIRY);}catch{}}}
export async function customerRequest<T>(path:string,body?:unknown,method=body?'POST':'GET'):Promise<T>{
 const headers=customerHeaders();
 const r=await fetch(apiUrl('/api/customer/'+path),{method,headers:{'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await r.json() as T & {error?:string};if(!r.ok){if(r.status===401&&headers.Authorization&&customerHeaders().Authorization===headers.Authorization)clearCustomerSession();throw Error(data.error||'Please try again.');}return data;
}
export async function browserAuth(){
 const [{initializeApp,getApps,getApp},auth]=await Promise.all([import('firebase/app'),import('firebase/auth')]);
 let authDomain='vanta-noir.firebaseapp.com';try{const r=await fetch(apiUrl('/api/growth'),{signal:AbortSignal.timeout(5000)});const d=await r.json() as {authDomain?:string};if(r.ok&&d.authDomain==='auth.vantanoir.store')authDomain=d.authDomain;}catch{/* Existing sign-in remains available. */}
 const app=getApps().length?getApp():initializeApp({apiKey:'AIzaSyCMGePaGAibsAiyFIsMCON8G2nTrOLsx90',authDomain,projectId:'vanta-noir'});
 const client=auth.getAuth(app);try{await auth.setPersistence(client,auth.browserLocalPersistence);}catch{await auth.setPersistence(client,auth.browserSessionPersistence);}return {client,...auth};
}
