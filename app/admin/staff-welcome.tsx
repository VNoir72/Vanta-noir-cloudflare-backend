'use client';
import {useEffect,useRef,useState} from 'react';

/** Wait for campaign artwork before starting; never block entry on a failed image. */
export function StaffWelcome({onComplete}:{onComplete:()=>void}){
 const [phase,setPhase]=useState<'loading'|'hero'|'emblem'|'leaving'>('loading');
 const [reduced,setReduced]=useState(false),[markFailed,setMarkFailed]=useState(false);
 const skip=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  skip.current?.focus({preventScroll:true});
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let stopped=false,settled=false,timer:ReturnType<typeof setTimeout>;
  const image=new Image();
  const showMark=()=>{settled=true;if(!stopped)setPhase('emblem');};
  const reduce=()=>{setReduced(preference.matches);if(preference.matches)showMark();};
  reduce();preference.addEventListener('change',reduce);
  if(!preference.matches){
   image.onload=()=>{clearTimeout(timer);if(!stopped&&!settled){settled=true;setPhase(preference.matches?'emblem':'hero');}};
   image.onerror=()=>{clearTimeout(timer);showMark();};
   timer=setTimeout(showMark,2500);
   image.src='/images/vanta-brand-hero-2026.webp';
  }
  return()=>{stopped=true;clearTimeout(timer);image.onload=null;image.onerror=null;preference.removeEventListener('change',reduce);};
 },[]);
 useEffect(()=>{
  if(phase==='loading')return;
  const timer=setTimeout(()=>{
   if(phase==='hero')setPhase('emblem');
   else if(phase==='emblem'&&!reduced)setPhase('leaving');
   else onComplete();
  },phase==='hero'?1400:phase==='emblem'?1200:250);
  return()=>clearTimeout(timer);
 },[phase,reduced,onComplete]);
 return <section className="vn-chat-intro" data-phase={phase} data-reduced={reduced} aria-label="Welcome to your staff workspace">
  <div className="vn-chat-intro-hero" aria-hidden="true"><img src="/images/vanta-brand-hero-2026.webp" alt=""/><div><img src="/images/vanta-spire-on-dark.svg" alt=""/><h2>Welcome to your<br/>staff workspace</h2></div></div>
  <div className="vn-chat-intro-emblem">{!markFailed&&<img src="/images/vanta-emblem.svg" alt="" onError={()=>setMarkFailed(true)}/>}<strong>VANTA NOIR</strong><span>Presence. Power. Precision.</span></div>
  <button ref={skip} className="vn-welcome-skip" onClick={onComplete}>{reduced?'Enter workspace':'Skip welcome'}</button>
 </section>;
}
