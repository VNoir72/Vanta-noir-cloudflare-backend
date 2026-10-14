import React, {useEffect, useState} from 'react';
import {Image, Pressable, View} from 'react-native';
import {Text, Icon, useTheme} from '../theme';
import {CartItem, Product} from '../types';
import {variantStock} from '../bag-selection';
import {imageUrl} from '../api';
import {displayMoney as money} from '../preferences';

export function TrustFooter({onOpen}:{onOpen:(topic:string)=>void}) {
  const {colors}=useTheme();
  return <View style={{flexDirection:'row',paddingVertical:6,borderTopWidth:1,borderColor:colors.border}}>{([
    ['shield-checkmark-outline','Safe payment','terms-of-service'],['lock-closed-outline','Secure privacy','privacy-policy'],['bag-check-outline','Purchase support','contact'],['cube-outline','Delivery tracking','shipping-returns'],
  ] as const).map(([icon,label,topic])=><Pressable key={label} accessibilityRole="button" onPress={()=>onOpen(topic)} style={{flex:1,alignItems:'center',gap:4,paddingHorizontal:3}}><Icon name={icon} size={25} color={colors.accent}/><Text style={{fontSize:11,textAlign:'center',color:colors.muted}}>{label}</Text></Pressable>)}</View>;
}
export function QuoteCountdown({expiresAt}:{expiresAt:number}) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  const seconds=Math.max(0,Math.ceil((expiresAt-now)/1000));
  return <Text style={{fontSize:12}}>Delivery quote refreshes in {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</Text>;
}
export function CompactBag({cart,products,selected,onSelect,onQuantity,onDelete,busy}:{cart:CartItem[];products:Product[];selected:string[];onSelect:(ids:string[])=>void;onQuantity:(id:string,n:number)=>void;onDelete:(ids?:string[])=>void;onSaved:()=>void;onCountry:()=>void;country:string;busy:boolean;onHelp:(topic:string)=>void}) {
 const {colors}=useTheme();
 const [editing,setEditing]=useState(false);
 const iconButton={padding:9,minWidth:44,minHeight:44,alignItems:'center' as const,justifyContent:'center' as const};
 return <View style={{padding:18,gap:12}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{gap:5}}><Text style={{fontSize:26,fontWeight:'700'}}>Your bag</Text><Text style={{fontSize:13,color:colors.muted}}>{cart.reduce((n,i)=>n+i.quantity,0)} items</Text></View><Pressable accessibilityRole="button" onPress={()=>setEditing(!editing)} style={iconButton}><Text style={{fontSize:12}}>{editing?'Done':'Edit'}</Text></Pressable></View>
   {editing&&<Pressable accessibilityRole="checkbox" accessibilityLabel="Select all bag items" accessibilityState={{checked:!!cart.length&&cart.every(i=>selected.includes(i.variantId))}} onPress={()=>onSelect(cart.every(i=>selected.includes(i.variantId))?[]:cart.map(i=>i.variantId))} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:10}}><Icon name={cart.every(i=>selected.includes(i.variantId))?'checkbox':'square-outline'} size={23}/><Text>Select all</Text></Pressable>}
   {cart.map(i=>{const stock=variantStock(i,products), unavailable=stock<=0;return <View key={i.variantId} style={{flexDirection:'row',gap:12,paddingVertical:12,borderBottomWidth:1,borderColor:colors.border,backgroundColor:colors.glass,alignItems:'center'}}>
     {editing&&<Pressable accessibilityRole="checkbox" accessibilityLabel={`Select ${i.name}, ${i.color}, ${i.size}`} accessibilityState={{checked:selected.includes(i.variantId)}} disabled={busy} onPress={()=>onSelect(selected.includes(i.variantId)?selected.filter(id=>id!==i.variantId):[...selected,i.variantId])} style={{minWidth:30,minHeight:44,justifyContent:'center'}}><Icon name={selected.includes(i.variantId)?'checkmark-circle':'ellipse-outline'} size={24}/></Pressable>}
     <Image source={{uri:imageUrl(i.imageUrl)}} resizeMode="contain" style={{width:80,height:88,borderRadius:8,backgroundColor:colors.input,opacity:unavailable?0.45:1}}/>
     <View style={{flex:1,gap:3}}><View style={{flexDirection:'row',alignItems:'center'}}><Text numberOfLines={1} style={{flex:1,fontSize:14,fontWeight:'600'}}>{i.name}</Text>{editing&&<Pressable accessibilityRole="button" accessibilityLabel={'Remove '+i.name} disabled={busy} onPress={()=>onDelete([i.variantId])} style={{width:36,height:36,alignItems:'center',justifyContent:'center'}}><Icon name="trash-outline" size={17}/></Pressable>}</View><Text style={{fontSize:12,color:colors.muted}}>{i.color} / {i.size}</Text>
       <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4}}><Text style={{fontSize:15,fontWeight:'700'}}>{money(i.priceKobo).replace(/\.00$/,'')}</Text><View style={{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:colors.border,borderRadius:8}}><Pressable accessibilityLabel={`Decrease ${i.name} quantity`} disabled={busy||i.quantity<=1} onPress={()=>onQuantity(i.variantId,i.quantity-1)} style={{...iconButton,padding:6,minWidth:34}}><Text>−</Text></Pressable><Text>{i.quantity}</Text><Pressable accessibilityLabel={`Increase ${i.name} quantity`} disabled={busy||i.quantity>=Math.min(5,stock)} onPress={()=>onQuantity(i.variantId,i.quantity+1)} style={{...iconButton,padding:6,minWidth:34}}><Text>+</Text></Pressable></View></View>
     {(unavailable||stock<i.quantity||stock<=5)&&<Text style={{fontSize:10,color:colors.danger}}>{unavailable?'Unavailable':`Only ${stock} available`}</Text>}</View>
   </View>;})}
   {!cart.length&&<Text style={{paddingVertical:24,textAlign:'center'}}>Your bag is empty.</Text>}
   {!!cart.length&&<View style={{marginTop:8,paddingVertical:14,borderTopWidth:1,borderColor:colors.border,gap:14}}><Text style={{fontSize:14,fontWeight:'600'}}>Order summary</Text><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:13,color:colors.muted}}>Subtotal ({cart.filter(i=>selected.includes(i.variantId)).reduce((n,i)=>n+i.quantity,0)} items)</Text><Text style={{fontSize:14}}>{money(cart.filter(i=>selected.includes(i.variantId)).reduce((n,i)=>n+i.priceKobo*i.quantity,0))}</Text></View><View style={{flexDirection:'row',justifyContent:'space-between',paddingTop:12,borderTopWidth:1,borderColor:colors.border}}><Text style={{fontWeight:'700'}}>Total</Text><Text style={{fontWeight:'700'}}>{money(cart.filter(i=>selected.includes(i.variantId)).reduce((n,i)=>n+i.priceKobo*i.quantity,0))}</Text></View></View>}
 </View>;
}
