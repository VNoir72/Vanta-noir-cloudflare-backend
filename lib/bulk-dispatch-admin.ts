import {adminAuthStateFromRequest} from './admin-auth';
import {rateLimit} from './rate-limit';
import {readWebhookBody} from './shipbubble-webhook';
import {DispatchError,dispatchOrders,reviewDispatch,bookDispatch,dispatchReviews} from './bulk-dispatch';
import {z} from 'zod';
const escape=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money=(v:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(v/100);
const json=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export async function bulkDispatchAdmin(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 if(auth.role!=='owner')return Response.json({error:'Owner access required.'},{status:403});
 const url=new URL(request.url);
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin)return Response.json({error:'Open the owner dispatch page.'},{status:403});
  if(!await rateLimit(request,'bulk-dispatch',240,3600))return Response.json({error:'Please wait before trying again.'},{status:429});
  try{
   const body=JSON.parse(new TextDecoder().decode(await readWebhookBody(request)));
   if(body.action==='review')return Response.json(await reviewDispatch(body,auth.email));
   if(body.action==='book'){
    const b=z.object({id:z.string().uuid(),confirmed:z.literal(true)}).parse(body);return Response.json(await bookDispatch(b.id,auth.email));
   }
   return Response.json({error:'Unknown action.'},{status:400});
  }catch(e){return Response.json({error:e instanceof DispatchError?e.message:e instanceof z.ZodError?'Check the parcel dimensions, weight and selection.':'Could not complete this request. Reload to check booking status before trying again.'},{status:400});}
 }
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const page=Math.min(10000,Math.max(0,Number.parseInt(url.searchParams.get('page')||'0')||0));
 const ids=(url.searchParams.get('reviews')||'').split(',').filter(id=>z.string().uuid().safeParse(id).success).slice(0,20);
 const [orders,reviews]=await Promise.all([dispatchOrders(page),dispatchReviews(ids,auth.email)]);
 return bulkDispatchPage(orders,reviews,page);
}
export function bulkDispatchPage(orders:Awaited<ReturnType<typeof dispatchOrders>>,reviews:Awaited<ReturnType<typeof dispatchReviews>>,page=0){
 const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10),latest=new Date(Date.now()+14*86400000).toISOString().slice(0,10);
 return new Response(String.raw`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>Bulk dispatch | Vanta Noir</title><style>
 *{box-sizing:border-box}body{margin:0;background:#f4f6f2;color:#141414;font:16px system-ui;line-height:1.5}main{max-width:1120px;margin:auto;padding:24px}h1{font-size:36px;margin:12px 0}h2{font-size:22px}a{color:#264d12}section,article{background:#ffffffdd;border:1px solid #dce3d7;border-radius:20px;padding:22px;margin:18px 0;box-shadow:0 8px 24px #17251008}button,.button{background:#c8ff65;border:1px solid #a4ce66;border-radius:24px;padding:12px 18px;color:#141414;cursor:pointer;font:inherit;display:inline-block;text-decoration:none}button:disabled{opacity:.5;cursor:default}.secondary{background:white;border-color:#ccd5c6}input{font:inherit;border:1px solid #b5c2af;border-radius:9px;padding:10px;max-width:100%;background:white;color:#141414}input[type=checkbox]{width:21px;height:21px;vertical-align:middle}label{display:block}small,.muted{color:#4b5d43}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.grid input{width:100%}.parcel:disabled{background:#f0f3ed}.topline{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}.problem,.error{color:#963717}.status{white-space:pre-wrap;overflow-wrap:anywhere}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}fieldset{border:0;margin:0;padding:0}details{margin-top:12px}summary{cursor:pointer}#progress{white-space:pre-wrap}#review-list article{box-shadow:none}nav{display:flex;gap:16px}.review-total{font-size:22px;font-weight:700}@media(max-width:600px){main{padding:16px}h1{font-size:30px}section,article{padding:16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 </style><main><nav><a href="/admin">Admin</a><a href="/api/admin/shipbubble">Individual shipping</a><a href="/api/admin/shipping-weights">Approved weights</a></nav><p class="muted">VANTA NOIR · FULFILMENT</p><h1>Bulk dispatch</h1><p>Select packed orders. Each keeps the customer’s courier and destination. Review current charges, then confirm bookings together.</p><p class="muted">Different couriers may collect separately. Pickup dates are requested, subject to the courier’s confirmation. One sealed parcel per order; split parcels need individual arrangements.</p>
 <section><h2>1. Prepare selected orders</h2><label>Requested pickup date <input id="pickup" type="date" value="${tomorrow}" min="${tomorrow}" max="${latest}"></label><p>Weights include garments, the approved box and packing allowance. Edit the total packed weight or outside dimensions if your parcel differs. The saved box weight is already included—do not add it again.</p><label><input id="select-all" type="checkbox"> Select all available orders on this page</label></section>
 <div id="orders">${orders.rows.map(row=>{
 if(!row.ok)return `<article><strong>${escape(row.reference)}</strong><p>${escape(row.problem)}</p></article>`;
 const disabled=Boolean(row.linked||row.booking||!row.carrier);return `<article class="order" data-reference="${escape(row.reference)}" data-fingerprint="${row.fingerprint}"><div class="topline"><label><input class="selected" type="checkbox" ${disabled?'disabled':''}> <strong>${escape(row.reference)}</strong></label><span>${escape(row.carrier||'Courier not saved')}</span></div><p>${escape(row.recipient)}<br>${escape(row.address)}</p><p>Delivery paid: <strong>${money(row.shippingKobo)}</strong></p>${row.problem?`<p class="problem">${escape(row.problem)}</p>`:''}${row.booking?`<p class="status">${escape(row.booking.state)} ${escape(row.booking.shipmentId||'')} ${escape(row.booking.message||'')}</p>`:''}<details><summary>Parcel · ${row.defaults?`${row.defaults.weightKg} kg · ${row.defaults.lengthCm} × ${row.defaults.widthCm} × ${row.defaults.heightCm} cm`:'Enter dimensions'}</summary><p class="muted">${escape(row.source)}</p><button class="edit secondary" type="button" ${disabled?'disabled':''}>Edit parcel</button><div class="grid">${(['weightKg','lengthCm','widthCm','heightCm'] as const).map((k,i)=>`<label>${['Packed weight (kg)','Length (cm)','Width (cm)','Height (cm)'][i]}<input class="parcel" name="${k}" type="number" step="any" min="0.001" max="${i?200:50}" value="${row.defaults?.[k]??''}" disabled></label>`).join('')}</div></details></article>`;}).join('')||'<section><p>No paid orders are awaiting dispatch yet. They will appear here after payment confirmation.</p></section>'}</div>
 <nav>${page?`<a href="?page=${page-1}">Previous orders</a>`:''}${orders.hasMore?`<a href="?page=${page+1}">Next orders</a>`:''}</nav>
 <section><label><input id="packed" type="checkbox"> The selected orders are packed and these whole-parcel weights and dimensions are ready for booking.</label><div class="actions"><button id="review" ${orders.rows.length?'':'disabled'}>Review selected dispatches</button></div><p id="progress" role="status" aria-live="polite"></p></section>
 <section id="review-panel" hidden><h2>2. Review and book</h2><p>These are fresh rates for the customer’s selected courier. No bookings have been made by reviewing. Confirming below charges your Shipbubble wallet; it does not charge customers again.</p><div id="review-list"></div><p id="total" class="review-total"></p><label><input id="confirm" type="checkbox"> I approve the displayed wallet charges and pickup details for these parcels.</label><div class="actions"><button id="book">Confirm &amp; book reviewed orders</button><a class="button secondary" href="/api/admin/bulk-dispatch">Refresh orders</a></div><p class="muted">Keep this page open while it processes. After an interruption, reopen this review URL to see results. Uncertain bookings are held for checking, never automatically retried.</p></section></main>
 <script>
 const initial=${json(reviews)};
 const $=id=>document.getElementById(id), money=k=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(k/100);
 let reviews=initial,busy=false;
 function line(parent,text,tag='p'){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
 function statusText(b){return b?b.state==='booked'?'Booked · '+b.shipmentId+(b.message?' · '+b.message:''):b.message||'Booking in progress or interrupted. Check Shipbubble before booking again.':'';}
 function render(){
  $('review-panel').hidden=!reviews.length;$('review-list').replaceChildren();let total=0,extra=0,pending=0;
  for(const r of reviews){const el=document.createElement('article');line(el,r.reference+' · '+r.carrier,'h3');line(el,'To: '+r.recipient+' · '+r.address);line(el,'Pickup: '+r.pickupDate+' · '+r.pickupAddress);line(el,r.parcel.weightKg+' kg · '+r.parcel.lengthCm+' × '+r.parcel.widthCm+' × '+r.parcel.heightCm+' cm');line(el,'Wallet charge: '+money(r.chargeKobo)+' · Customer paid: '+money(r.shippingKobo)+' · Store covers: '+money(r.extraKobo));line(el,'Delivery estimate: '+r.delivery);if(r.booking)line(el,statusText(r.booking));else{pending++;total+=r.chargeKobo;extra+=r.extraKobo;if(Date.now()>=r.expiresAt)line(el,'Expired. Reload and review again.');}if(r.error)line(el,r.error).className='error';if(r.booking?.trackingUrl){const a=document.createElement('a');a.href=r.booking.trackingUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent='View shipment tracking';el.append(a);}$('review-list').append(el);}
  $('total').textContent=pending+' awaiting booking · Wallet total '+money(total)+' · Store covers '+money(extra);$('book').disabled=busy||!pending; 
 }
 async function post(body){const res=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let data;try{data=await res.json();}catch{throw Error('Session or network interrupted. Reload this page to check status.');}if(!res.ok)throw Error(data.error||'Request failed.');return data;}
 function lock(value){busy=value;document.querySelectorAll('#orders button,#orders .selected,#select-all,#pickup,#packed,#review,#confirm').forEach(e=>{if(!e.dataset.initialDisabled)e.dataset.initialDisabled=e.disabled?'yes':'no';e.disabled=value||e.dataset.initialDisabled==='yes';});$('book').disabled=value;}
 document.querySelectorAll('.edit').forEach(b=>b.onclick=()=>{const fields=b.closest('details').querySelectorAll('.parcel'),editing=b.textContent==='Edit parcel';fields.forEach(f=>f.disabled=!editing);b.textContent=editing?'Use these parcel details':'Edit parcel';});
 $('select-all').onchange=e=>document.querySelectorAll('.selected:not(:disabled)').forEach(c=>c.checked=e.target.checked);
 $('review').onclick=async()=>{
  const rows=Array.from(document.querySelectorAll('.order')).filter(el=>el.querySelector('.selected').checked&&!el.querySelector('.selected').disabled);
  if(!rows.length||!$('packed').checked){$('progress').textContent='Select orders and confirm they are packed first.';return;}
  for(const el of rows){for(const f of el.querySelectorAll('.parcel')){const n=Number(f.value);if(!Number.isFinite(n)||n<=0||n>Number(f.max)){$('progress').textContent='Check parcel fields for '+el.dataset.reference;return;}}}
  lock(true);reviews=[];$('confirm').checked=false;let errors=[];
  try{for(let i=0;i<rows.length;i++){const el=rows[i];$('progress').textContent='Checking '+(i+1)+' of '+rows.length+'…';try{const parcel=Object.fromEntries(Array.from(el.querySelectorAll('.parcel')).map(f=>[f.name,Number(f.value)]));reviews.push(await post({action:'review',reference:el.dataset.reference,fingerprint:el.dataset.fingerprint,parcel,pickupDate:$('pickup').value,packed:true}));const u=new URL(location.href);u.searchParams.set('reviews',reviews.map(r=>r.id).join(','));history.replaceState(null,'',u);}catch(e){errors.push(el.dataset.reference+': '+e.message);}}$('progress').textContent=reviews.length+' ready for your review.'+(errors.length?'\nNot included:\n'+errors.join('\n'):'');}finally{lock(false);render();}
 };
 $('book').onclick=async()=>{
  if(!$('confirm').checked){$('progress').textContent='Review the displayed charges and tick the approval box first.';return;}
  if(reviews.some(r=>!r.booking&&Date.now()>=r.expiresAt)){$('progress').textContent='Rates expired. Refresh orders and review again.';return;}
  lock(true);
  try{for(let i=0;i<reviews.length;i++){const r=reviews[i];if(r.booking)continue;$('progress').textContent='Booking '+(i+1)+' of '+reviews.length+'…';try{r.booking=await post({action:'book',id:r.id,confirmed:true});}catch(e){r.error=e.message;$('progress').textContent='Stopped: '+e.message+' Reload this review to check the saved status.';break;}render();}$('progress').textContent+='\nResults saved below.';}finally{lock(false);$('confirm').checked=false;render();}
 };
 window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});render();
 </script></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
