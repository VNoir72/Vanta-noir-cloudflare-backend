"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readStorage, writeStorage } from "@/lib/browser-store";
const ID="G-29RJ57JB76",KEY="vanta-noir-analytics-consent";
type Consent="granted"|"denied"|null;
type AnalyticsBrowser=Window & {dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;"ga-disable-G-29RJ57JB76"?:boolean};
function loadAnalytics(){
  const w=window as AnalyticsBrowser;w[`ga-disable-${ID}`]=false;
  if(w.gtag)return;
  w.dataLayer=w.dataLayer||[];w.gtag=function(){if(readStorage(KEY)==="granted")w.dataLayer!.push(arguments);};
  w.gtag("js",new Date());w.gtag("config",ID,{allow_google_signals:false,allow_ad_personalization_signals:false,send_page_view:false});
  if(!document.getElementById("vanta-analytics-script")){const script=document.createElement("script");script.id="vanta-analytics-script";script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${ID}`;document.head.appendChild(script);}
}
function setConsent(value:Exclude<Consent,null>){
  writeStorage(KEY,value);
  const w=window as AnalyticsBrowser;w[`ga-disable-${ID}`]=value!=="granted";
  if(value==="denied"){
    for(const cookie of document.cookie.split(";")){const name=cookie.split("=")[0].trim();if(!name.startsWith("_ga"))continue;document.cookie=`${name}=; Max-Age=0; path=/`;const parts=location.hostname.split(".");for(let i=0;i<parts.length-1;i++)document.cookie=`${name}=; Max-Age=0; path=/; domain=.${parts.slice(i).join(".")}`;}
  }
  window.dispatchEvent(new Event("vanta-consent-change"));
}
function useConsent(){const [choice,setChoice]=useState<Consent>(null);const [ready,setReady]=useState(false);useEffect(()=>{const update=()=>{const value=readStorage(KEY);setChoice(value==="granted"||value==="denied"?value:null);setReady(true);};update();window.addEventListener("vanta-consent-change",update);window.addEventListener("storage",update);return()=>{window.removeEventListener("vanta-consent-change",update);window.removeEventListener("storage",update);};},[]);return {choice,ready};}
export function AnalyticsConsent(){
  const {choice,ready}=useConsent();const pathname=usePathname();const privatePage=pathname?.startsWith("/admin")||pathname?.startsWith("/email-preferences");
  useEffect(()=>{if(choice!=="granted"||privatePage)return;loadAnalytics();(window as AnalyticsBrowser).gtag?.("event","page_view",{page_location:location.origin+location.pathname,page_title:document.title});window.dispatchEvent(new Event("vanta-analytics-ready"));},[choice,pathname,privatePage]);
  if(!ready||choice||privatePage)return null;
  return <aside className="vn-analytics-choice" aria-label="Analytics preference"><p>Allow visit measurement to help improve Vanta Noir? Your bag works with either choice.</p><div><button onClick={()=>setConsent("denied")}>Decline analytics</button><button onClick={()=>setConsent("granted")}>Allow analytics</button><a href="/privacy-choices">Privacy choices</a></div></aside>;
}
export function AnalyticsPreferences(){const {choice}=useConsent();return <div className="vn-privacy-notice"><p>Optional Google Analytics: <strong>{choice==="granted"?"allowed":choice==="denied"?"declined":"not enabled"}</strong>.</p><p>Google signals and advertising personalisation are disabled. You can change this choice at any time.</p><div className="flex flex-wrap gap-3 mt-4"><button className="vn-pill" aria-pressed={choice==="denied"} onClick={()=>setConsent("denied")}>Decline analytics</button><button className="vn-pill" aria-pressed={choice==="granted"} onClick={()=>setConsent("granted")}>Allow analytics</button></div></div>;}
