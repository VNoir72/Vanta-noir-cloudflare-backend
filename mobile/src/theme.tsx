import {fetchWithTimeout} from "./fetch-with-timeout";
import {accentInk} from './brand-accent';
import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Text as NativeText, TextProps, useColorScheme,AppState} from 'react-native';
import {Ionicons as NativeIcon} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type Appearance = 'system' | 'light' | 'dark';
const light = {page:'#ffffff', surface:'#ffffff', glass:'rgba(255,255,255,.94)', text:'#151517', muted:'#68686d', border:'#e4e4e2', input:'#fcfcfb', secondary:'#efefed', selected:'#e5f9eb', selectedText:'#151517', accent:'#00ff66', onAccent:'#101510', accentInk:'#08783b', notice:'#e5f9eb', danger:'#bf252f'};
const dark: typeof light = {page:'#101012', surface:'#1a1a1d', glass:'rgba(26,26,29,.94)', text:'#f5f5f5', muted:'#acacb1', border:'#333338', input:'#202024', secondary:'#25252a', selected:'#133d27', selectedText:'#e5f9eb', accent:'#00ff66', onAccent:'#101510', accentInk:'#00ff66', notice:'#153624', danger:'#ff939a'};
export type Palette = typeof light;
const Theme = createContext({colors:light, dark:false, appearance:'system' as Appearance, setAppearance:async (_:Appearance)=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}) {
 const system=useColorScheme();
 const [appearance,setMode]=useState<Appearance>('system');
 const changed=useRef(false);
 const [brand,setBrand]=useState<string|null>(null);
 useEffect(()=>{let live=true;const refresh=async()=>{try{const r=await fetchWithTimeout((process.env.EXPO_PUBLIC_API_URL||'https://api.vantanoir.store').replace(/\/$/,'')+'/api/store-settings',{},12000);if(!r.ok)return;const data=await r.json();const color=data.brandAccent?.storefront;if(live&&typeof color==='string'&&/^#[a-f0-9]{6}$/i.test(color)){setBrand(color);void AsyncStorage.setItem('vanta-brand-accent',color).catch(()=>{});}}catch{/* Retain the current theme while offline. */}};void AsyncStorage.getItem('vanta-brand-accent').then(color=>{if(live&&color&&/^#[a-f0-9]{6}$/i.test(color))setBrand(current=>current||color);}).catch(()=>{});void refresh();const sub=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});return()=>{live=false;sub.remove();};},[]);
 useEffect(()=>{let live=true;AsyncStorage.getItem('vanta-appearance').then(v=>{if(live&&!changed.current&&(v==='light'||v==='dark'||v==='system'))setMode(v);}).catch(()=>{});return()=>{live=false;};},[]);
 const isDark=(appearance==='system'?system:appearance)==='dark';
 const value=useMemo(()=>({colors:{...(isDark?dark:light),...(brand?{accent:brand,selected:brand+(isDark?'29':'18'),notice:brand+(isDark?'29':'18'),onAccent:accentInk(brand),accentInk:accentInk(brand)==='#ffffff'&&!isDark?brand:isDark&&accentInk(brand)==='#ffffff'?'#f5f5f5':!isDark?'#151517':brand}:{})},dark:isDark,appearance,setAppearance:async(next:Appearance)=>{await AsyncStorage.setItem('vanta-appearance',next);changed.current=true;setMode(next);}}),[appearance,isDark,brand]);
 return <Theme.Provider value={value}>{children}</Theme.Provider>;
}
export const useTheme=()=>useContext(Theme);
export function Text({style,...props}:TextProps){const {colors}=useTheme();return <NativeText {...props} style={[{color:colors.text},style]}/>;}
export function Icon(props:React.ComponentProps<typeof NativeIcon>){const {colors}=useTheme();return <NativeIcon color={colors.text} {...props}/>;}
