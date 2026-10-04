'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
const guides:Array<[RegExp,string]>=[
 [/price|amount.*₦|naira/i,'Enter the amount in naira (₦), not kobo. For example, enter 30000 for ₦30,000. Use Save price or Save edited prices to apply it. Staff submissions wait for owner approval.'],
 [/stock|quantity|on hand/i,'Enter the actual number you have for this size and colour. Zero prevents purchases of that variation. Reserved units belong to checkouts in progress. Save the changed row to update availability; do not enter sample quantities for stock you do not have.'],
 [/staff email/i,'Enter the email this staff member will use for the sign-in code. Choose their role and enable access, then Add staff or Save changes. Cloudflare checks this list automatically. Delete removes them and rejects their pending requests.'],
 [/staff role/i,'Catalogue: products and stock. Fulfilment: orders and delivery. Support: orders and returns. Analyst: sales reports. Only the owner manages staff and approves changes.'],
 [/staff access/i,'Enabled allows this email to sign in with its assigned role. Disabled blocks dashboard and API access. Add staff or Save changes applies this choice.'],
 [/status|publish|archive/i,'Published products appear in the store when they have active variations. Drafts are private. Archived products are hidden but retained for history. Publishing does not add stock. Save the product to apply your choice.'],
 [/availability/i,'Ready-to-buy products require stock. Preview products can be shown without being purchasable. Preorders still require an intentional stock allocation. Choose the appropriate option and save the product.'],
 [/colour|color|design tag/i,'Use a consistent colour or design name for the variation and its gallery photos so the correct images appear together. Save the product after editing.'],
 [/image|photo|artwork/i,'Choose or upload the image for this view. Keep the correct colour and front, back, left or right label. Save the product or the artwork selection to apply it.'],
 [/collection|category/i,'Choose where shoppers should find this garment. Main collections organise the store; a named drop groups a release. Save your changes after selecting.'],
 [/size|measurement|fit/i,'Use the garment’s actual sizing information. Check the unit and size label before saving. Adding a size starts it at zero stock until you enter its quantity.'],
 [/slug/i,'This is the product’s address in the store. Use lowercase letters, numbers and hyphens. Changing it may affect links you have already shared.'],
 [/sku/i,'Use a unique stock code for this size and colour. Keep existing codes when possible so you can track the same variation.'],
 [/fabric|material|weight|gsm|care/i,'Enter the confirmed production specification for this garment. Keep units visible and distinguish a design target from a measured value. Save the product when finished.'],
 [/accept.*orders|inventory.*confirm/i,'Enable selling only when prices, delivery settings and actual inventory are ready. This switch does not create stock. Save store settings to apply it.'],
 [/tracking|carrier|delivery|dispatch|shipping/i,'Enter the actual courier and delivery details. Use a full HTTPS address for tracking links. Save delivery details; staff changes require owner approval.'],
 [/refund|return/i,'Record the actual return or refund outcome. Recording a refund here does not transfer money. Refund payment changes are restricted to the owner.'],
 [/name|title|description/i,'Enter the wording you want to display. Keep names clear and descriptions specific to this item, then use the section’s Save button.'],
 [/date|from|through|starts|ends/i,'Choose the intended date or reporting period. Where UTC is shown, times use UTC. Apply filters to view results; save forms to change settings.'],
];
function helpFor(label:string){return guides.find(([pattern])=>pattern.test(label))?.[1]||`Edit ${label.toLowerCase()}, then use the Save or Apply button in this section. Your change is not applied until saved. Staff changes require the owner’s approval.`;}
export function AdminFieldHelp(){
 const [help,setHelp]=useState<{label:string;text:string}|null>(null),trigger=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{
  const added=new Set<HTMLButtonElement>(),seen=new WeakMap<Element,HTMLButtonElement>();
  function scan(){document.querySelectorAll<HTMLElement>('main input,main select,main textarea,[role="dialog"] input,[role="dialog"] select,[role="dialog"] textarea, main [role="combobox"], [role="dialog"] [role="combobox"]').forEach(field=>{
   if(field.closest('.vn-help-dialog')||field.getAttribute('type')==='hidden'||field.getAttribute('type')==='file')return;
   if(seen.get(field)?.isConnected)return;
   const label=field.closest('label')||(field.id?document.querySelector('label[for="'+CSS.escape(field.id)+'"]'):null);
   const title=(field.getAttribute('aria-label')||label?.textContent||field.getAttribute('placeholder')||'This field').replace(/\s+/g,' ').trim().slice(0,120);
   const button=document.createElement('button');button.type='button';button.className='vn-field-info';button.textContent='i';button.setAttribute('aria-label','Help: '+title);button.setAttribute('title','Explain '+title);
   button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();trigger.current=button;setHelp({label:title,text:helpFor(title)});});
   // A sibling avoids turning a label click into a control toggle.
   if(label)label.insertAdjacentElement('afterend',button);else field.insertAdjacentElement('afterend',button);seen.set(field,button);added.add(button);
  });}
  scan();const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();added.forEach(button=>button.remove());};
 },[]);
 // Keep Escape scoped to the help layer even when an editor dialog is beneath it.
 useLayoutEffect(()=>{if(!help)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();setHelp(null);}};window.addEventListener('keydown',escape,true);return()=>window.removeEventListener('keydown',escape,true);},[help]);
 return <Dialog open={help!==null} onOpenChange={open=>{if(!open)setHelp(null);}}><DialogContent className="vn-help-dialog" showCloseButton={false} onCloseAutoFocus={event=>{event.preventDefault();if(trigger.current?.isConnected)trigger.current.focus({preventScroll:true});}}><DialogTitle>{help?.label}</DialogTitle><DialogDescription>{help?.text}</DialogDescription><button type="button" onClick={event=>{event.preventDefault();event.stopPropagation();setHelp(null);}}>Got it</button></DialogContent></Dialog>;
}
