import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {useTheme} from '../theme';

/** Fixed behind the entire authentication screen, including the form and footer. */
export function AuthBackdrop() {
  const {dark}=useTheme();
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Image source={require('../../assets/auth-landscape.png')} resizeMode="cover" style={{width:'100%',height:'100%'}}/>
    {dark&&<View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(8,12,10,.82)'}]}/>}
  </View>;
}
