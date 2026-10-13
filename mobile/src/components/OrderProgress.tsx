import React from 'react';
import {View} from 'react-native';
import {Icon,Text,useTheme} from '../theme';
import {Order} from '../types';
import {fulfilmentStep} from '../order-policy';

export function OrderProgress({order}:{order:Order}){
 const {colors}=useTheme();
 const current=fulfilmentStep(order);
 if(current===null)return null;
 return <View accessibilityLabel={`Order progress: ${['Processing','Preparing to ship','Shipped','Delivered'][current]}`} style={{gap:0,padding:18,borderRadius:16,backgroundColor:colors.page}}>
  <Text style={{fontSize:18,fontWeight:'700',marginBottom:20}}>Track order</Text>
  {['Processing','Preparing to ship','Shipped','Delivered'].map((label,index)=><View key={label} style={{flexDirection:'row',alignItems:'flex-start',gap:14,minHeight:82}}><View style={{width:24,height:24,borderRadius:12,backgroundColor:index<=current?colors.accent:colors.secondary,alignItems:'center',justifyContent:'center'}}>{index<current?<Icon name="checkmark" size={16} color="#172019"/>:<View style={{width:6,height:6,borderRadius:3,backgroundColor:index===current?'#172019':colors.muted}}/>}</View><View style={{flex:1,gap:6}}><Text style={{fontSize:15,fontWeight:index===current?'700':'400',color:index<=current?colors.text:colors.muted}}>{label}</Text><Text style={{fontSize:12,color:colors.muted,lineHeight:18}}>{index>current?'Awaiting this stage':index===0?'Payment received. Your order is being processed.':index===1?'Your items are being prepared for dispatch.':index===2?'Your parcel has been handed over for delivery.':'Your order has been marked delivered.'}</Text></View>{index===current&&<Text style={{fontSize:10,color:colors.muted,marginLeft:'auto'}}>CURRENT</Text>}</View>)}
 </View>;
}
