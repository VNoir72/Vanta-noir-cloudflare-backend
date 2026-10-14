import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {router} from 'expo-router';
import {Icon, Text, useTheme} from '../theme';

export type AppTab = 'Shop' | 'Saved' | 'Bag' | 'Orders' | 'Account';
const tabs = [
  ['Shop', 'home-outline'], ['Saved', 'heart-outline'], ['Bag', 'bag-outline'],
  ['Orders', 'receipt-outline'], ['Account', 'person-outline'],
] as const;

/** Shared by every app page, including the full-screen checkout and account panels. */
export function AppTabs({selected='Account', onNavigate}: {selected?:AppTab; onNavigate?:(tab:AppTab)=>void}) {
  const {colors}=useTheme();
  return <View accessibilityRole="tablist" style={[s.tabs,{backgroundColor:colors.glass,borderColor:colors.border}]}>
    {tabs.map(([tab,icon])=><Pressable key={tab} accessibilityRole="tab" accessibilityLabel={tab==='Account'?'You':tab} accessibilityState={{selected:selected===tab}}
      onPress={()=>{onNavigate?.(tab);if(!onNavigate)router.replace({pathname:'/[tab]',params:{tab:tab.toLowerCase()}});}}
      style={({pressed})=>[s.tab,{opacity:pressed?.6:1}]}>
      <Icon name={icon} size={22} color={selected===tab?colors.accentInk:colors.text}/>
      <Text style={{fontSize:11,color:selected===tab?colors.accentInk:colors.text}}>{tab==='Account'?'You':tab}</Text>
      {selected===tab&&<View style={[s.indicator,{backgroundColor:colors.accent}]}/>}
    </Pressable>)}
  </View>;
}

export function BrandHeader({onBack,title,action}: {onBack?:()=>void;title?:string;action?:React.ReactNode}) {
  const {colors}=useTheme();
  return <View style={[s.header,{borderColor:colors.border}]}>
    {onBack?<Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={s.hit}><Icon name="arrow-back" size={22}/></Pressable>:<View style={s.hit}/>}
    <Text numberOfLines={1} style={title?s.headerTitle:s.brand}>{title||'VANTA NOIR'}</Text>
    {action||<View style={s.hit}/>}
  </View>;
}

export function PageTitle({title,subtitle}: {title:string;subtitle?:string}) {
  const {colors}=useTheme();
  return <View style={{gap:6,marginBottom:8}}><Text accessibilityRole="header" style={{fontSize:26,fontWeight:'700',letterSpacing:-.7}}>{title}</Text>{subtitle&&<Text style={{fontSize:14,lineHeight:20,color:colors.muted}}>{subtitle}</Text>}</View>;
}

export function Segments<T extends string>({values,value,onChange}: {values:readonly T[];value:T;onChange:(value:T)=>void}) {
  const {colors}=useTheme();
  return <View accessibilityRole="tablist" style={{flexDirection:'row',padding:4,borderRadius:14,backgroundColor:colors.secondary,gap:3}}>
    {values.map(item=><Pressable key={item} accessibilityRole="tab" accessibilityState={{selected:item===value}} onPress={()=>onChange(item)} style={{flex:1,minHeight:40,alignItems:'center',justifyContent:'center',borderRadius:11,backgroundColor:item===value?colors.accent:'transparent'}}><Text style={{fontSize:13,fontWeight:item===value?'600':'400',color:item===value?'#0a0a0a':colors.text}}>{item.charAt(0).toUpperCase()+item.slice(1)}</Text></Pressable>)}
  </View>;
}
const s=StyleSheet.create({tabs:{flexDirection:'row',borderTopWidth:1,paddingHorizontal:10,paddingTop:3},tab:{flex:1,alignItems:'center',justifyContent:'center',minHeight:64,gap:6,paddingBottom:5},indicator:{position:'absolute',bottom:0,width:32,height:2,borderRadius:1},header:{minHeight:58,paddingHorizontal:8,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth},hit:{width:44,height:44,alignItems:'center',justifyContent:'center'},brand:{flex:1,textAlign:'center',fontSize:14,letterSpacing:3,fontWeight:'600'},headerTitle:{flex:1,textAlign:'center',fontSize:17,fontWeight:'600'}});
