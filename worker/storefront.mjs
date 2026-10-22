// Standalone account action page. No analytics or third-party page assets.
const authActionHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Account verification · Vanta Noir</title><style>
:root{--accent:#c8ff65;--on-accent:#101110;color-scheme:dark;font-family:Arial,Helvetica,sans-serif;color:#f5f1e8;background:#080b09}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:flex;flex-direction:column}header{padding:27px 24px;text-align:center}header a{color:inherit;text-decoration:none;font-size:14px;letter-spacing:7px}main{width:min(100% - 48px,960px);margin:auto;display:grid;grid-template-columns:1fr 1fr;border:1px solid #ffffff16;border-radius:16px;overflow:hidden;background:#0e120f}.campaign{position:relative;min-height:540px;background:#201313}.campaign img{width:100%;height:100%;position:absolute;object-fit:cover;object-position:52% 44%;filter:brightness(.76)}.campaign:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 25%,#080b09e8)}.campaign-copy{position:absolute;z-index:1;bottom:36px;left:30px;right:30px}.campaign-copy span{font-size:10px;letter-spacing:3px;color:#e0d6cf}.campaign-copy p{font-size:38px;font-weight:300;line-height:1.1;letter-spacing:-1px;color:#f5f1e8;margin:16px 0 0}.content{padding:42px 34px;align-self:center}.eyebrow{font-size:9px;letter-spacing:3px;color:var(--accent);margin:0 0 22px}.mark{width:82px;height:70px;display:grid;place-items:center;margin-bottom:24px;color:#dce3df}.mark svg{width:78px;height:64px;overflow:visible}.check{display:none}.mark[data-success="true"] .envelope{display:none}.mark[data-success="true"] .check{display:block;stroke:var(--accent)}h1{font-size:clamp(29px,5vw,39px);font-weight:400;line-height:1.12;letter-spacing:-1.2px;margin:0 0 16px}p{font-size:14px;line-height:1.7;color:#b7bdb7;margin:0 0 26px}button,.primary{display:block;width:100%;background:var(--accent);color:var(--on-accent);border:1px solid var(--accent);padding:17px 20px;font-size:14px;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;border-radius:9px;min-height:52px}button:hover,.primary:hover{filter:brightness(.92)}button:disabled{opacity:.55;cursor:wait}a{color:#f5f1e8}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:5px}.secondary{display:block;text-align:center;font-size:12px;margin-top:23px;text-underline-offset:5px;color:#c4cac4}label{display:block;font-size:12px;margin:18px 0 8px}input{width:100%;border:1px solid #59605a;background:#191d19;padding:15px;color:#f5f1e8;border-radius:8px;font-size:16px}form button{margin-top:24px}.note{font-size:12px;margin:20px 0 0}.error{color:#ffbdb0;font-size:13px;margin:18px 0}.secure{display:flex;align-items:center;justify-content:center;gap:7px;margin:24px 0 0;font-size:10px;letter-spacing:1px;color:#78877c}.secure svg{width:12px;height:14px}footer{text-align:center;padding:26px 20px;font-size:9px;letter-spacing:2.4px;color:#8f988f}[hidden]{display:none!important}@media(max-width:650px){header{padding:26px 20px}main{width:min(100% - 32px,430px);display:flex;flex-direction:column;margin:8px auto 0}.campaign{min-height:165px;height:165px}.campaign img{object-position:50% 46%}.campaign-copy{bottom:20px;left:24px}.campaign-copy span{font-size:8px}.campaign-copy p{font-size:25px;line-height:1.1;margin:10px 0 0;max-width:220px}.content{padding:27px 25px 30px;width:100%}.eyebrow{margin-bottom:15px;font-size:8px}.mark{width:62px;height:54px;margin-bottom:18px}.mark svg{width:60px;height:50px}h1{font-size:30px}p{font-size:13px;line-height:1.65;margin-bottom:24px}footer{padding:24px 15px;font-size:8px}.secure{margin-top:22px}}@media(prefers-reduced-motion:no-preference){button,.primary{transition:filter .15s ease}}
</style><script defer src="/auth/action.js"></script></head><body><header><a href="/" aria-label="Vanta Noir home">VANTA NOIR</a></header><main><aside class="campaign" aria-label="Vanta Noir signature"><img src="/images/welcome-burgundy.jpg" alt="Burgundy garment with silver zip" fetchpriority="high"><div class="campaign-copy"><span>CONSIDERED. DISTINCT. YOURS.</span><p>Presence.<br>Power. Precision.</p></div></aside><div class="content"><p class="eyebrow">YOUR VANTA NOIR ACCOUNT</p><div class="mark" id="mark" aria-hidden="true"><svg viewBox="0 0 88 70" fill="none" xmlns="http://www.w3.org/2000/svg"><g class="envelope" stroke="currentColor" stroke-width="1.5"><path d="M8 23 44 3 80 23v39H8Z" fill="#1c2420"/><path d="M17 34V14h54v20" fill="#d4dcd5"/><path d="M27 22h34M27 29h26" stroke="#707b72"/><path d="m8 23 36 25 36-25M8 62l28-21m44 21L52 41"/><path d="M8 62h72" stroke-width="2"/></g><g class="check" stroke-width="2"><circle cx="44" cy="35" r="27"/><path d="m29 35 10 10 21-22"/></g></svg></div><section aria-live="polite" aria-atomic="true"><h1 id="title">A secure step.<br>A personal space.</h1><p id="message">Open the link in your Vanta Noir email to verify your address or reset your password.</p></section><button id="verify" hidden>Verify my email</button><form id="reset" hidden><label for="password">New password</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><label for="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><button id="save" type="submit">Save new password</button></form><p id="error" class="error" role="alert" hidden></p><a id="continue" class="primary" href="/account">Go to my account</a><p id="app-note" class="note" hidden>Return to the Vanta Noir app to continue. Your verification will be checked automatically.</p><a class="secondary" href="mailto:support@vantanoir.store">Need help? Contact us</a><p class="secure"><svg viewBox="0 0 16 19" fill="none" stroke="currentColor"><path d="M3 8V5a5 5 0 0 1 10 0v3M2 8h12v10H2Z"/><path d="M8 11v4"/></svg> SECURE ACCOUNT VERIFICATION</p><noscript><p class="error">Enable JavaScript to complete this secure account step.</p></noscript></div></main><footer>PRESENCE. POWER. PRECISION.</footer></body></html>`;

export function themedAuthActionHtml(accent){
 const safe=/^#[0-9a-fA-F]{6}$/.test(accent||'')?accent:'#c8ff65';
 const rgb=[1,3,5].map(i=>parseInt(safe.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 return authActionHtml.replace('--accent:#c8ff65;--on-accent:#101110','--accent:'+safe+';--on-accent:'+(luminance>.179?'#101110':'#ffffff'));
}

const authActionScript=String.raw`(()=>{
 const params=new URLSearchParams(location.hash.slice(1)||location.search.slice(1));
 const mode=params.get('mode'),code=params.get('oobCode');
 // Keep the one-time code in memory only and remove it from browser history.
 history.replaceState(null,'','/auth/action');
 const el=id=>document.getElementById(id);
 const show=(title,message,mark='↗')=>{el('title').textContent=title;el('message').textContent=message;el('mark').dataset.success=String(mark==='✓');};
 const err=message=>{el('error').textContent=message;el('error').hidden=false;};
 // Google checks the browser key's website restrictions. Send only our origin,
 // never the action URL or one-time code; all other page requests stay no-referrer.
 const request=async(action,body)=>{
  const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:'+action+'?key=AIzaSyB3aZD9bvnM0mjR-XV7Op7V2HJzwmQ7uqg',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'omit',referrer:location.origin+'/',referrerPolicy:'strict-origin',signal:AbortSignal.timeout(15000)});
  const data=await r.json();if(!r.ok){if(r.status===403)throw Error('SERVICE_UNAVAILABLE');throw Error(data.error?.message||'UNAVAILABLE');}return data;
 };
 const failure=e=>{
  const message=String(e.message||'');
  if(/EXPIRED_OOB_CODE|INVALID_OOB_CODE/.test(message))return 'This link has expired or has already been used. If you already verified, return to the app. Otherwise, request a fresh email from your account.';
  if(/WEAK_PASSWORD|PASSWORD_DOES_NOT_MEET_REQUIREMENTS/.test(message))return 'Please choose a stronger password with a mix of uppercase and lowercase letters, numbers and symbols.';
  if(/USER_DISABLED|EMAIL_NOT_FOUND/.test(message))return 'This account action is unavailable. Please contact support.';
  if(message==='SERVICE_UNAVAILABLE')return 'Account services are temporarily unavailable. Please try again later or contact support.';
  return 'We could not connect securely. Check your connection and try again.';
 };
 if(!code||code.length>2048||!['verifyEmail','resetPassword'].includes(mode))return;
 el('continue').hidden=true;
 if(mode==='verifyEmail'){
  show('Make it official.','Confirm your email address to finish setting up your Vanta Noir account.');
  el('verify').hidden=false;
  el('verify').onclick=async()=>{
   el('verify').disabled=true;el('error').hidden=true;
   try{await request('update',{oobCode:code});show('You’re verified.','Your email address is confirmed. Your Vanta Noir account is ready for the next step.','✓');el('verify').hidden=true;el('continue').hidden=false;el('app-note').hidden=false;}
   catch(e){err(failure(e));el('verify').disabled=false;el('continue').hidden=false;}
  };
 }else{
  document.title='Reset your password · Vanta Noir';
  show('A fresh start.','Checking your secure password-reset link…');
  request('resetPassword',{oobCode:code}).then(data=>{
   if(data.requestType!=='PASSWORD_RESET')throw Error('INVALID_OOB_CODE');
   show('A fresh start.','Choose a new password for your Vanta Noir account. Use at least 8 characters.');el('reset').hidden=false;
  }).catch(e=>{show('Let’s try that again.',failure(e));el('continue').hidden=false;});
  el('reset').onsubmit=async event=>{
   event.preventDefault();el('error').hidden=true;
   if(el('password').value!==el('confirm').value){err('Your passwords do not match. Please try again.');return;}
   if(el('password').value.length<8){err('Use at least 8 characters.');return;}
   el('save').disabled=true;
   try{await request('resetPassword',{oobCode:code,newPassword:el('password').value});el('reset').reset();el('reset').hidden=true;show('A fresh start. Secured.','Your password has been changed. Sign in to Vanta Noir with your new password.','✓');el('continue').hidden=false;el('app-note').hidden=false;}
   catch(e){err(failure(e));el('save').disabled=false;}
  };
 }
})();`;

// Production storefront adapter. Business APIs remain at api.vantanoir.store.
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll("'",'&#39;');
function protect(response, request) {
  const r = new Response(response.body, response);
  // Production pages preserve their own indexing policy.
  r.headers.set('X-Content-Type-Options','nosniff');
  r.headers.set('Strict-Transport-Security','max-age=31536000');
  r.headers.set('X-Frame-Options','DENY');
  r.headers.set('Referrer-Policy',response.headers.get('Referrer-Policy')||'strict-origin-when-cross-origin');
  let policy = "default-src 'self'; script-src 'self' https://apis.google.com https://accounts.google.com https://www.gstatic.com https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data: blob:; media-src 'self' https: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://api.vantanoir.store https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://auth.vantanoir.store https://vanta-noir.firebaseapp.com; frame-src https://auth.vantanoir.store https://vanta-noir.firebaseapp.com https://accounts.google.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://api.vantanoir.store https://checkout.paystack.com";
  // Paystack Popup is required only during checkout. Keep other pages restricted.
  if (/^\/checkout(?:\/|$)/.test(new URL(request.url).pathname)) {
    policy = policy.replace("script-src 'self'", "script-src 'self' https://js.paystack.co")
      .replace("connect-src 'self'", "connect-src 'self' https://api.paystack.co https://checkout.paystack.com")
      .replace("frame-src ", "frame-src https://checkout.paystack.com ");
  }
  r.headers.set('Content-Security-Policy', policy);
  r.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  r.headers.set('Cache-Control','no-store');
  r.headers.delete('set-cookie');
  return r;
}
function json(value, status=200) {return Response.json(value,{status});}
async function boundedText(response, limit) {
  const reader=response.body?.getReader(); if(!reader)return '';
  const chunks=[];let length=0;
  try { for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('Response too large');}chunks.push(value);} }
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return new TextDecoder().decode(bytes);
}
// Construct a fresh credential-free request; never forward cookies, auth or Access headers.
async function publicRead(env, path) {
  return env.PUBLIC_API.fetch(new Request('https://api.vantanoir.store'+path,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(15000)}));
}
async function asset(env, request, path) {
  const u=new URL(request.url);u.pathname=path;u.search='';
  return env.ASSETS.fetch(new Request(u,{method:'GET'}));
}
async function htmlPreview(response) {
  const html=await boundedText(response,1500000);
  return new Response(html,{status:response.status,headers:{'Content-Type':'text/html; charset=utf-8'}});
}
async function route(request, env) {
  const u=new URL(request.url),p=u.pathname;
  if(!['vantanoir.store','www.vantanoir.store'].includes(u.hostname))return new Response('Production hostname required',{status:404});
  if(u.protocol!=='https:'||u.hostname==='www.vantanoir.store')return Response.redirect('https://vantanoir.store'+p+u.search,301);
  if(p==='/admin'||p==='/admin/')return Response.redirect('https://api.vantanoir.store/admin',302);
  if(p.startsWith('/api/'))return Response.redirect('https://api.vantanoir.store'+p+u.search,307);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  if(p==='/track'||p==='/track/')return Response.redirect(u.origin+'/help-center'+u.search+'#track-order',302);
  if(p==='/track.js')return new Response('Gone',{status:410});
  if(/^\/(?:index\.(?:php|htm)|home(?:\.html)?)$/.test(p))return Response.redirect(u.origin+'/',302);
  if(/(?:^|\/)\.|\.(?:php|sql|sqlite|db|zip|bak|map|jsonc)$|^\/(?:admin|backups|node_modules|drizzle|lib|app|tests|portable)(?:\/|$)/i.test(p))return new Response('Not found',{status:404});
  if(p==='/auth/action'||p==='/auth/action.js'){
   let html=authActionHtml;
   if(p==='/auth/action'&&env.PUBLIC_API){try{
    const response=await env.PUBLIC_API.fetch(new Request('https://api.vantanoir.store/api/store-settings',{headers:{Accept:'application/json'},credentials:'omit',signal:AbortSignal.timeout(3000)}));
    if(response.ok){const settings=JSON.parse(await boundedText(response,100000));html=themedAuthActionHtml(settings.brandAccent?.storefront);}
   }catch{/* Keep account access available if the theme service is unavailable. */}}
   return new Response(p.endsWith('.js')?authActionScript:html,{headers:{'Content-Type':p.endsWith('.js')?'application/javascript; charset=utf-8':'text/html; charset=utf-8','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}});
  }
  if(p==='/health')return json({ok:true,mode:'production-storefront',source:env.RELEASE_SHA||'unknown'});
  if(p==='/robots.txt')return asset(env,request,'/robots.txt');
  if(p==='/store-config.js')return new Response('window.VANTA_NOIR_CONFIG=Object.freeze({apiBaseUrl:"https://api.vantanoir.store"});',{headers:{'Content-Type':'application/javascript'}});
  if(/^\/images\/vanta-hero(?:-(?:480|960|1600)\.webp|\.png)$/.test(p))return Response.redirect(u.origin+'/images/vanta-brand-hero-2026.webp',301);
  if(/^\/images\/[A-Za-z0-9_./-]+\.(?:webp|png|jpg|jpeg|svg|avif|gif|ico)$/.test(p))return publicRead(env,p);
  if(p==='/sitemap.xml') {
    const live=await publicRead(env,'/api/storefront-visibility?mode=sitemap');
    if(!live.ok)return new Response('Catalogue temporarily unavailable',{status:503});
    const data=JSON.parse(await boundedText(live,2000000));
    if(!Array.isArray(data.slugs))return new Response('Catalogue temporarily unavailable',{status:503});
    const source=await boundedText(await asset(env,request,'/sitemap.xml'),1000000);
    const entries=data.slugs.filter(s=>typeof s==='string'&&/^[a-z0-9][a-z0-9_-]{0,239}$/.test(s)).map(s=>'<url><loc>https://vantanoir.store/products/'+escape(s)+'</loc></url>').join('');
    return new Response(source.replace('</urlset>',entries+'</urlset>'),{headers:{'Content-Type':'application/xml'}});
  }
  if(p.startsWith('/products/')) {
    const m=p.match(/^\/products\/([a-z0-9][a-z0-9_-]{0,239})(?:\.html)?\/?$/);
    if(!m||m[1]==='_dynamic')return new Response('Not found',{status:404});
    const slug=m[1];
    const redirects=JSON.parse(env.PRODUCT_REDIRECTS||'{}');
    if(redirects[slug])return Response.redirect(u.origin+'/products/'+redirects[slug],301);
    const live=await publicRead(env,'/api/storefront-visibility?slug='+encodeURIComponent(slug));
    if(live.status===404)return Response.redirect(u.origin+'/#collection',302);
    if(!live.ok)return new Response('Product temporarily unavailable. Please try again.',{status:503});
    const data=JSON.parse(await boundedText(live,200000));
    if(data.slug!==slug||typeof data.title!=='string'||typeof data.description!=='string')return new Response('Product temporarily unavailable',{status:503});
    const response=await asset(env,request,'/products/_dynamic.html');if(!response.ok)return response;
    let html=await boundedText(response,1500000);
    html=html.replace(/<meta name="robots" content="[^"]*">/g,'');
    html=html.replace('"path":"/products/_dynamic"','"path":"/products/'+slug+'"').replace(/<title>.*?<\/title>/s,()=>'<title>'+escape(data.title)+'</title>');
    const canonical='https://vantanoir.store/products/'+slug;
    html=html.replace('</head>','<link rel="canonical" href="'+canonical+'"><meta property="og:url" content="'+canonical+'"></head>');
    const image=typeof data.image==='string'?(data.image.startsWith('/')&&!data.image.startsWith('//')?'https://vantanoir.store'+data.image:data.image):'';
    html=html.replace(/<meta (?:name|property)="(description|og:title|og:description|og:image|twitter:title|twitter:description|twitter:image)" content="[^"]*">/g,(_,name)=>'<meta '+(name.startsWith('og:')?'property':'name')+'="'+name+'" content="'+escape(name.endsWith('image')?(/^https:\/\//.test(image)?image:''):name.endsWith('title')?data.title:data.description)+'">');
    if(data.structuredData&&typeof data.structuredData==='object')html=html.replace('</head>','<script type="application/ld+json">'+JSON.stringify(data.structuredData).replaceAll('<','\\u003c')+'</script></head>');
    return htmlPreview(new Response(html,{headers:{'Content-Type':'text/html'}}));
  }
  let path=p;
  const old=p.match(/^\/(account|about|contact|help-center|privacy-policy|privacy-choices|shipping-returns|terms-of-service|reviews|case-studies|email-preferences|checkout(?:\/complete)?)(?:\.html|\/index\.html|\/)$/);
  if(old)return Response.redirect(u.origin+'/'+old[1]+u.search,302);
  if(p==='/')path='/index.html';else if(!p.split('/').at(-1).includes('.'))path=p+'.html';
  let response=await asset(env,request,path);
  if(response.status===404){const missing=await asset(env,request,'/404.html');response=new Response(missing.body,{status:404,headers:missing.headers});}
  return response.headers.get('Content-Type')?.includes('text/html')?htmlPreview(response):response;
}
export default {async fetch(request,env) {
  try {const r=protect(await route(request,env), request);return request.method==='HEAD'?new Response(null,r):r;}
  catch {return protect(new Response('Store temporarily unavailable. Please try again.',{status:503}), request);}
}};
