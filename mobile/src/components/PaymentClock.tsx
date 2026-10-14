import React,{useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import {Icon,Text,useTheme} from '../theme';
export function remainingPaymentSeconds(expiresAt:string,now=Date.now()){const expiry=Date.parse(expiresAt);return Number.isFinite(expiry)?Math.max(0,Math.ceil((expiry-now)/1000)):null;}
export function PaymentClock({expiresAt}:{expiresAt:string}){
 const {colors}=useTheme(),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const update=()=>setNow(Date.now());update();const timer=setInterval(update,1000);const sub=AppState.addEventListener('change',state=>{if(state==='active')update();});return()=>{clearInterval(timer);sub.remove();};},[expiresAt]);
 const seconds=remainingPaymentSeconds(expiresAt,now);
 return <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:7,gap:5,borderRadius:9,backgroundColor:colors.selected}}><Icon name="time-outline" size={14} color={colors.accentInk}/><Text accessibilityLabel={seconds===null?'Check the account expiry time':seconds===0?'Transfer account expired':`${Math.floor(seconds/60)} minutes ${seconds%60} seconds remaining`} style={{fontSize:11,fontVariant:['tabular-nums'],fontWeight:'600',color:colors.accentInk}}>{seconds===null?'Expiry unavailable':seconds===0?'Transfer expired':`Expires in ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}</Text></View>;
}
