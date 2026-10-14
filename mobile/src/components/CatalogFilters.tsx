import React,{useRef,useState} from 'react';
import {Pressable,TextInput,View} from 'react-native';
import {Product} from '../types';
import {Icon,Text,useTheme} from '../theme';

export type FilterValues={category:string;size:string;color:string;min:string;max:string;stock:boolean};
export function CatalogFilters({products,value,onChange}:{products:Product[];value:FilterValues;onChange:(next:FilterValues)=>void}){
 const {colors}=useTheme(),[width,setWidth]=useState(1),handle=useRef<'min'|'max'>('min');
 const ceiling=Math.max(100000,...products.map(p=>Math.ceil(p.priceKobo/100000)*1000));
 const lower=Math.max(0,Math.min(ceiling,Number(value.min)||0)),upper=Math.max(lower,Math.min(ceiling,Number(value.max)||ceiling));
 const setPrice=(x:number)=>{const price=Math.round(Math.max(0,Math.min(1,x/width))*ceiling/1000)*1000;onChange({...value,[handle.current]:String(handle.current==='min'?Math.min(price,upper):Math.max(price,lower))});};
 return <View style={{gap:22}}>
  {(['category','size','color'] as const).map(key=><View key={key} style={{gap:12,paddingBottom:18,borderBottomWidth:1,borderColor:colors.border}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:17,fontWeight:'600'}}>{key==='category'?'Collection':key==='size'?'Size':'Colour'}</Text><Icon name="chevron-up" size={19}/></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['All',...new Set(key==='category'?products.map(p=>p.category):key==='size'?products.flatMap(p=>p.colorways.flatMap(c=>Object.keys(c.stock))).filter(size=>size!=='Size pending'):products.flatMap(p=>p.colorways.map(c=>c.name)))].map(item=>{
   const selected=value[key]===item,color=products.flatMap(p=>p.colorways).find(c=>c.name===item)?.hex;
   return <Pressable key={item} accessibilityRole="radio" accessibilityLabel={key+' '+item} accessibilityState={{checked:selected}} onPress={()=>onChange({...value,[key]:item})} style={key==='category'?{width:'100%',minHeight:34,flexDirection:'row',alignItems:'center',gap:12}:key==='size'?{width:'30%',minHeight:40,borderWidth:1,borderColor:selected?colors.accentInk:colors.border,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:selected?colors.selected:'transparent'}:{width:'30%',minHeight:76,alignItems:'center',justifyContent:'center',gap:7}}>
    {key==='category'&&<Icon name={selected?'checkbox':'square-outline'} size={23} color={selected?colors.accentInk:colors.muted}/>}
    {key==='color'&&<View style={{width:42,height:42,borderRadius:21,borderWidth:selected?2:1,borderColor:selected?colors.accentInk:colors.border,padding:3}}><View style={{flex:1,borderRadius:20,backgroundColor:color||colors.secondary}}/></View>}
    <Text style={{fontSize:13,flex:key==='category'?1:undefined}}>{item==='All'&&key==='category'?'All collections':item}</Text>{key==='category'&&<Text style={{fontSize:12,color:colors.muted}}>{item==='All'?products.length:products.filter(p=>p.category===item).length}</Text>}
   </Pressable>;
  })}</View></View>)}
  <Text style={{fontSize:17,fontWeight:'600'}}>Price</Text>
  <View style={{flexDirection:'row',justifyContent:'space-between',gap:16}}>{(['min','max'] as const).map(key=><View key={key} style={{flexDirection:'row',alignItems:'center'}}><Text>₦</Text><TextInput accessibilityLabel={key==='min'?'Minimum price (NGN)':'Maximum price (NGN)'} keyboardType="number-pad" value={value[key]} placeholder={key==='min'?'0':String(ceiling)} placeholderTextColor={colors.muted} onChangeText={text=>onChange({...value,[key]:text.replace(/\D/g,'')})} style={{width:110,minHeight:44,color:colors.text,textAlign:key==='min'?'left':'right'}}/></View>)}</View>
  <View accessibilityLabel="Price range" onLayout={e=>setWidth(e.nativeEvent.layout.width)} onStartShouldSetResponder={()=>true} onResponderGrant={e=>{const x=e.nativeEvent.locationX;handle.current=Math.abs(x-width*lower/ceiling)<Math.abs(x-width*upper/ceiling)?'min':'max';setPrice(x);}} onResponderMove={e=>setPrice(e.nativeEvent.locationX)} style={{height:44,justifyContent:'center',marginHorizontal:12}}><View pointerEvents="none" style={{height:3,backgroundColor:colors.border}}/><View pointerEvents="none" style={{position:'absolute',height:3,left:width*lower/ceiling,right:width*(1-upper/ceiling),backgroundColor:colors.accentInk}}/>{[lower,upper].map((price,i)=><View pointerEvents="none" key={i} style={{position:'absolute',left:width*price/ceiling-10,width:20,height:20,borderRadius:10,backgroundColor:colors.accentInk,borderWidth:1,borderColor:colors.page}}/>)}</View>
 </View>;
}
