"use client";
import { useEffect, useState } from "react";
import { apiUrl } from "./api-client";
import { commerceSettingsSchema, defaultCommerceSettings, type CommerceSettings } from "./commerce-config";
type PublicSettings=CommerceSettings & {emailEnabled?:boolean;internationalCourierEnabled?:boolean;loaded:boolean};
function parseSettings(value:Record<string,unknown>):PublicSettings{return {...commerceSettingsSchema.parse(value),emailEnabled:value.emailEnabled===true,internationalCourierEnabled:value.internationalCourierEnabled===true,loaded:true};}
let bootstrapped=false;
function pageSettings():PublicSettings|undefined {if(bootstrapped)return;bootstrapped=true;try{const raw=document.getElementById("vn-public-settings")?.textContent;if(raw)return parseSettings(JSON.parse(raw));}catch{/* Retry the public endpoint if the page snapshot is unavailable. */}}
let cached:Promise<PublicSettings>|undefined,expires=0;
export function useStoreSettings(){
  const [settings,setSettings]=useState<PublicSettings>(()=>({...defaultCommerceSettings(),loaded:false}));
  useEffect(()=>{let active=true;if(!cached||Date.now()>expires){expires=Date.now()+60000;const initial=pageSettings();cached=initial?Promise.resolve(initial):fetch(apiUrl("/api/store-settings"),{cache:"no-store",signal:AbortSignal.timeout(15000)}).then(async response=>{if(!response.ok)throw new Error();const value=await response.json() as Record<string,unknown>;return parseSettings(value);}).catch(()=>{cached=undefined;return {...defaultCommerceSettings(),loaded:false};});}cached.then(value=>{if(active)setSettings(value);});return()=>{active=false;};},[]);
  useEffect(()=>{const saved=(event:Event)=>{const parsed=commerceSettingsSchema.safeParse((event as CustomEvent).detail);if(parsed.success){cached=undefined;expires=0;setSettings(current=>({...current,...parsed.data,loaded:true}));}};window.addEventListener('vn-store-settings-saved',saved);return()=>window.removeEventListener('vn-store-settings-saved',saved);},[]);
  return settings;
}
