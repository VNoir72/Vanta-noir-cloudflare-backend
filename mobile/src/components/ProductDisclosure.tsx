import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {Text,Icon,useTheme} from '../theme';
import {Entrance} from './Motion';
export function ProductDisclosure({title,children}:{title:string;children:React.ReactNode}){const [open,setOpen]=useState(false),{colors}=useTheme();return <View style={{borderBottomWidth:1,borderColor:colors.border}}><Pressable onPress={()=>setOpen(v=>!v)} accessibilityRole="button" accessibilityState={{expanded:open}} style={{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:14,fontWeight:'600'}}>{title}</Text><Icon name={open?'chevron-up':'chevron-down'} size={18}/></Pressable>{open&&<Entrance transitionKey={title} style={{paddingBottom:12,gap:7}}>{children}</Entrance>}</View>}
