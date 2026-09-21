"use client";
import { useEffect, useState } from "react";
import { apiUrl } from "./api-client";
import { defaultCommerceSettings, type CommerceSettings } from "./commerce-config";
type PublicSettings=CommerceSettings & {emailEnabled?:boolean};
let cached:Promise<PublicSettings>|undefined,expires=0;
export function useStoreSettings(){
  const [settings,setSettings]=useState<PublicSettings>(defaultCommerceSettings);
  useEffect(()=>{let active=true;if(!cached||Date.now()>expires){expires=Date.now()+60000;cached=fetch(apiUrl("/api/store-settings"),{cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error();return await response.json() as CommerceSettings;}).catch(()=>{cached=undefined;return defaultCommerceSettings();});}cached.then(value=>{if(active)setSettings(value);});return()=>{active=false;};},[]);
  return settings;
}
