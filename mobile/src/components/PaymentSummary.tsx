import React from 'react';
import {ActivityIndicator, Pressable, View} from 'react-native';
import {Icon, Text, useTheme} from '../theme';
import {Payment} from '../types';
import {money} from '../api';
import {PaymentClock} from './PaymentClock';

export function PaymentSummary({payment,busy,onCopy,onChange,onLeave,onCheck,onCard}: {
  payment:Payment;busy:boolean;onCopy:()=>void;onChange:()=>void;onLeave:()=>void;onCheck:()=>void;onCard?:()=>void;
}) {
  const {colors}=useTheme();
  const transfer=payment.transfer;
  const action=(label:string,fn:()=>void,outline=false)=><Pressable accessibilityRole="button" disabled={busy} onPress={fn} style={({pressed})=>({minHeight:44,padding:12,alignItems:'center',justifyContent:'center',borderRadius:24,borderWidth:outline?1:0,borderColor:colors.muted,opacity:busy?.45:pressed?.6:1})}><Text style={{fontSize:13,fontWeight:outline?'600':'400'}}>{label}</Text></Pressable>;
  return <View style={{gap:16}}>
    <View style={{padding:16,gap:14,borderWidth:1,borderColor:colors.border,borderRadius:16,backgroundColor:colors.glass}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{width:44,height:44,borderRadius:22,backgroundColor:colors.selected,alignItems:'center',justifyContent:'center'}}><Icon name={transfer?'business-outline':'card-outline'} size={24}/></View><View style={{flex:1,gap:4}}><Text style={{fontSize:17,fontWeight:'700'}}>{transfer?'Bank transfer':'Card payment'}</Text><Text style={{fontSize:12,color:colors.muted}}>{transfer?'Pay the total amount to the account below.':'Complete your secure card payment.'}</Text></View></View>
      <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:10}}><Text style={{fontSize:27,fontWeight:'700',letterSpacing:-.6}}>{money(transfer?.amountKobo||payment.amountKobo||0).replace(/\.00$/,'')}</Text>{transfer&&<PaymentClock expiresAt={transfer.expiresAt}/>}</View>
      {transfer&&<View style={{backgroundColor:colors.secondary,padding:14,borderRadius:12,gap:12}}>
        <Text style={{fontSize:12,fontWeight:'600'}}>Transfer details</Text>
        <View style={{flexDirection:'row',gap:12}}><Text style={{width:100,fontSize:12,color:colors.muted}}>Bank name</Text><Text style={{flex:1,fontSize:13,fontWeight:'600'}}>{transfer.bankName}</Text></View>
        <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{width:100,fontSize:12,color:colors.muted}}>Account number</Text><Text selectable style={{flex:1,fontSize:15,fontWeight:'600',letterSpacing:1}}>{transfer.accountNumber}</Text><Pressable accessibilityRole="button" accessibilityLabel="Copy account number" onPress={onCopy} hitSlop={10} style={{minHeight:44,minWidth:30,alignItems:'center',justifyContent:'center'}}><Icon name="copy-outline" size={20}/></Pressable></View>
        <View style={{flexDirection:'row',gap:12}}><Text style={{width:100,fontSize:12,color:colors.muted}}>Account name</Text><Text style={{flex:1,fontSize:12,fontWeight:'600'}}>{transfer.accountName}</Text></View>
      </View>}
      {!transfer&&onCard&&<Pressable accessibilityRole="button" disabled={busy} onPress={onCard} style={{backgroundColor:colors.accent,padding:15,borderRadius:12,alignItems:'center'}}><Text style={{fontWeight:'600',color:'#0a0a0a'}}>Continue to secure card payment</Text></Pressable>}
      <View accessibilityLiveRegion="polite" style={{borderWidth:1,borderColor:colors.border,borderRadius:14,padding:22,alignItems:'center',gap:12}}>
        {busy?<ActivityIndicator color={colors.accentInk}/>:<View style={{flexDirection:'row',gap:14,paddingVertical:10}}>{[0,1,2].map(i=><View key={i} style={{width:9,height:9,borderRadius:5,backgroundColor:i===0?colors.accentInk:colors.border}}/>)}</View>}
        <Text style={{fontSize:16,fontWeight:'700'}}>Waiting for payment…</Text><Text style={{fontSize:12,lineHeight:18,color:colors.muted,textAlign:'center'}}>Automatically checking for your payment.</Text>
      </View>
      {action('⇄  Change method',onChange,true)}
      {action('Leave payment',onLeave)}
    </View>
    <View style={{flexDirection:'row',gap:10,paddingHorizontal:8}}><Icon name="information-circle-outline" size={20}/><View style={{flex:1,gap:4}}><Text style={{fontSize:12,fontWeight:'600'}}>Already transferred?</Text><Text style={{fontSize:12,lineHeight:18,color:colors.muted}}>Keep this payment open. We’ll confirm it automatically. Do not transfer after the account expires.</Text></View></View>
    {action('Check payment status',onCheck)}
  </View>;
}
