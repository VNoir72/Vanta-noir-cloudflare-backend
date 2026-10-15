/** Retry a transient public catalogue failure once; never cache stock or retry a write. */
export async function fetchCatalogResponse(url:string,signal:AbortSignal,send:typeof fetch=fetch){
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await send(url,{cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});
   if(response.ok||response.status<500||attempt===1)return response;
   await response.body?.cancel();
  }catch(error){if(signal.aborted||attempt===1)throw error;}
 }
 throw Error('Catalogue unavailable');
}
