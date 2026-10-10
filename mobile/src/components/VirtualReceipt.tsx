import React,{useEffect,useState} from 'react';
import {Animated,Easing,Platform,Pressable,StyleSheet,View} from 'react-native';
import {Text,useTheme} from '../theme';
import {Order} from '../types';
import {money} from '../api';
import {useReducedMotion} from './Motion';

/** Paper feeds from a fixed printer slot, matching the supplied storefront video. */
export function VirtualReceipt({order}:{order:Order}) {
 const {colors}=useTheme(), reduce=useReducedMotion();
 const [height,setHeight]=useState(0),[replay,setReplay]=useState(0);
 const [feed]=useState(()=>new Animated.Value(0));
 const paid=order.paymentStatus==='paid';
 useEffect(()=>{
  if(!height)return;
  feed.stopAnimation();feed.setValue(reduce?1:0);
  if(reduce)return;
  const motion=Animated.timing(feed,{toValue:1,duration:1700,delay:180,easing:Easing.out(Easing.quad),useNativeDriver:true});
  motion.start();return()=>motion.stop();
 },[feed,height,reduce,order.reference,replay]);
 const row=(label:string,value:number,strong=false)=><View key={label} style={s.row}><Text style={[s.ink,strong&&s.bold,{flex:1}]}>{label}</Text><Text style={[s.ink,strong&&s.bold]}>{money(value)}</Text></View>;
 return <View style={{gap:14,width:'100%',maxWidth:430,alignSelf:'center'}}>
  <Text style={{fontSize:28,fontWeight:'700',textAlign:'center'}}>Your receipt.</Text>
  <Text style={{textAlign:'center',color:colors.muted}}>A little proof of what’s next.</Text>
  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.printer}>
   <View style={s.light}/><Text style={s.printerBrand}>VANTA NOIR</Text><View style={s.slot}/>
  </View>
  <View testID="receipt-feed" style={s.feed}>
   <Animated.View testID="receipt-paper" onLayout={e=>setHeight(e.nativeEvent.layout.height)} style={{opacity:height?1:0,transform:[{translateY:feed.interpolate({inputRange:[0,1],outputRange:[-height,0]})}]}}>
    <View style={s.paper}>
     <Text style={[s.ink,{textAlign:'center',letterSpacing:3,fontSize:17,fontWeight:'700'}]}>VANTA NOIR</Text>
     <Text style={[s.small,{textAlign:'center'}]}>Presence. Power. Precision.</Text>
     <View style={s.rule}/>
     <Text style={s.small}>{paid?'PAYMENT RECEIPT':'ORDER · PAYMENT UNCONFIRMED'}</Text>
     <Text selectable style={[s.small,{fontSize:10}]}>{order.reference}</Text>
     <View style={s.rule}/>
     {order.items?.map((item,i)=><View key={item.variantId+':'+i} style={{gap:5}}>
      <View style={s.row}><Text style={[s.ink,s.bold,{flex:1}]}>{item.productName}</Text><Text style={s.ink}>{money(item.quantity*item.unitPriceKobo)}</Text></View>
      <Text style={s.small}>{item.color} / {item.size} / Qty {item.quantity}</Text>
      <Text style={s.small}>{money(item.unitPriceKobo)} each</Text>
     </View>)}
     <View style={s.rule}/>
     {order.subtotalKobo!==undefined&&row('Subtotal',order.subtotalKobo+(order.discountKobo||0))}
     {!!order.discountKobo&&row('Discount',-order.discountKobo)}
     {order.shippingKobo!==undefined&&row('Delivery',order.shippingKobo)}
     {!!order.paymentFeeKobo&&row('Payment processing fee',order.paymentFeeKobo)}
     {row(paid?'Total paid':'Order total',order.totalKobo+(paid?(order.paymentFeeKobo||0):0),true)}
     <View style={[s.stamp,{borderColor:paid?'#225c3b':'#69542f'}]}><Text style={[s.ink,{fontSize:21,letterSpacing:4,color:paid?'#225c3b':'#69542f'}]}>{paid?'PAID':'UNPAID'}</Text></View>
     {paid&&['paid_stock_review','cancelled'].includes(order.status)&&<Text style={s.small}>Payment received. Customer care is reviewing this order before fulfilment.</Text>}
     <Text style={[s.small,{textAlign:'center'}]}>{paid?'Thank you for your order.':'Payment has not been confirmed.'}{'\n'}vantanoir.store</Text>
    </View>
    <View accessibilityElementsHidden style={s.teeth}>{Array.from({length:24},(_,i)=><View key={i} style={s.tooth}/>)}</View>
   </Animated.View>
  </View>
  {!reduce&&<Pressable accessibilityRole="button" onPress={()=>setReplay(n=>n+1)} style={{padding:12,alignSelf:'center'}}><Text style={{color:colors.muted}}>Replay receipt animation</Text></Pressable>}
 </View>;
}
const mono=Platform.OS==='ios'?'Menlo':'monospace';
const s=StyleSheet.create({
 printer:{height:58,backgroundColor:'#252e32',borderRadius:10,zIndex:2,justifyContent:'center',alignItems:'center',marginTop:16,boxShadow:'0px 8px 16px rgba(0,0,0,0.2)'},
 printerBrand:{color:'#c0c8c9',letterSpacing:4,fontSize:9},light:{position:'absolute',left:14,top:13,width:5,height:5,borderRadius:3,backgroundColor:'#c9f774'},
 slot:{position:'absolute',bottom:8,left:16,right:16,height:7,backgroundColor:'#080d10',borderRadius:4},
 feed:{overflow:'hidden',marginTop:-22,marginHorizontal:15,paddingBottom:16},
 paper:{backgroundColor:'#faf8ef',padding:22,paddingTop:30,gap:13,borderLeftWidth:1,borderRightWidth:1,borderColor:'#deddd2'},
 ink:{color:'#202621',fontFamily:mono,fontSize:12,lineHeight:19},small:{color:'#586057',fontFamily:mono,fontSize:10,lineHeight:16},bold:{fontWeight:'700'},row:{flexDirection:'row',justifyContent:'space-between',gap:10,flexWrap:'wrap'},rule:{borderTopWidth:1,borderStyle:'dashed',borderColor:'#bfc4b7',marginVertical:3},
 stamp:{alignSelf:'center',borderWidth:2,paddingHorizontal:18,paddingVertical:4,transform:[{rotate:'-7deg'}],marginVertical:10},
 teeth:{flexDirection:'row',height:9,overflow:'hidden'},tooth:{flex:1,height:9,backgroundColor:'#faf8ef',transform:[{skewY:'-30deg'}],marginRight:1}
});
