'use client';
import {useEffect,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogTitle} from './ui/dialog';
import {CustomerSignup} from './customer-signup';
import {newsletterDue,newsletterPage} from '@/lib/newsletter-popup';
const DISMISSED='vn-newsletter-dismissed',SUBSCRIBED='vn-newsletter-subscribed';
let sessionDismissed:string|null=null,sessionSubscribed:string|null=null;
function read(key:string){try{return localStorage.getItem(key);}catch{return null;}}
function rememberDismissal(){sessionDismissed=String(Date.now());try{localStorage.setItem(DISMISSED,sessionDismissed);}catch{}}
function rememberSignup(){sessionSubscribed='1';try{localStorage.setItem(SUBSCRIBED,'1');}catch{}}
export function NewsletterPopup(){
  const [open,setOpen]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    if(!newsletterPage(window.location.pathname))return;
    const started=Date.now();let browsed=window.scrollY>120;
    const scroll=()=>{if(window.scrollY>120)browsed=true;};
    window.addEventListener('scroll',scroll,{passive:true});
    const timer=window.setInterval(()=>{
      if(!newsletterPage(window.location.pathname)||document.visibilityState!=='visible'||document.querySelector('[role="dialog"], [role="alertdialog"]')||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return;
      if(!newsletterDue(Date.now(),started,sessionDismissed??read(DISMISSED),sessionSubscribed??read(SUBSCRIBED),browsed))return;
      rememberDismissal();setOpen(true);window.clearInterval(timer);
    },1000);
    return()=>{window.clearInterval(timer);window.removeEventListener('scroll',scroll);};
  },[]);
  function close(){rememberDismissal();setOpen(false);}
  return <>{submitted&&<p className="vn-newsletter-success" role="status">Request saved. Check your email to confirm your subscription.<button type="button" aria-label="Dismiss signup confirmation" onClick={()=>setSubmitted(false)}>×</button></p>}<Dialog open={open} onOpenChange={value=>{if(!value)close();}}><DialogContent className="vn-newsletter-popup" aria-describedby={undefined} onOpenAutoFocus={e=>{e.preventDefault();title.current?.focus();}}>
    <p className="vn-newsletter-brand">VANTA NOIR</p>
    <DialogTitle ref={title} tabIndex={-1}>Stay updated with Vanta Noir</DialogTitle>
    <CustomerSignup hideHeading onSubscribed={()=>{rememberSignup();setSubmitted(true);close();}}/>
    <button type="button" className="vn-newsletter-continue" onClick={close}>Continue shopping</button>
  </DialogContent></Dialog></>;
}
