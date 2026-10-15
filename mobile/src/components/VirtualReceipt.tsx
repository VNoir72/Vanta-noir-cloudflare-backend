import {customerOrderReference} from '../order-reference';
import React,{useEffect,useRef,useState} from 'react';
import {Animated,Easing,Platform,Pressable,StyleSheet,View,Modal,ScrollView} from 'react-native';
import {Text,Icon,useTheme} from '../theme';
import {Order} from '../types';
import {money} from '../api';
import {downloadReceipt} from '../receipt-download';
import {useReducedMotion} from './Motion';

/** A branded bag opens the verified receipt; reduced motion reveals it immediately. */
export function VirtualReceipt({order,onViewOrder}:{order:Order;onViewOrder?:()=>void;itemImages?:Record<string,string>}) {
 const {colors}=useTheme(), reduce=useReducedMotion();
 const [actionsOpen,setActionsOpen]=useState(false),[torn,setTorn]=useState(false),[tearing,setTearing]=useState(false),[notice,setNotice]=useState('');
 const savingRef=useRef(false);
 const [tear]=useState(()=>new Animated.Value(0));
 const [saving,setSaving]=useState(false),[error,setError]=useState('');
 const compactMoney=(amount:number)=>money(amount).replace(/\.00$/, '');
 const method=order.paymentChannel==='bank_transfer'?'Bank transfer':order.paymentChannel==='saved_card'||order.paymentChannel==='hosted'||order.paymentChannel==='card'?'Card':'—';
 const [height,setHeight]=useState(0),[replay,setReplay]=useState(0),[opened,setOpened]=useState(false);
 const [feed]=useState(()=>new Animated.Value(0));
 const measured=height>0;
 const paid=order.paymentStatus==='paid';
 useEffect(()=>{
  if(!measured||!opened)return;
  feed.stopAnimation();feed.setValue(0);
  const motion=Animated.timing(feed,{toValue:1,duration:reduce?0:1400,delay:reduce?0:80,easing:Easing.out(Easing.quad),useNativeDriver:false});
  motion.start(({finished})=>{if(finished)setActionsOpen(true);});return()=>motion.stop();
 },[feed,measured,reduce,order.reference,replay,opened]);
 useEffect(()=>()=>tear.stopAnimation(),[tear]);
 const openReceipt=()=>{if(tearing||savingRef.current)return;setActionsOpen(false);setTorn(false);tear.setValue(0);setOpened(true);setReplay(n=>n+1);setNotice('');};
 const tearReceipt=()=>{if(tearing||torn)return;setActionsOpen(false);setTearing(true);Animated.timing(tear,{toValue:1,duration:reduce?0:620,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}).start(({finished})=>{if(finished){setTearing(false);setTorn(true);setActionsOpen(true);}});};
 const exportReceipt=async(mode:'download'|'save')=>{if(savingRef.current)return;savingRef.current=true;setSaving(true);setError('');try{const result=await downloadReceipt(order,mode);setNotice(result==='saved'?'Receipt saved to your selected folder.':result==='downloaded'?'Receipt download started.':'');if(result!=='cancelled')setActionsOpen(false);}catch{setError('Could not save your receipt. Please try again.');}finally{savingRef.current=false;setSaving(false);}};
 const row=(label:string,value:number,strong=false)=><View key={label} style={s.row}><Text style={[s.ink,strong&&s.bold,{flex:1}]}>{label}</Text><Text style={[s.ink,strong&&s.bold]}>{compactMoney(value)}</Text></View>;
 return <View style={{gap:10,width:'100%',maxWidth:430,alignSelf:'center'}}>
  <Animated.View testID="receipt-scene" style={{height:feed.interpolate({inputRange:[0,1],outputRange:[280,Math.max(430,height+110)]}),overflow:'hidden',width:'100%'}}>
   <Animated.View testID="receipt-paper" pointerEvents={opened?'auto':'none'} accessibilityElementsHidden={!opened} importantForAccessibility={opened?'auto':'no-hide-descendants'} onLayout={e=>setHeight(e.nativeEvent.layout.height)} style={{position:'absolute',top:0,left:48,right:48,zIndex:0,opacity:feed.interpolate({inputRange:[0,.08,1],outputRange:[0,1,1]}),transform:[{translateY:feed.interpolate({inputRange:[0,1],outputRange:[260,8]})}]}}>
    <Animated.View style={{transform:[{translateX:tear.interpolate({inputRange:[0,.35,.65,1],outputRange:[0,-3,5,5]})},{translateY:tear.interpolate({inputRange:[0,1],outputRange:[0,9]})},{rotate:tear.interpolate({inputRange:[0,.5,1],outputRange:['0deg','-1deg','1deg']})}]}}>
    <View style={s.paper}>
     <Text style={[s.ink,{textAlign:'center',letterSpacing:3,fontSize:10,fontWeight:'600'}]}>VANTA NOIR</Text>
     <View style={s.rule}/>
     <Text style={s.small}>{paid?'Order receipt':'Order · payment unconfirmed'}</Text>
     <Text selectable style={[s.small,{fontSize:10}]}>{customerOrderReference(order.reference)}</Text>
     <View style={s.rule}/>
     {order.items?.map((item,i)=><View key={item.variantId+':'+i} style={{flexDirection:'row',gap:9,alignItems:'center'}}>

      <View style={{flex:1,gap:3}}><Text style={[s.ink,s.bold,{fontSize:10,lineHeight:14}]}>{item.productName}</Text><Text style={s.small}>{item.color} · {item.size} · × {item.quantity}</Text></View>
      <Text style={[s.ink,{fontSize:10}]}>{compactMoney(item.quantity*item.unitPriceKobo)}</Text>
     </View>)}
     <View style={s.rule}/>
     {row('Subtotal',order.subtotalKobo!==undefined?order.subtotalKobo+(order.discountKobo||0):(order.items||[]).reduce((total,item)=>total+item.unitPriceKobo*item.quantity,0))}
     {!!order.discountKobo&&row('Discount',-order.discountKobo)}
     {order.shippingKobo!==undefined&&row('Shipping',order.shippingKobo)}
     {!!order.paymentFeeKobo&&row('Payment processing fee',order.paymentFeeKobo)}
     {row('Total',order.totalKobo+(paid?(order.paymentFeeKobo||0):0),true)}{paid&&<View style={[s.stamp,{borderColor:colors.accentInk}]}><Text style={{fontSize:25,fontWeight:'700',letterSpacing:2,color:colors.accentInk}}>PAID</Text></View>}<View style={{height:26}}/>
    </View>
    <Animated.View accessibilityElementsHidden style={{height:1,borderTopWidth:1,borderStyle:'dashed',borderColor:'#9caa9c',opacity:tear.interpolate({inputRange:[0,.7,1],outputRange:[1,.7,0]}),transform:[{scaleX:tear.interpolate({inputRange:[0,1],outputRange:[1,0]})}]}}/>
    <View accessibilityElementsHidden style={s.teeth}>{Array.from({length:24},(_,i)=><View key={i} style={s.tooth}/>)}</View>
    </Animated.View>
   </Animated.View>
   <Animated.View style={{position:'absolute',top:feed.interpolate({inputRange:[0,1],outputRange:[26,Math.max(240,height-92)]}),zIndex:1,alignSelf:'center',width:'100%',height:230}}><Pressable accessibilityRole="button" accessibilityLabel={opened?'Replay receipt reveal':'Open your order receipt'} accessibilityHint="Your receipt slides out of the shopping bag" accessibilityState={{expanded:opened}} onPress={openReceipt} style={{width:'100%',height:'100%'}}>
    <Animated.Image source={require('../../assets/receipt-shopping-bag.png')} resizeMode="contain" style={{position:'absolute',width:'100%',height:'100%',opacity:feed.interpolate({inputRange:[0,.25,1],outputRange:[1,0,0]})}}/>
    <Animated.Image source={require('../../assets/receipt-bag-foreground.png')} resizeMode="contain" style={{width:'100%',height:'100%',opacity:feed.interpolate({inputRange:[0,.25,1],outputRange:[0,1,1]})}}/>
   </Pressable></Animated.View>
  </Animated.View>
  {!opened&&<>{paid&&<View style={{alignSelf:'center',width:34,height:34,borderRadius:17,borderWidth:1.5,borderColor:colors.accentInk,alignItems:'center',justifyContent:'center'}}><Icon name="checkmark" size={22} color={colors.accentInk}/></View>}
  <View style={{alignItems:'center',gap:7}}><Text style={{fontSize:23,fontWeight:'700'}}>{paid?'Payment confirmed':'Your order'}</Text><Text style={{fontSize:14,color:colors.muted}}>Thank you for your order.</Text></View>
  <View style={{padding:12,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.glass,gap:7}}>{[['Reference',customerOrderReference(order.reference)],['Amount paid',compactMoney(order.totalKobo+(paid?(order.paymentFeeKobo||0):0))],['Payment method',method],['Status',paid?'Confirmed':'Unconfirmed']].map(([label,value])=><View key={label} style={{flexDirection:'row',gap:14,alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:12,color:colors.muted}}>{label}</Text><Text numberOfLines={1} selectable style={{fontSize:12,fontWeight:label==='Reference'||label==='Amount paid'?'600':'400',maxWidth:'65%',...(label==='Status'?{backgroundColor:colors.selected,color:colors.accentInk,borderRadius:8,paddingHorizontal:9,paddingVertical:3}:{})}}>{value}</Text></View>)}</View>
  {!opened&&<Pressable accessibilityRole="button" accessibilityLabel="Tap bag to view receipt" onPress={openReceipt} style={{minHeight:64,padding:12,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.glass,flexDirection:'row',gap:14,alignItems:'center'}}><View style={{width:40,height:40,borderRadius:20,backgroundColor:colors.selected,alignItems:'center',justifyContent:'center'}}><Icon name="bag-outline" size={22} color={colors.accentInk}/></View><View style={{gap:5}}><Text style={{fontSize:13,fontWeight:'600'}}>Tap bag to view receipt</Text><Text style={{fontSize:11,color:colors.muted}}>See your order summary.</Text></View></Pressable>}
  {onViewOrder&&<Pressable accessibilityRole="button" onPress={onViewOrder} style={{minHeight:46,borderRadius:10,backgroundColor:colors.accent,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:28,marginTop:4}}><Text style={{color:colors.onAccent,fontSize:14,fontWeight:'600'}}>View order</Text><Icon name="arrow-forward" size={20} color={colors.onAccent}/></Pressable>}
  </>}
  {!!error&&<Text accessibilityRole="alert">{error}</Text>}{!!notice&&<Text accessibilityLiveRegion="polite">{notice}</Text>}
  {opened&&<><View style={{flexDirection:'row',gap:8}}><Pressable accessibilityRole="button" onPress={openReceipt} style={{flex:1,minHeight:46,borderWidth:1,borderColor:colors.border,borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7}}><Icon name="refresh" size={20}/><Text style={{fontSize:12}}>Replay animation</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={()=>void exportReceipt('download')} style={{flex:1,minHeight:46,borderWidth:1,borderColor:colors.accentInk,borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7}}><Icon name="download-outline" size={20} color={colors.accentInk}/><Text style={{fontSize:12}}>Download receipt</Text></Pressable></View><Pressable accessibilityRole="button" accessibilityLabel="Receipt options" onPress={()=>setActionsOpen(true)} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:12,color:colors.accentInk}}>Tear or save receipt</Text></Pressable></>}
  <Modal transparent visible={actionsOpen} animationType={reduce?'none':'fade'} onRequestClose={()=>{if(!saving)setActionsOpen(false);}}>
   <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(10,12,11,.25)',padding:16}}>
    <Pressable accessibilityLabel="Dismiss receipt options" disabled={saving} onPress={()=>setActionsOpen(false)} style={StyleSheet.absoluteFill}/>
    <View accessibilityViewIsModal style={{width:'100%',maxWidth:430,maxHeight:'85%',alignSelf:'center',borderRadius:20,padding:20,gap:14,backgroundColor:colors.page,borderWidth:1,borderColor:colors.border}}>
     <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text accessibilityRole="header" style={{fontSize:20,fontWeight:'600'}}>{torn?'Receipt detached':'Your receipt'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close receipt options" disabled={saving} onPress={()=>setActionsOpen(false)} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Icon name="close" size={22}/></Pressable></View>
     <ScrollView contentContainerStyle={{gap:10}}>
      <Text style={{color:colors.muted,fontSize:13,marginBottom:4}}>{torn?'Download or save your receipt.':'Would you like to tear, download or save your receipt?'}</Text>
      {!torn&&<Pressable accessibilityRole="button" accessibilityLabel="Tear receipt" disabled={saving||tearing} onPress={tearReceipt} style={{minHeight:50,borderRadius:10,backgroundColor:colors.text,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12}}><Icon name="cut-outline" size={21} color={colors.page}/><Text style={{color:colors.page,fontWeight:'600'}}>Tear receipt</Text></Pressable>}
      {(['download','save'] as const).map(mode=><Pressable key={mode} accessibilityRole="button" accessibilityLabel={mode==='download'?'Download receipt file':'Save receipt'} disabled={saving} onPress={()=>void exportReceipt(mode)} style={{minHeight:54,padding:12,borderRadius:10,borderWidth:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',gap:12,opacity:saving?.5:1}}><Icon name={mode==='download'?'download-outline':'save-outline'} size={22}/><View style={{flex:1,gap:3}}><Text style={{fontSize:14,fontWeight:'600'}}>{mode==='download'?'Download':'Save'}</Text><Text style={{fontSize:11,color:colors.muted}}>{mode==='download'?'Choose a folder on your device':'Choose a file destination or app'}</Text></View><Icon name="chevron-forward" size={18}/></Pressable>)}
      {saving&&<Text accessibilityLiveRegion="polite">Preparing your receipt…</Text>}{!!error&&<Text accessibilityRole="alert">{error}</Text>}
     </ScrollView>
    </View>
   </View>
  </Modal>

 </View>;
}
const mono=Platform.OS==='ios'?'Menlo':'monospace';
const s=StyleSheet.create({
 printer:{height:58,backgroundColor:'#252e32',borderRadius:10,zIndex:2,justifyContent:'center',alignItems:'center',marginTop:16,boxShadow:'0px 8px 16px rgba(0,0,0,0.2)'},
 printerBrand:{color:'#c0c8c9',letterSpacing:4,fontSize:9},light:{position:'absolute',left:14,top:13,width:5,height:5,borderRadius:3,backgroundColor:'#00ff66'},
 slot:{position:'absolute',bottom:8,left:16,right:16,height:7,backgroundColor:'#080d10',borderRadius:4},
 feed:{overflow:'hidden',marginHorizontal:6,paddingBottom:16},
 paper:{backgroundColor:'#fffefa',padding:16,paddingTop:20,gap:7,borderRadius:2,borderWidth:1,borderColor:'#e6e4df',boxShadow:'0 5px 16px rgba(0,0,0,.16)'},
 ink:{color:'#202621',fontFamily:mono,fontSize:12,lineHeight:19},small:{color:'#586057',fontFamily:mono,fontSize:10,lineHeight:16},bold:{fontWeight:'700'},row:{flexDirection:'row',justifyContent:'space-between',gap:10,flexWrap:'wrap'},rule:{borderTopWidth:1,borderStyle:'dashed',borderColor:'#bfc4b7',marginVertical:3},
 stamp:{alignSelf:'center',borderWidth:2,paddingHorizontal:18,paddingVertical:4,transform:[{rotate:'-7deg'}],marginVertical:10},
 teeth:{flexDirection:'row',height:9,overflow:'hidden'},tooth:{flex:1,height:9,backgroundColor:'#faf8ef',transform:[{skewY:'-30deg'}],marginRight:1}
});
