import React, {useEffect, useState} from 'react';
import {Animated, AppState, Easing, Image, View} from 'react-native';

/** Native campaign artwork. Navigation and shopping controls stay in AppHero. */
export function FloatingCampaign({active, reduced}: {active: boolean; reduced: boolean}) {
  const [motion] = useState(() => new Animated.Value(0));
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!active || reduced || !foreground) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, {toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false}),
      Animated.timing(motion, {toValue: 0, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false}),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, reduced, foreground, motion]);
  return <View style={{flex: 1, backgroundColor: '#26111d', overflow: 'hidden'}}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',inset:0}}>
      {['#aa5770', '#dfa4b4', '#6d263f'].map((color, i) => <Animated.View key={color} style={{position:'absolute',left:'-15%',top:30+i*36,width:'130%',height:100,borderRadius:200,borderWidth:16,borderColor:color,transform:[{rotate:motion.interpolate({inputRange:[0,1],outputRange:[`${-24+i*18}deg`,`${-6+i*18}deg`]})},{scaleY:motion.interpolate({inputRange:[0,1],outputRange:[0.8,1.1]})}]}}/>)}
    </View>
    <Animated.View style={{position:'absolute',left:'16%',right:'16%',top:3,bottom:48,transform:[{translateY:motion.interpolate({inputRange:[0,1],outputRange:[5,-7]})},{rotate:motion.interpolate({inputRange:[0,1],outputRange:['-1deg','1deg']})}]}}>
      <Image source={require('../../assets/vanta-burgundy-set-cutout.png')} accessibilityLabel="Vanta Noir burgundy tracksuit jacket and trousers" resizeMode="contain" style={{width:'100%',height:'100%'}}/>
    </Animated.View>
  </View>;
}
