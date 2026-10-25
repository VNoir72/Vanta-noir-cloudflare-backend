/** An early browser request is single-use and expires; stock is never stored in a cache. */
declare global {
 interface Window { __vnCatalogRequest?: {url:string;startedAt:number;request:Promise<Response|null>} }
}
async function earlyCatalog(url:string,signal:AbortSignal){
 if(typeof window==='undefined')return null;
 const early=window.__vnCatalogRequest;
 if(!early||early.url!==url)return null;
 delete window.__vnCatalogRequest;
 if(Date.now()-early.startedAt>15000){void early.request.then(r=>r?.body?.cancel());return null;}
 signal.throwIfAborted();
 let cancel:()=>void=()=>{};
 try{return await Promise.race([early.request,new Promise<never>((_,reject)=>{cancel=()=>reject(signal.reason);signal.addEventListener('abort',cancel,{once:true});})]);}
 finally{signal.removeEventListener('abort',cancel);}
}
/** Retry a transient public catalogue failure once, within one 16-second budget. */
export async function fetchCatalogResponse(url:string,signal:AbortSignal,send:typeof fetch=fetch){
 const deadline=AbortSignal.any([signal,AbortSignal.timeout(16000)]);
 // Injected transports (tests) never consume a real browser request.
 if(send===fetch){const early=await earlyCatalog(url,deadline);if(early)return early;}
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await send(url,{cache:'no-store',signal:AbortSignal.any([deadline,AbortSignal.timeout(8000)])});
   if(response.ok||response.status<500||attempt===1)return response;
   await response.body?.cancel();
  }catch(error){if(deadline.aborted||attempt===1)throw error;}
 }
 throw Error('Catalogue unavailable');
}
