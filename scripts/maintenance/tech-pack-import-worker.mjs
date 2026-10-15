// One-time, expiring importer. Bind BUCKET, IMPORT_DIGEST, IMPORT_EXPIRES and
// substitute the reviewed file manifest at deployment. Disable its route after import.
const files = /* IMPORT_MANIFEST */ {};
export default {
 async fetch(request, env) {
  if (Date.now()>Number(env.IMPORT_EXPIRES)) return new Response('Expired',{status:410});
  const supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(supplied));
  const expected=Uint8Array.from(env.IMPORT_DIGEST.match(/../g),h=>parseInt(h,16));
  if(!crypto.subtle.timingSafeEqual(digest,expected))return new Response('Unauthorized',{status:401});
  const name=new URL(request.url).pathname.slice(1),entry=Object.hasOwn(files,name)?files[name]:null;
  if(request.method!=='PUT'||!entry)return new Response('Not found',{status:404});
  if(Number(request.headers.get('content-length'))!==entry.bytes)return new Response('Invalid length',{status:400});
  const reader=request.body?.getReader();if(!reader)return new Response('Missing body',{status:400});
  const chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>entry.bytes){void reader.cancel().catch(()=>{});return new Response('Too large',{status:413});}chunks.push(value);}
  if(size!==entry.bytes)return new Response('Incomplete body',{status:400});
  const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==entry.sha256)return new Response('Checksum mismatch',{status:400});
  const key='tech-packs/r06-20261015/'+name;
  const prior=await env.BUCKET.head(key);
  if(prior){if(prior.customMetadata?.sha256===hash&&prior.size===size)return Response.json({ok:true,existing:true});return new Response('Existing object differs',{status:409});}
  await env.BUCKET.put(key,data,{httpMetadata:{contentType:'application/pdf',cacheControl:'private, no-store'},customMetadata:{sha256:hash,revision:'R06 sampling draft'}});
  return Response.json({ok:true,bytes:size});
 }
};
