import {apiUrl} from './api-client';
let memoryId='';
export async function recordProductInterest(productId:string,color:string,liked:boolean,size=''){
 let visitorId=memoryId;
 try{visitorId=localStorage.getItem('vn-interest-visitor-v1')||visitorId;}catch{/* Storage may be disabled. */}
 if(!/^[0-9a-f-]{36}$/i.test(visitorId))visitorId=crypto.randomUUID();
 memoryId=visitorId;
 try{localStorage.setItem('vn-interest-visitor-v1',visitorId);}catch{/* Keep a session identity. */}
 const response=await fetch(apiUrl('/api/product-interest'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId,productId,color,size,liked}),signal:AbortSignal.timeout(12000)});
 const data=await response.json() as {error?:string};
 if(!response.ok)throw Error(data.error||'Could not save your preference. Please try again.');
}
