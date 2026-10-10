"use client";
import { useEffect, useState } from "react";
import { apiUrl } from "./api-client";
import { commerceSettingsSchema, defaultCommerceSettings, type CommerceSettings } from "./commerce-config";
type PublicSettings=CommerceSettings & {emailEnabled?:boolean;internationalCourierEnabled?:boolean};
let cached:Promise<PublicSettings>|undefined,expires=0;
export function useStoreSettings(){
  const [settings,setSettings]=useState<PublicSettings>(defaultCommerceSettings);
  useEffect(()=>{let active=true;if(!cached||Date.now()>expires){expires=Date.now()+60000;cached=fetch(apiUrl("/api/store-settings"),{cache:"no-store",signal:AbortSignal.timeout(15000)}).then(async response=>{if(!response.ok)throw new Error();const value=await response.json() as Record<string,unknown>;return {...commerceSettingsSchema.parse(value),emailEnabled:value.emailEnabled===true,internationalCourierEnabled:value.internationalCourierEnabled===true};}).catch(()=>{cached=undefined;return defaultCommerceSettings();});}cached.then(value=>{if(active)setSettings(value);});return()=>{active=false;};},[]);
  return settings;
}
