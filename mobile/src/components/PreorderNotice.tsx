import React from 'react';
import {View} from 'react-native';
import {Text,Icon,useTheme} from '../theme';
import {savedPreorders} from '../preorders';
import type {PreorderPromise} from '../types';
export function PreorderNotice({items}:{items?:PreorderPromise[]}){
 const {colors}=useTheme(),promises=savedPreorders(items);
 if(!promises.length)return null;
 return <View accessibilityLabel="Preorder dispatch" style={{padding:16,gap:10,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.secondary}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name="calendar-outline" size={20}/><Text style={{fontSize:14,fontWeight:'700'}}>Preorder items</Text></View>
  {promises.map(item=><View key={item.productId} style={{gap:4}}><Text style={{fontSize:13,fontWeight:'600'}}>{item.productName}</Text><Text style={{fontSize:13,lineHeight:20,color:colors.muted}}>{item.dispatchNote||'Contact customer care for the dispatch schedule before ordering.'}</Text></View>)}
  <Text style={{fontSize:12,lineHeight:18,color:colors.muted}}>Courier transit time starts after dispatch.</Text>
 </View>;
}
