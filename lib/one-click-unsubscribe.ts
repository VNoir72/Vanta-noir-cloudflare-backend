export async function oneClickUnsubscribe(request:Request,unsubscribe:(token:string)=>Promise<boolean>,rateLimit:(request:Request,scope:string,limit:number,seconds:number)=>Promise<boolean>){
  const oneClick=new URL(request.url).searchParams.get('one_click');
  if(oneClick===null)return null;
    if(!/^[a-f0-9-]{72}$/i.test(oneClick)||!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/x-www-form-urlencoded'))return new Response('Invalid unsubscribe request',{status:400});
    if(!await rateLimit(request,'one-click-unsubscribe',60,600))return new Response('Please retry later',{status:429});
    const reader=request.body?.getReader();let raw='';
    if(!reader)return new Response('Invalid unsubscribe request',{status:400});
    try{let length=0;const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>1024){await reader.cancel();return new Response('Request too large',{status:413});}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
    if(new URLSearchParams(raw).get('List-Unsubscribe')!=='One-Click')return new Response('Invalid unsubscribe request',{status:400});
    await unsubscribe(oneClick);
    // Idempotent response, without exposing whether a subscriber exists.
    return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});

}
