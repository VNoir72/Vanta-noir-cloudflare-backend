import React from 'react';
import {View} from 'react-native';
import {Icon,Text,useTheme} from '../theme';
import {Order} from '../types';
import {fulfilmentStep} from '../order-policy';
import {deliveryLabels,deliveryMessage} from '../delivery-progress';

export function OrderProgress({order}:{order:Order}){
 const {colors}=useTheme();
 const current=fulfilmentStep(order);
 if(current===null)return null;
 const labels=deliveryLabels;
 const descriptions=['Your payment has been confirmed and your order is being prepared.',"We’re getting your items ready for dispatch.","Your parcel has been shipped.","Your parcel has been delivered."];
 return <View accessibilityLabel={`Order progress: ${labels[current]}`} style={{gap:0,paddingVertical:8}}>
  {labels.map((label,index)=><View key={label} style={{flexDirection:'row',alignItems:'stretch',gap:18,minHeight:94}}>
   <View style={{width:28,alignItems:'center'}}><View style={{width:26,height:26,borderRadius:13,borderWidth:index===current?1:0,borderColor:colors.accentInk,padding:4,backgroundColor:index<current?colors.text:index>current?colors.border:'transparent',alignItems:'center',justifyContent:'center'}}>{index<current?<Icon name="checkmark" size={16} color={colors.page}/>:index===current?<View style={{width:16,height:16,borderRadius:8,backgroundColor:colors.accent}}/>:null}</View>{index<3&&<View style={{flex:1,width:1,backgroundColor:colors.border,marginVertical:3}}/>}</View>
   <View style={{flex:1,gap:3,paddingBottom:14}}><Text style={{fontSize:14,fontWeight:'600',color:index<=current?colors.text:colors.muted}}>{label}</Text><Text style={{fontSize:12,color:index===current?colors.accentInk:colors.muted}}>{index<current?'Completed':index===current?'Current':'Up next'}</Text><Text style={{fontSize:13,lineHeight:19,color:colors.muted}}>{index===current?deliveryMessage(order):descriptions[index]}</Text></View>
  </View>)}
  {order.deliveryProgress?.carrier&&<Text style={{fontSize:12,color:colors.muted}}>Delivery partner: {order.deliveryProgress.carrier}</Text>}
  {order.deliveryProgress?.events?.slice(-6).reverse().map((event,index)=><Text key={index} style={{fontSize:12,lineHeight:18,color:colors.muted}}>{event.message}{event.location?' · '+event.location:''}{event.at?' · '+new Date(event.at).toLocaleString():''}</Text>)}
 </View>;
}
