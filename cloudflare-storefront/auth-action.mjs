// Standalone account action page: no analytics, cookies, or third-party page assets.
export const authActionHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Account verification · Vanta Noir</title><style>
:root{color-scheme:dark;font-family:Arial,Helvetica,sans-serif;color:#f5f1e8;background:#101110}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:flex;flex-direction:column}header{padding:30px 24px;border-bottom:1px solid #ffffff18;text-align:center}header a{color:inherit;text-decoration:none;font-size:17px;letter-spacing:6px}main{width:min(100%,520px);padding:64px 28px;margin:auto} .eyebrow{font-size:10px;letter-spacing:3px;color:#acb5ad;margin:0 0 24px}.mark{width:54px;height:54px;border:1px solid #b6e1c1;border-radius:50%;display:grid;place-items:center;margin-bottom:28px;color:#b6e1c1;font-size:24px}h1{font-size:clamp(32px,8vw,44px);font-weight:500;line-height:1.08;letter-spacing:-1.5px;margin:0 0 20px}p{font-size:15px;line-height:1.7;color:#bec2bd;margin:0 0 24px}button,.primary{display:block;width:100%;background:#c0e7c9;color:#101610;border:0;padding:17px 20px;font-size:14px;font-weight:600;text-align:center;text-decoration:none;cursor:pointer;border-radius:2px}button:disabled{opacity:.55;cursor:wait}a{color:#f5f1e8}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #c0e7c9;outline-offset:5px}.secondary{display:block;text-align:center;font-size:13px;margin-top:23px;text-underline-offset:5px}label{display:block;font-size:12px;margin:18px 0 8px}input{width:100%;border:1px solid #59605a;background:#191d19;padding:15px;color:#f5f1e8;border-radius:2px;font-size:16px}form button{margin-top:24px}.note{font-size:12px;margin-top:25px}.error{color:#ffbdb0;font-size:13px;margin-top:18px}footer{text-align:center;padding:28px 20px;font-size:10px;letter-spacing:2px;color:#8f988f;border-top:1px solid #ffffff18}[hidden]{display:none!important}@media(max-width:380px){main{padding:38px 22px}}
</style><script defer src="/auth/action.js"></script></head><body><header><a href="/" aria-label="Vanta Noir home">VANTA NOIR</a></header><main><p class="eyebrow">YOUR VANTA NOIR ACCOUNT</p><div class="mark" id="mark" aria-hidden="true">↗</div><section aria-live="polite" aria-atomic="true"><h1 id="title">A secure step.<br>A personal space.</h1><p id="message">Open the link in your Vanta Noir email to verify your address or reset your password.</p></section><button id="verify" hidden>Verify my email</button><form id="reset" hidden><label for="password">New password</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><label for="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><button id="save" type="submit">Save new password</button></form><p id="error" class="error" role="alert" hidden></p><a id="continue" class="primary" href="/account">Go to my account</a><p id="app-note" class="note" hidden>Using the Android app? Return to Vanta Noir on your phone to continue.</p><a class="secondary" href="mailto:support@vantanoir.store">Need help? Contact us</a><noscript><p class="error">Enable JavaScript to complete this secure account step.</p></noscript></main><footer>PRESENCE. POWER. PRECISION.</footer></body></html>`;

export const authActionScript=String.raw`(()=>{
 const params=new URLSearchParams(location.hash.slice(1)||location.search.slice(1));
 const mode=params.get('mode'),code=params.get('oobCode');
 // Keep the one-time code in memory only and remove it from browser history.
 history.replaceState(null,'','/auth/action');
 const el=id=>document.getElementById(id);
 const show=(title,message,mark='↗')=>{el('title').textContent=title;el('message').textContent=message;el('mark').textContent=mark;};
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
