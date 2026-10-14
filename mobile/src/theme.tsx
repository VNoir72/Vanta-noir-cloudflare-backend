import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Text as NativeText, TextProps, useColorScheme} from 'react-native';
import {Ionicons as NativeIcon} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type Appearance = 'system' | 'light' | 'dark';
const light = {page:'#ffffff', surface:'#ffffff', glass:'rgba(255,255,255,.94)', text:'#151517', muted:'#68686d', border:'#e4e4e2', input:'#fcfcfb', secondary:'#efefed', selected:'#e5f9eb', selectedText:'#151517', accent:'#00ff66', accentInk:'#08783b', notice:'#e5f9eb', danger:'#bf252f'};
const dark: typeof light = {page:'#101012', surface:'#1a1a1d', glass:'rgba(26,26,29,.94)', text:'#f5f5f5', muted:'#acacb1', border:'#333338', input:'#202024', secondary:'#25252a', selected:'#133d27', selectedText:'#e5f9eb', accent:'#00ff66', accentInk:'#00ff66', notice:'#153624', danger:'#ff939a'};
export type Palette = typeof light;
const Theme = createContext({colors:light, dark:false, appearance:'system' as Appearance, setAppearance:async (_:Appearance)=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}) {
 const system=useColorScheme();
 const [appearance,setMode]=useState<Appearance>('system');
 const changed=useRef(false);
 useEffect(()=>{let live=true;AsyncStorage.getItem('vanta-appearance').then(v=>{if(live&&!changed.current&&(v==='light'||v==='dark'||v==='system'))setMode(v);}).catch(()=>{});return()=>{live=false;};},[]);
 const isDark=(appearance==='system'?system:appearance)==='dark';
 const value=useMemo(()=>({colors:isDark?dark:light,dark:isDark,appearance,setAppearance:async(next:Appearance)=>{await AsyncStorage.setItem('vanta-appearance',next);changed.current=true;setMode(next);}}),[appearance,isDark]);
 return <Theme.Provider value={value}>{children}</Theme.Provider>;
}
export const useTheme=()=>useContext(Theme);
export function Text({style,...props}:TextProps){const {colors}=useTheme();return <NativeText {...props} style={[{color:colors.text},style]}/>;}
export function Icon(props:React.ComponentProps<typeof NativeIcon>){const {colors}=useTheme();return <NativeIcon color={colors.text} {...props}/>;}
