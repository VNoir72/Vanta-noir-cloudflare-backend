import React,{useEffect,useState} from 'react';
import {Animated,AppState,Easing,Image,View} from 'react-native';
import {WebView} from 'react-native-webview';
import {ribbonSvg} from './ribbon-art';
export function FloatingCampaign({active,reduced,theme=0,image,backgroundOnly=false}:{active:boolean;reduced:boolean;theme?:number;image?:string;backgroundOnly?:boolean}){
 const [motion]=useState(()=>new Animated.Value(0));
 const [foreground,setForeground]=useState(AppState.currentState==='active');
 useEffect(()=>{const sub=AppState.addEventListener('change',s=>setForeground(s==='active'));return()=>sub.remove();},[]);
 const moving=active&&!reduced&&foreground;
 useEffect(()=>{if(!moving)return;const loop=Animated.loop(Animated.sequence([Animated.timing(motion,{toValue:1,duration:3500,easing:Easing.inOut(Easing.sin),useNativeDriver:true,isInteraction:false}),Animated.timing(motion,{toValue:0,duration:3500,easing:Easing.inOut(Easing.sin),useNativeDriver:true,isInteraction:false})]));loop.start();return()=>loop.stop();},[moving,motion]);
 const html=`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{position:absolute;inset:0}</style>${ribbonSvg(theme,moving)}</html>`;
 return <View pointerEvents="none" style={{position:'absolute',inset:0,overflow:'hidden',backgroundColor:theme%3===0?'#f4f4f1':'#080b0c'}}>
 <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',inset:0}}><WebView originWhitelist={['about:blank']} source={{html}} javaScriptEnabled={false} scrollEnabled={false} onShouldStartLoadWithRequest={r=>r.url==='about:blank'} style={{backgroundColor:'transparent',flex:1}}/></View>
 {!backgroundOnly&&<Animated.View style={{position:'absolute',left:'36%',right:'1%',top:6,bottom:18,transform:[{translateY:motion.interpolate({inputRange:[0,1],outputRange:[4,-7]})}]}}><Image source={image?{uri:image}:require('../../assets/vanta-burgundy-set-cutout.png')} resizeMode="contain" style={{width:'100%',height:'100%'}} accessibilityLabel="Featured Vanta Noir garment"/></Animated.View>}
 </View>;
}
