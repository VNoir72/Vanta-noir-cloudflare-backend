import {runtimeEnv} from './runtime-env';
/** Public catalogue images only; read bound storage instead of fetching the storefront. */
export async function featuredImage(request:Request){
 if(request.method!=='GET')return new Response(null,{status:405});
 let source:URL;try{source=new URL(new URL(request.url).searchParams.get('src')||'', 'https://vantanoir.store');}catch{return new Response(null,{status:400});}
 if(source.protocol!=='https:'||source.username||source.password||source.port||!['vantanoir.store','www.vantanoir.store','api.vantanoir.store'].includes(source.hostname)||!/^\/(images\/|api\/media\/)/.test(source.pathname))return new Response(null,{status:400});
 try{
 const env=runtimeEnv();let response:Response;
 if(source.pathname.startsWith('/api/media/')){
  const key=source.pathname.slice('/api/media/'.length);if(!/^products\/[a-f0-9-]+\.(jpg|png|webp|avif)$/.test(key))return new Response(null,{status:404});
  const image=await env.BUCKET?.get(key);if(!image||image.size>12*1024*1024)return new Response(null,{status:404});
  response=new Response(image.body,{headers:{'Content-Type':image.httpMetadata?.contentType||'application/octet-stream'}});
 }else{
  if(!env.ASSETS)return new Response(null,{status:503});
  response=await env.ASSETS.fetch(new Request('https://api.vantanoir.store'+source.pathname));
 }
 const mime=response.headers.get('Content-Type')||'';
 if(!response.ok||!/^image\/(png|jpeg|webp|avif)/i.test(mime)||Number(response.headers.get('Content-Length'))>12*1024*1024)return new Response(null,{status:404});
 return new Response(response.body,{headers:{'Content-Type':mime,'Access-Control-Allow-Origin':'*','Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:503});}
}
