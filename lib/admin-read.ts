/** Bounded, read-only admin requests. Never retries writes or financial actions. */
export async function adminRead<T>(path:string,validate:(value:any)=>boolean,options:{signal?:AbortSignal;timeoutMs?:number}={}):Promise<T>{
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort(options.signal?.reason);
 if(options.signal?.aborted)cancel();else options.signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},options.timeoutMs??20000);
 try{
  const response=await fetch(path,{signal:controller.signal,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  if(response.redirected||response.status===401||response.status===403)throw new Error('Your session has expired or access was denied. Sign in again.');
  if(!response.ok)throw new Error('The request could not load. Please retry.');
  const value=await response.json().catch(()=>{throw new Error('The server returned an unreadable response. Please retry.');});
  if(!validate(value))throw new Error('The server returned incomplete data. Please retry.');
  if(controller.signal.aborted)throw new DOMException('Request cancelled','AbortError');
  return value as T;
 }catch(error){if(timedOut)throw new Error('The request timed out. Please retry.');throw error;}
 finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);}
}
export const hasArray=(key:string)=>(value:any)=>!!value&&Array.isArray(value[key]);
export const hasAnalytics=(value:any)=>!!value?.analytics&&Array.isArray(value.analytics.trend)&&Array.isArray(value.analytics.categoryMix);
