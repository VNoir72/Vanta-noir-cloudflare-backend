import {apiUrl} from './api-client';
const SESSION='vn-customer-session',EXPIRY='vn-customer-session-expires',MARKER='vn-customer-cookie';
let legacy:string|null|undefined;
let generation=0;
let migration:Promise<void>|undefined;
function legacyToken(){
 if(legacy!==undefined)return legacy;
 legacy=null;
 for(const name of ['localStorage','sessionStorage'] as const){try{
  const storage=window[name],token=storage.getItem(SESSION),expiry=Number(storage.getItem(EXPIRY));
  if(token&&(name==='sessionStorage'||expiry>Date.now()))legacy=token;
  storage.removeItem(SESSION);storage.removeItem(EXPIRY);
 }catch{}}
 return legacy;
}
export function customerHasSession(){if(legacyToken())return true;try{return Number(localStorage.getItem(MARKER))>Date.now();}catch{return false;}}
export function customerHeaders():Record<string,string>{const token=legacyToken();return {'X-Vanta-Web':'1',...(token?{Authorization:`Bearer ${token}`}:{})};}
export function saveCustomerSession(_token:string|undefined,expiresAt=Date.now()+30*86400000){
 legacy=null;generation++;
 for(const name of ['localStorage','sessionStorage'] as const){try{window[name].removeItem(SESSION);window[name].removeItem(EXPIRY);}catch{}}
 try{localStorage.setItem(MARKER,String(Math.min(expiresAt,Date.now()+30*86400000)));}catch{}
}
export function clearCustomerSession(){legacy=null;generation++;for(const name of ['localStorage','sessionStorage'] as const){try{for(const key of [SESSION,EXPIRY,MARKER])window[name].removeItem(key);}catch{}}}
async function migrateLegacy(){
 if(!legacyToken())return;
 if(!migration)migration=(async()=>{
  const version=generation;
  const r=await fetch(apiUrl('/api/customer/web-session'),{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',...customerHeaders()},body:'{}',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(r.ok){const data=await r.json() as {expiresAt:number};if(generation===version)saveCustomerSession(undefined,data.expiresAt);}
  else if(r.status===401&&generation===version)clearCustomerSession();
 })().finally(()=>{migration=undefined;});
 await migration;
}
export async function customerRequest<T>(path:string,body?:unknown,method=body?'POST':'GET'):Promise<T>{
 if(path!=='firebase')await migrateLegacy();
 const version=generation;
 const r=await fetch(apiUrl('/api/customer/'+path),{method,credentials:'include',headers:{'Content-Type':'application/json',...customerHeaders()},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await r.json() as T & {error?:string};if(!r.ok){if(r.status===401&&generation===version)clearCustomerSession();throw Error(data.error||'Please try again.');}return data;
}
export async function browserAuth(){
 const [{initializeApp,getApps,getApp},auth]=await Promise.all([import('firebase/app'),import('firebase/auth')]);
 let authDomain='vanta-noir.firebaseapp.com';try{const r=await fetch(apiUrl('/api/growth'),{signal:AbortSignal.timeout(5000)});const d=await r.json() as {authDomain?:string};if(r.ok&&d.authDomain==='auth.vantanoir.store')authDomain=d.authDomain;}catch{/* Existing sign-in remains available. */}
 const app=getApps().length?getApp():initializeApp({apiKey:'AIzaSyB3aZD9bvnM0mjR-XV7Op7V2HJzwmQ7uqg',authDomain,projectId:'vanta-noir',storageBucket:'vanta-noir.firebasestorage.app',messagingSenderId:'78543560148',appId:'1:78543560148:web:36d0b6feed12ae416e4a41',measurementId:'G-Q0S1E7096B'});
 const client=auth.getAuth(app);try{await auth.setPersistence(client,auth.inMemoryPersistence);}catch{await auth.setPersistence(client,auth.inMemoryPersistence);}return {client,...auth};
}
