"use client";
import { useEffect,useRef } from 'react';
import { AdminBrand } from './admin-brand';
export function StaffWelcome({onComplete}:{onComplete:()=>void}) {
 const enter=useRef<HTMLButtonElement>(null);
 useEffect(()=>{enter.current?.focus({preventScroll:true});const timer=setTimeout(onComplete,1200);return()=>clearTimeout(timer);},[onComplete]);
 return <section className="vn-chat-intro" data-phase="emblem" aria-label="Welcome to your staff workspace"><div className="vn-chat-intro-emblem"><AdminBrand/><span>Welcome to your staff workspace</span></div><button ref={enter} className="vn-welcome-skip" onClick={onComplete}>Enter workspace</button></section>;
}
