import React from 'react';
import {Image,Pressable,View} from 'react-native';
import {Icon,Text,useTheme} from '../theme';

export function AboutBrand({onContact}:{onContact:()=>void}){
 const {colors}=useTheme();
 return <View style={{gap:20}}>
  <Image source={require('../../assets/brand-fabric.png')} accessibilityLabel="Vanta Noir embroidered on black technical fabric" style={{width:'100%',height:260,borderRadius:12}}/>
  <View style={{gap:5}}><Text style={{fontSize:25,fontWeight:'700',letterSpacing:-.7}}>Presence. Power. Precision.</Text><Text style={{fontSize:17}}>Made for after dark.</Text></View>
  <Text style={{fontSize:14,lineHeight:21,color:colors.muted}}>Vanta Noir creates technical streetwear and athletics designed for movement, purpose and self expression.</Text>
  <Text style={{fontSize:14,lineHeight:21,color:colors.muted}}>We combine considered design, performance fabrics and a refined dark aesthetic for those who move differently.</Text>
  <Pressable accessibilityRole="button" onPress={onContact} style={{flexDirection:'row',alignItems:'center',gap:16,borderTopWidth:1,borderColor:colors.border,paddingTop:18,minHeight:70}}><Icon name="mail-outline" size={28}/><View style={{flex:1,gap:5}}><Text style={{fontSize:14,fontWeight:'600'}}>Contact support</Text><Text style={{fontSize:12,color:colors.muted}}>For any questions or assistance.</Text></View><Icon name="chevron-forward" size={20}/></Pressable>
 </View>;
}
