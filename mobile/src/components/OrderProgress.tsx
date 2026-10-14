import React from 'react';
import {View} from 'react-native';
import {Icon,Text,useTheme} from '../theme';
import {Order} from '../types';
import {fulfilmentStep} from '../order-policy';

export function OrderProgress({order}:{order:Order}){
 const {colors}=useTheme();
 const current=fulfilmentStep(order);
 if(current===null)return null;
 const labels=['Processing','Preparing to ship','Shipped','Delivered'];
 const descriptions=['Your payment has been confirmed and your order is being prepared.',"We’re getting your items ready for dispatch.","You’ll receive an update when your parcel is on the way.","We’ll let you know when your order has been delivered."];
 return <View accessibilityLabel={`Order progress: ${labels[current]}`} style={{gap:0,paddingVertical:8}}>
  {labels.map((label,index)=><View key={label} style={{flexDirection:'row',alignItems:'stretch',gap:18,minHeight:106}}>
   <View style={{width:28,alignItems:'center'}}><View style={{width:26,height:26,borderRadius:13,borderWidth:index===current?1:0,borderColor:colors.accentInk,padding:4,backgroundColor:index<current?colors.text:index>current?colors.border:'transparent',alignItems:'center',justifyContent:'center'}}>{index<current?<Icon name="checkmark" size={16} color={colors.page}/>:index===current?<View style={{width:16,height:16,borderRadius:8,backgroundColor:colors.accent}}/>:null}</View>{index<3&&<View style={{flex:1,width:1,backgroundColor:colors.border,marginVertical:3}}/>}</View>
   <View style={{flex:1,gap:5,paddingBottom:22}}><Text style={{fontSize:16,fontWeight:'600',color:index<=current?colors.text:colors.muted}}>{label}</Text><Text style={{fontSize:12,color:index===current?colors.accentInk:colors.muted}}>{index<current?'Completed':index===current?'Current':'Up next'}</Text><Text style={{fontSize:13,lineHeight:19,color:colors.muted}}>{descriptions[index]}</Text></View>
  </View>)}
 </View>;
}
