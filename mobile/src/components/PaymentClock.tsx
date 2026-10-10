import React,{useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import {Text,useTheme} from '../theme';
export function remainingPaymentSeconds(expiresAt:string,now=Date.now()){const expiry=Date.parse(expiresAt);return Number.isFinite(expiry)?Math.max(0,Math.ceil((expiry-now)/1000)):null;}
export function PaymentClock({expiresAt}:{expiresAt:string}){
 const {colors}=useTheme(),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const update=()=>setNow(Date.now());update();const timer=setInterval(update,1000);const sub=AppState.addEventListener('change',state=>{if(state==='active')update();});return()=>{clearInterval(timer);sub.remove();};},[expiresAt]);
 const seconds=remainingPaymentSeconds(expiresAt,now);
 return <View style={{alignItems:'center',padding:18,gap:6,borderWidth:1,borderColor:colors.border,borderRadius:20}}><Text style={{color:colors.muted,fontSize:12,letterSpacing:2}}>{seconds===0?'TRANSFER WINDOW CLOSED':'COMPLETE YOUR TRANSFER'}</Text><Text accessibilityLabel={seconds===null?'Check the account expiry time':seconds===0?'Transfer account expired':`${Math.floor(seconds/60)} minutes ${seconds%60} seconds remaining`} style={{fontSize:38,fontVariant:['tabular-nums'],fontWeight:'600'}}>{seconds===null?'—':`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}</Text><Text style={{color:colors.muted,textAlign:'center'}}>{seconds===0?'Do not transfer to this account. If you already paid, check payment status.':'Time remaining before this transfer account expires.'}</Text></View>;
}
