import {accentInk} from '../../lib/brand-accent';
import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Text as NativeText, TextProps, useColorScheme,AppState} from 'react-native';
import {Ionicons as NativeIcon} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type Appearance = 'system' | 'light' | 'dark';
const light = {page:'#f5f6f3', surface:'#ffffff', glass:'rgba(255,255,255,.92)', text:'#172019', muted:'#586456', border:'#d3ddcc', input:'#fafcf9', secondary:'#e6ece2', selected:'#d8ffe7', selectedText:'#182214', accent:'#00ff66',accentInk:'#101510', notice:'#dcebc9', danger:'#9d2929'};
const dark: typeof light = {page:'#0a0a0a', surface:'#171a17', glass:'rgba(25,29,25,.94)', text:'#f2f5ef', muted:'#b1bdad', border:'#394236', input:'#222720', secondary:'#2c3528', selected:'#153b27', selectedText:'#d8ffe7', accent:'#00ff66',accentInk:'#101510', notice:'#293b21', danger:'#ffaaa4'};
export type Palette = typeof light;
const Theme = createContext({colors:light, dark:false, appearance:'system' as Appearance, setAppearance:async (_:Appearance)=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}) {
 const system=useColorScheme();
 const [appearance,setMode]=useState<Appearance>('system');
 const changed=useRef(false);
 const [brand,setBrand]=useState<string|null>(null);
 useEffect(()=>{let live=true;const refresh=async()=>{try{const r=await fetch((process.env.EXPO_PUBLIC_API_URL||'https://api.vantanoir.store').replace(/\/$/,'')+'/api/store-settings',{signal:AbortSignal.timeout(12000)});if(!r.ok)return;const data=await r.json();const color=data.brandAccent?.storefront;if(live&&typeof color==='string'&&/^#[a-f0-9]{6}$/i.test(color))setBrand(color);}catch{/* Retain the current theme while offline. */}};void refresh();const sub=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});return()=>{live=false;sub.remove();};},[]);
 useEffect(()=>{let live=true;AsyncStorage.getItem('vanta-appearance').then(v=>{if(live&&!changed.current&&(v==='light'||v==='dark'||v==='system'))setMode(v);}).catch(()=>{});return()=>{live=false;};},[]);
 const isDark=(appearance==='system'?system:appearance)==='dark';
 const value=useMemo(()=>({colors:{...(isDark?dark:light),...(brand?{accent:brand,accentInk:accentInk(brand)}:{})},dark:isDark,appearance,setAppearance:async(next:Appearance)=>{await AsyncStorage.setItem('vanta-appearance',next);changed.current=true;setMode(next);}}),[appearance,isDark,brand]);
 return <Theme.Provider value={value}>{children}</Theme.Provider>;
}
export const useTheme=()=>useContext(Theme);
export function Text({style,...props}:TextProps){const {colors}=useTheme();return <NativeText {...props} style={[{color:colors.text},style]}/>;}
export function Icon(props:React.ComponentProps<typeof NativeIcon>){const {colors}=useTheme();return <NativeIcon color={colors.text} {...props}/>;}
