'use client';
import {useOperationDraft,useAdminNavigation} from './unsaved-changes';
import {useState,useRef,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {SHIPPING_COUNTRIES} from '@/lib/shipping-countries';
import {formatNaira} from '@/lib/catalog';
import type {RewardCampaign} from '@/lib/rewards';
type Campaign=RewardCampaign&{redeemed:number};
type Gift={id:string;name:string;color:string;size:string;available:number};
type Save=(action:string,data:unknown)=>Promise<any>;
const dateValue=(iso:string)=>{const d=new Date(iso);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const newCode=()=> 'VN-'+crypto.randomUUID().replaceAll('-','').slice(0,24).toUpperCase();
export function RewardCampaigns({campaigns,gifts,save,busy}:{campaigns:Campaign[];gifts:Gift[];save:Save;busy:boolean}){
 const navigate=useAdminNavigation();
 const [creating,setCreating]=useState(false),[filter,setFilter]=useState('');
 const filtered=campaigns.filter(c=>(c.title+' '+c.code+' '+c.recipientEmail).toLowerCase().includes(filter.toLowerCase()));
 return <section className="ops-rewards" aria-label="Free shipping and gift campaigns"><h3>Free shipping & gifts</h3><p>Set separate spending amounts for delivery and a gift, or use the same amount to unlock both. Eligibility uses item prices before discount codes, excluding delivery and gifts. One reward campaign applies per order.</p>
 <Button variant="outline" disabled={busy} onClick={()=>navigate(()=>setCreating(!creating))}>{creating?'Cancel new reward':'Create a reward'}</Button>
 {creating&&<RewardForm gifts={gifts} save={save} busy={busy} onSaved={()=>setCreating(false)}/>}
 {campaigns.length>0&&<Label className="ops-field">Find a reward, code or recipient<Input value={filter} onChange={e=>setFilter(e.target.value)}/></Label>}
 {filtered.map(c=><details key={c.id+':'+c.version}><summary>{c.title} · {c.active?'Enabled':'Paused'} · {c.redeemed} paid uses</summary>
 <p>{c.shippingMinimumKobo!==null?`Free shipping from ${formatNaira(c.shippingMinimumKobo)}. `:''}{c.giftMinimumKobo!==null?`Gift from ${formatNaira(c.giftMinimumKobo)}. `:''}{c.access==='code'?`Private code: ${c.code}${c.recipientEmail?' · '+c.recipientEmail:''}`:'Automatic offer'}</p>
 <RewardForm row={c} gifts={gifts} save={save} busy={busy}/></details>)}
 {!campaigns.length&&<p>No rewards yet. New offers start paused.</p>}
 <WinnerDraw campaigns={campaigns} save={save} busy={busy}/><hr/><h3>Discount codes</h3>
 </section>;
}
function RewardForm({row,gifts,save,busy,onSaved}:{row?:Campaign;gifts:Gift[];save:Save;busy:boolean;onSaved?:()=>void}){
 const [v,setV]=useState(()=>({title:row?.title||'',shipping:row?row.shippingMinimumKobo!==null:true,gift:row?row.giftMinimumKobo!==null:false,
 shippingAmount:String((row?.shippingMinimumKobo??30000000)/100),giftAmount:String((row?.giftMinimumKobo??30000000)/100),giftVariantId:row?.giftVariantId||'',
 countries:row?.countries||['NG'],startsAt:dateValue(row?.startsAt||new Date().toISOString()),endsAt:dateValue(row?.endsAt||new Date(Date.now()+30*86400000).toISOString()),
 combineDiscounts:row?.combineDiscounts||false,access:row?.access||'automatic',code:row?.code||'',recipientEmail:row?.recipientEmail||'',
 maxUses:String(row?.maxUses??0),priority:String(row?.priority??0),active:row?.active||false}));
 const [editing,setEditing]=useState(!row),form=useRef<HTMLFormElement>(null);
 const draft=useOperationDraft('Reward '+(row?.title||'new'),v,x=>{setV(x);setEditing(false);},busy,submit);
 const [error,setError]=useState(''),saving=useRef(false);
 const field=(key:'title'|'shippingAmount'|'giftAmount'|'startsAt'|'endsAt'|'code'|'recipientEmail'|'maxUses'|'priority',label:string,type='text')=><Label className="ops-field">{label}<Input type={type} value={v[key]} required={!['recipientEmail'].includes(key)} min={type==='number'?'0':undefined} max={key==='priority'?100:key==='maxUses'?1000000:type==='number'?1000000000:undefined} step={type==='number'?(['maxUses','priority'].includes(key)?'1':'0.01'):undefined} maxLength={key==='title'?100:key==='code'?48:key==='recipientEmail'?200:undefined} onChange={e=>setV({...v,[key]:e.target.value})}/></Label>;
 const check=(key:'shipping'|'gift'|'combineDiscounts'|'active',label:string)=><label className="ops-check"><input type="checkbox" checked={v[key]} onChange={e=>setV({...v,[key]:e.target.checked})}/>{label}</label>;
 async function submit(){if(saving.current||busy||!form.current?.reportValidity())return false;saving.current=true;setError('');try{
 const r=await save('reward',{id:row?.id||'',version:row?.version||0,title:v.title,active:v.active,shippingMinimumKobo:v.shipping?Math.round(Number(v.shippingAmount)*100):null,giftMinimumKobo:v.gift?Math.round(Number(v.giftAmount)*100):null,giftVariantId:v.gift?v.giftVariantId:'',countries:v.countries,
 startsAt:new Date(v.startsAt).toISOString(),endsAt:new Date(v.endsAt).toISOString(),combineDiscounts:v.combineDiscounts,access:v.access,code:v.access==='code'?v.code:'',recipientEmail:v.access==='code'?v.recipientEmail:'',maxUses:Number(v.maxUses),priority:Number(v.priority)});
 if(r){draft.markSaved();setEditing(false);onSaved?.();}return !!r;
 }catch{setError('Check the amounts and dates before saving.');return false;}finally{saving.current=false;}}
 return <form ref={form} className="ops-form" onSubmit={e=>{e.preventDefault();void submit();}}><div className="vn-editor-heading"><strong>Reward details</strong><Button type="button" disabled={busy} onClick={()=>editing?void submit():setEditing(true)}>{editing?'Save':'Edit'}</Button></div><fieldset disabled={busy||!editing}><div className="ops-fields">{field('title','Offer name')}
 <Label className="ops-field">Who can claim it?<select value={v.access} onChange={e=>setV({...v,access:e.target.value as typeof v.access,maxUses:e.target.value==='code'&&v.maxUses==='0'?'1':v.maxUses,code:e.target.value==='code'?(v.code||newCode()):''})}><option value="automatic">Automatic for eligible shoppers</option><option value="code">People with a private reward code</option></select></Label></div>
 <div className="ops-fields"><div>{check('shipping','Include free shipping')}{v.shipping&&field('shippingAmount','Free shipping from (₦)','number')}</div><div>{check('gift','Include one free gift')}{v.gift&&<>{field('giftAmount','Free gift from (₦)','number')}<Label className="ops-field">Gift product, colour and size<select required value={v.giftVariantId} onChange={e=>setV({...v,giftVariantId:e.target.value})}><option value="">Choose a gift</option>{v.giftVariantId&&!gifts.some(g=>g.id===v.giftVariantId)&&<option value={v.giftVariantId}>Previous gift unavailable — choose another</option>}{gifts.map(g=><option key={g.id} value={g.id}>{g.name} · {g.color} · {g.size} ({Math.max(0,g.available)} available)</option>)}</select></Label></>}</div></div>
 <p>Enter 0 to remove the spending minimum. The gift is one unit per order while stock lasts. Gifts use your normal inventory.</p>
 <details><summary>Eligible countries ({v.countries.length})</summary><p>Nigeria covers all 36 states and the FCT. Delivery must already be available in your shipping settings.</p><div className="ops-countries">{SHIPPING_COUNTRIES.map(([code,name])=><label className="ops-check" key={code}><input type="checkbox" checked={v.countries.includes(code)} onChange={e=>setV({...v,countries:e.target.checked?[...v.countries,code]:v.countries.filter(c=>c!==code)})}/>{name}</label>)}</div></details>
 <div className="ops-fields">{field('startsAt','Starts (your device timezone)','datetime-local')}{field('endsAt','Ends (your device timezone)','datetime-local')}{field('maxUses','Total uses (0 = unlimited)','number')}{field('priority','Priority (0–100, higher applies first)','number')}</div>
 {v.access==='code'&&<><div className="ops-fields">{field('code','Private reward code')}{field('recipientEmail','Recipient email (optional)','email')}</div><Button type="button" variant="outline" onClick={()=>setV({...v,code:newCode()})}>Generate a new private code</Button><p>Set total uses to 1 for a single-use reward. Share the code privately. An email restriction matches checkout contact details; it does not verify email ownership.</p></>}
 {check('combineDiscounts','Allow this reward with a discount code')}{check('active','Enable this offer during its scheduled dates')}
 {error&&<p role="alert" className="ops-error">{error}</p>}<Button type="submit" disabled={busy||(!v.shipping&&!v.gift)||!v.countries.length||!!(v.gift&&!v.giftVariantId)}>{busy?'Saving…':v.active?'Save enabled offer':'Save paused offer'}</Button>
 </fieldset></form>;
}
function WinnerDraw({campaigns,save,busy}:{campaigns:Campaign[];save:Save;busy:boolean}){
 const [templateId,setTemplateId]=useState(''),[emails,setEmails]=useState(''),[count,setCount]=useState('1'),[result,setResult]=useState<Array<{email:string;code:string}>>([]);
 const drawId=useRef(''),lock=useRef(false);function change(){drawId.current='';setResult([]);}
 return <details><summary>Choose lucky recipients</summary><p>Paste eligible email addresses and choose how many people should receive a reward. Each winner gets a separate, paused, single-use code using the template’s amounts, gift, countries and dates. No emails are sent.</p>
 <form className="ops-form" onSubmit={async e=>{e.preventDefault();if(lock.current||busy)return;lock.current=true;drawId.current||=crypto.randomUUID();try{const r=await save('reward-draw',{templateId,emails:emails.split(/[\s,;]+/).filter(Boolean),count:Number(count),drawId:drawId.current});if(r)setResult(r.winners);}finally{lock.current=false;}}}><fieldset disabled={busy}>
 <div className="ops-fields"><Label className="ops-field">Reward template<select required value={templateId} onChange={e=>{setTemplateId(e.target.value);change();}}><option value="">Choose a saved campaign</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.title}{c.recipientEmail?' · '+c.recipientEmail:''}</option>)}</select></Label><Label className="ops-field">Number of winners (1–25)<Input type="number" min="1" max="25" step="1" required value={count} onChange={e=>{setCount(e.target.value);change();}}/></Label></div>
 <Label className="ops-field">Eligible emails (up to 500)<Textarea required value={emails} onChange={e=>{setEmails(e.target.value);change();}}/></Label><Button disabled={busy||!templateId||!emails.trim()}>{result.length?'Show this draw again':'Draw winners & create paused codes'}</Button>
 </fieldset></form>{result.length>0&&<div role="status"><p>Saved. Find each code above, review and enable it when ready, then share it privately.</p><div className="ops-table"><table><thead><tr><th>Recipient</th><th>Code</th></tr></thead><tbody>{result.map(w=><tr key={w.code}><td>{w.email}</td><td><code>{w.code}</code></td></tr>)}</tbody></table></div></div>}</details>;
}
