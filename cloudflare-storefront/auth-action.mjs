// Standalone account action page. No analytics or third-party page assets.
export const authActionHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Account verification · Vanta Noir</title><style>
:root{--accent:#c8ff65;--on-accent:#101110;color-scheme:dark;font-family:Arial,Helvetica,sans-serif;color:#f5f1e8;background:#080b09}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:flex;flex-direction:column}header{padding:27px 24px;text-align:center}header a{color:inherit;text-decoration:none;font-size:14px;letter-spacing:7px}main{width:min(100% - 48px,960px);margin:auto;display:grid;grid-template-columns:1fr 1fr;border:1px solid #ffffff16;border-radius:16px;overflow:hidden;background:#0e120f}.campaign{position:relative;min-height:540px;background:#201313}.campaign img{width:100%;height:100%;position:absolute;object-fit:cover;object-position:52% 44%;filter:brightness(.76)}.campaign:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 25%,#080b09e8)}.campaign-copy{position:absolute;z-index:1;bottom:36px;left:30px;right:30px}.campaign-copy span{font-size:10px;letter-spacing:3px;color:#e0d6cf}.campaign-copy p{font-size:38px;font-weight:300;line-height:1.1;letter-spacing:-1px;color:#f5f1e8;margin:16px 0 0}.content{padding:42px 34px;align-self:center}.eyebrow{font-size:9px;letter-spacing:3px;color:var(--accent);margin:0 0 22px}.mark{width:82px;height:70px;display:grid;place-items:center;margin-bottom:24px;color:#dce3df}.mark svg{width:78px;height:64px;overflow:visible}.check{display:none}.mark[data-success="true"] .envelope{display:none}.mark[data-success="true"] .check{display:block;stroke:var(--accent)}h1{font-size:clamp(29px,5vw,39px);font-weight:400;line-height:1.12;letter-spacing:-1.2px;margin:0 0 16px}p{font-size:14px;line-height:1.7;color:#b7bdb7;margin:0 0 26px}button,.primary{display:block;width:100%;background:var(--accent);color:var(--on-accent);border:1px solid var(--accent);padding:17px 20px;font-size:14px;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;border-radius:9px;min-height:52px}button:hover,.primary:hover{filter:brightness(.92)}button:disabled{opacity:.55;cursor:wait}a{color:#f5f1e8}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:5px}.secondary{display:block;text-align:center;font-size:12px;margin-top:23px;text-underline-offset:5px;color:#c4cac4}label{display:block;font-size:12px;margin:18px 0 8px}input{width:100%;border:1px solid #59605a;background:#191d19;padding:15px;color:#f5f1e8;border-radius:8px;font-size:16px}form button{margin-top:24px}.note{font-size:12px;margin:20px 0 0}.error{color:#ffbdb0;font-size:13px;margin:18px 0}.secure{display:flex;align-items:center;justify-content:center;gap:7px;margin:24px 0 0;font-size:10px;letter-spacing:1px;color:#78877c}.secure svg{width:12px;height:14px}footer{text-align:center;padding:26px 20px;font-size:9px;letter-spacing:2.4px;color:#8f988f}[hidden]{display:none!important}@media(max-width:650px){header{padding:26px 20px}main{width:min(100% - 32px,430px);display:flex;flex-direction:column;margin:8px auto 0}.campaign{min-height:165px;height:165px}.campaign img{object-position:50% 46%}.campaign-copy{bottom:20px;left:24px}.campaign-copy span{font-size:8px}.campaign-copy p{font-size:25px;line-height:1.1;margin:10px 0 0;max-width:220px}.content{padding:27px 25px 30px;width:100%}.eyebrow{margin-bottom:15px;font-size:8px}.mark{width:62px;height:54px;margin-bottom:18px}.mark svg{width:60px;height:50px}h1{font-size:30px}p{font-size:13px;line-height:1.65;margin-bottom:24px}footer{padding:24px 15px;font-size:8px}.secure{margin-top:22px}}@media(prefers-reduced-motion:no-preference){button,.primary{transition:filter .15s ease}}
</style><script defer src="/auth/action.js"></script></head><body><header><a href="/" aria-label="Vanta Noir home">VANTA NOIR</a></header><main><aside class="campaign" aria-label="Vanta Noir signature"><img src="/images/welcome-burgundy.jpg" alt="Burgundy garment with silver zip" fetchpriority="high"><div class="campaign-copy"><span>CONSIDERED. DISTINCT. YOURS.</span><p>Presence.<br>Power. Precision.</p></div></aside><div class="content"><p class="eyebrow">YOUR VANTA NOIR ACCOUNT</p><div class="mark" id="mark" aria-hidden="true"><svg viewBox="0 0 88 70" fill="none" xmlns="http://www.w3.org/2000/svg"><g class="envelope" stroke="currentColor" stroke-width="1.5"><path d="M8 23 44 3 80 23v39H8Z" fill="#1c2420"/><path d="M17 34V14h54v20" fill="#d4dcd5"/><path d="M27 22h34M27 29h26" stroke="#707b72"/><path d="m8 23 36 25 36-25M8 62l28-21m44 21L52 41"/><path d="M8 62h72" stroke-width="2"/></g><g class="check" stroke-width="2"><circle cx="44" cy="35" r="27"/><path d="m29 35 10 10 21-22"/></g></svg></div><section aria-live="polite" aria-atomic="true"><h1 id="title">A secure step.<br>A personal space.</h1><p id="message">Open the link in your Vanta Noir email to verify your address or reset your password.</p></section><button id="verify" hidden>Verify my email</button><form id="reset" hidden><label for="password">New password</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><label for="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><button id="save" type="submit">Save new password</button></form><p id="error" class="error" role="alert" hidden></p><a id="continue" class="primary" href="/account">Go to my account</a><p id="app-note" class="note" hidden>Return to the Vanta Noir app to continue. Your verification will be checked automatically.</p><a class="secondary" href="mailto:support@vantanoir.store">Need help? Contact us</a><p class="secure"><svg viewBox="0 0 16 19" fill="none" stroke="currentColor"><path d="M3 8V5a5 5 0 0 1 10 0v3M2 8h12v10H2Z"/><path d="M8 11v4"/></svg> SECURE ACCOUNT VERIFICATION</p><noscript><p class="error">Enable JavaScript to complete this secure account step.</p></noscript></div></main><footer>PRESENCE. POWER. PRECISION.</footer></body></html>`;

export function themedAuthActionHtml(accent){
 const safe=/^#[0-9a-fA-F]{6}$/.test(accent||'')?accent:'#c8ff65';
 const rgb=[1,3,5].map(i=>parseInt(safe.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 return authActionHtml.replace('--accent:#c8ff65;--on-accent:#101110','--accent:'+safe+';--on-accent:'+(luminance>.179?'#101110':'#ffffff'));
}

export const authActionScript=String.raw`(()=>{
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
