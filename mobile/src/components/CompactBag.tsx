import React, {useEffect, useState} from 'react';
import {Image, Pressable, View} from 'react-native';
import {Text, Icon, useTheme} from '../theme';
import {CartItem, Product} from '../types';
import {variantStock} from '../bag-selection';
import {imageUrl} from '../api';
import {displayMoney as money} from '../preferences';

export function TrustFooter({onOpen}:{onOpen:(topic:string)=>void}) {
  const {colors}=useTheme();
  return <View style={{flexDirection:'row',paddingVertical:24,borderTopWidth:1,borderColor:colors.border}}>{([
    ['shield-checkmark-outline','Safe payment','terms-of-service'],['lock-closed-outline','Secure privacy','privacy-policy'],['bag-check-outline','Purchase support','contact'],['cube-outline','Delivery tracking','shipping-returns'],
  ] as const).map(([icon,label,topic])=><Pressable key={label} accessibilityRole="button" onPress={()=>onOpen(topic)} style={{flex:1,alignItems:'center',gap:8,paddingHorizontal:3}}><Icon name={icon} size={25} color={colors.accent}/><Text style={{fontSize:11,textAlign:'center',color:colors.muted}}>{label}</Text></Pressable>)}</View>;
}
export function QuoteCountdown({expiresAt}:{expiresAt:number}) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  const seconds=Math.max(0,Math.ceil((expiresAt-now)/1000));
  return <Text style={{fontSize:12}}>Delivery quote refreshes in {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</Text>;
}
export function CompactBag({cart,products,selected,onSelect,onQuantity,onDelete,onSaved,onCountry,country,busy,onHelp}:{cart:CartItem[];products:Product[];selected:string[];onSelect:(ids:string[])=>void;onQuantity:(id:string,n:number)=>void;onDelete:()=>void;onSaved:()=>void;onCountry:()=>void;country:string;busy:boolean;onHelp:(topic:string)=>void}) {
 const {colors}=useTheme();
 const iconButton={padding:9,minWidth:44,minHeight:44,alignItems:'center' as const,justifyContent:'center' as const};
 return <View style={{backgroundColor:colors.surface,paddingHorizontal:12}}>
   <View style={{flexDirection:'row',alignItems:'center',paddingVertical:8,gap:3}}><Text style={{fontSize:22,fontWeight:'700',flex:1}}>Bag ({cart.reduce((n,i)=>n+i.quantity,0)})</Text><Pressable accessibilityLabel="Delivery location" onPress={onCountry} style={{...iconButton,flexDirection:'row',maxWidth:135,gap:3}}><Icon name="location-outline" size={21}/><Text numberOfLines={1} style={{fontSize:12,flexShrink:1}}>{country}</Text></Pressable><Pressable accessibilityLabel="Wishlist" onPress={onSaved} style={iconButton}><Icon name="heart-outline" size={24}/></Pressable><Pressable accessibilityLabel="Delete selected items" disabled={busy} onPress={onDelete} style={iconButton}><Icon name="trash-outline" size={24}/></Pressable></View>
   <Pressable onPress={()=>onHelp('privacy-policy')} style={{flexDirection:'row',gap:7,alignItems:'center',paddingVertical:12}}><Icon name="shield-checkmark-outline" size={20}/><Text style={{fontSize:12}}>Safe payment · Secure personal details</Text></Pressable>
   {cart.map(i=>{const stock=variantStock(i,products), unavailable=stock<=0;return <View key={i.variantId} style={{flexDirection:'row',gap:9,paddingVertical:16,borderBottomWidth:1,borderColor:colors.border,alignItems:'center'}}>
     <Pressable accessibilityRole="checkbox" accessibilityLabel={`Select ${i.name}, ${i.color}, ${i.size}`} accessibilityState={{checked:selected.includes(i.variantId)}} disabled={busy} onPress={()=>onSelect(selected.includes(i.variantId)?selected.filter(id=>id!==i.variantId):[...selected,i.variantId])} style={{minWidth:30,minHeight:44,justifyContent:'center'}}><Icon name={selected.includes(i.variantId)?'checkmark-circle':'ellipse-outline'} size={24}/></Pressable>
     <Image source={{uri:imageUrl(i.imageUrl)}} resizeMode="contain" style={{width:78,height:94,borderRadius:8,backgroundColor:colors.input,opacity:unavailable?0.45:1}}/>
     <View style={{flex:1,gap:6}}><Text numberOfLines={2} style={{fontSize:14,fontWeight:'500'}}>{i.name}</Text><Text style={{fontSize:12,color:colors.muted}}>{i.color} / {i.size}</Text><Text style={{fontSize:16,fontWeight:'700'}}>{money(i.priceKobo)}</Text>
       <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}><Text style={{fontSize:11,color:unavailable||stock<i.quantity?colors.danger:colors.muted}}>{unavailable?'Unavailable':stock<i.quantity?`Only ${stock} available — reduce quantity`:stock<=5?`Only ${stock} left`:''}</Text><View style={{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:colors.border,borderRadius:22}}><Pressable accessibilityLabel={`Decrease ${i.name} quantity`} disabled={busy||i.quantity<=1} onPress={()=>onQuantity(i.variantId,i.quantity-1)} style={iconButton}><Text>−</Text></Pressable><Text>{i.quantity}</Text><Pressable accessibilityLabel={`Increase ${i.name} quantity`} disabled={busy||i.quantity>=Math.min(5,stock)} onPress={()=>onQuantity(i.variantId,i.quantity+1)} style={iconButton}><Text>+</Text></Pressable></View></View>
     </View>
   </View>;})}
   {!cart.length&&<Text style={{paddingVertical:40,textAlign:'center'}}>Your bag is empty.</Text>}
   <TrustFooter onOpen={onHelp}/>
 </View>;
}
