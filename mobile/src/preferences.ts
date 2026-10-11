import {useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type ImageQuality='smart'|'high'|'normal';
type Preferences={imageQuality:ImageQuality;acceleration:boolean;currency:string;rates:Record<string,number>;rateAt:number};
let state:Preferences={imageQuality:'smart',acceleration:false,currency:'NGN',rates:{NGN:1},rateAt:0};
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());
export function usePreferences(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>state,()=>state);}
export async function savePreferences(p:Partial<Preferences>){const next={...state,...p};await AsyncStorage.setItem('vanta-preferences-v1',JSON.stringify(next));state=next;emit();}
export async function loadPreferences(){try{const v=JSON.parse(await AsyncStorage.getItem('vanta-preferences-v1')||'null');if(v){state={...state,imageQuality:['smart','high','normal'].includes(v.imageQuality)?v.imageQuality:'smart',acceleration:v.acceleration===true,currency:/^[A-Z]{3}$/.test(v.currency)?v.currency:'NGN'};emit();}}catch{}await refreshCurrencies();}
export async function refreshCurrencies(){try{const response=await fetch('https://open.er-api.com/v6/latest/NGN',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();const d=await response.json();const at=Number(d.time_last_update_unix)*1000;if(d.result!=='success'||d.base_code!=='NGN'||!Number.isFinite(at)||Date.now()-at>48*3600000||at>Date.now()+60000)throw Error();const rates=Object.fromEntries(Object.entries(d.rates||{}).filter(([key,value])=>/^[A-Z]{3}$/.test(key)&&typeof value==='number'&&Number.isFinite(value)&&value>0)) as Record<string,number>;state={...state,rates:{...rates,NGN:1},rateAt:at};emit();}catch{/* Keep NGN available when conversion cannot be verified. */}}
export function displayMoney(kobo:number){const usable=state.currency==='NGN'||Date.now()-state.rateAt<48*3600000;const rate=usable?state.rates[state.currency]:undefined;const currency=rate?state.currency:'NGN';return (currency==='NGN'?'':'≈ ')+new Intl.NumberFormat('en',{style:'currency',currency}).format(kobo/100*(rate||1));}
export const preferenceSnapshot=()=>state;
