import {apiUrl} from './api-client';
const SESSION='vn-customer-session';
export function customerHeaders():Record<string,string>{try{const token=sessionStorage.getItem(SESSION);return token?{Authorization:`Bearer ${token}`}:{}}catch{return {}}}
export function saveCustomerSession(token:string){sessionStorage.setItem(SESSION,token);}
export function clearCustomerSession(){sessionStorage.removeItem(SESSION);}
export async function customerRequest<T>(path:string,body?:unknown,method=body?'POST':'GET'):Promise<T>{
 const r=await fetch(apiUrl('/api/customer/'+path),{method,headers:{'Content-Type':'application/json',...customerHeaders()},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await r.json() as T & {error?:string};if(!r.ok){if(r.status===401)clearCustomerSession();throw Error(data.error||'Please try again.');}return data;
}
export async function browserAuth(){
 const [{initializeApp,getApps,getApp},auth]=await Promise.all([import('firebase/app'),import('firebase/auth')]);
 let authDomain='vanta-noir.firebaseapp.com';try{const r=await fetch(apiUrl('/api/growth'),{signal:AbortSignal.timeout(5000)});const d=await r.json() as {authDomain?:string};if(r.ok&&d.authDomain==='auth.vantanoir.store')authDomain=d.authDomain;}catch{/* Existing sign-in remains available. */}
 const app=getApps().length?getApp():initializeApp({apiKey:'AIzaSyCMGePaGAibsAiyFIsMCON8G2nTrOLsx90',authDomain,projectId:'vanta-noir'});
 const client=auth.getAuth(app);await auth.setPersistence(client,auth.browserSessionPersistence);return {client,...auth};
}
