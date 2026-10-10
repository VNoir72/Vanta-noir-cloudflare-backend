import React,{useEffect,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,ViewStyle,StyleProp} from 'react-native';
export function useReducedMotion(){
 const [reduce,setReduce]=useState(true);
 useEffect(()=>{let active=true;AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(active)setReduce(v);});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduce);return()=>{active=false;sub.remove();};},[]);
 return reduce;
}
export function Entrance({children,transitionKey,style,receipt=false}:{children:React.ReactNode;transitionKey:string;style?:StyleProp<ViewStyle>;receipt?:boolean}){
 const reduce=useReducedMotion(),[progress]=useState(()=>new Animated.Value(1));
 useEffect(()=>{progress.stopAnimation();if(reduce){progress.setValue(1);return;}progress.setValue(0);const motion=Animated.timing(progress,{toValue:1,duration:receipt?650:300,easing:Easing.out(Easing.cubic),useNativeDriver:true});motion.start();return()=>motion.stop();},[progress,reduce,transitionKey,receipt]);
 return <Animated.View style={[style,{opacity:progress,transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[receipt?-48:18,0]})},{scale:progress.interpolate({inputRange:[0,1],outputRange:[receipt?.96:.99,1]})}]}]}>{children}</Animated.View>;
}
