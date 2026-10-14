import React,{createContext,useContext,useState} from 'react';
import {Modal,Pressable,View,ScrollView} from 'react-native';
import {Text,Icon,useTheme} from '../theme';
import {Entrance,useReducedMotion} from './Motion';
type Action={text?:string;style?:'default'|'cancel'|'destructive';onPress?:()=>void};
type Dialog={title:string;message?:string;actions:Action[]};
const Context=createContext({alert:(_title:string,_message?:string,_actions?:Action[])=>{}});
export const useBrandDialog=()=>useContext(Context);
export function BrandDialogProvider({children}:{children:React.ReactNode}){
 const [dialog,setDialog]=useState<Dialog|null>(null);const {colors}=useTheme();const reduce=useReducedMotion();
 const close=()=>setDialog(null);
 return <Context.Provider value={{alert:(title,message,actions)=>setDialog({title,message,actions:actions?.length?actions:[{text:'Got it'}]})}}>{children}<Modal visible={!!dialog} transparent animationType={reduce?'none':'fade'} onRequestClose={close}><View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(10,14,10,.38)',padding:22}}><Pressable accessibilityLabel="Dismiss dialog" onPress={close} style={{position:'absolute',inset:0}}/>{dialog&&<Entrance transitionKey={dialog.title} style={{width:'100%',maxWidth:380,maxHeight:'80%',backgroundColor:colors.surface,borderRadius:24,borderWidth:1,borderColor:colors.border,padding:18,gap:12}}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><Icon name="sparkles-outline" size={21} color={colors.accent}/><Text accessibilityRole="header" style={{fontSize:18,fontWeight:'700',flex:1}}>{dialog.title}</Text><Pressable accessibilityLabel="Close dialog" onPress={close} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Icon name="close" size={20}/></Pressable></View><ScrollView>{!!dialog.message&&<Text style={{fontSize:14,lineHeight:20,color:colors.muted}}>{dialog.message}</Text>}</ScrollView><View style={{gap:7}}>{dialog.actions.map((action,i)=><Pressable key={i} accessibilityRole="button" onPress={()=>{close();action.onPress?.();}} style={({pressed})=>({minHeight:44,paddingHorizontal:15,paddingVertical:10,borderRadius:24,alignItems:'center',opacity:pressed?.7:1,backgroundColor:action.style==='cancel'?colors.secondary:action.style==='destructive'?colors.danger:colors.accent})}><Text style={{fontSize:14,fontWeight:'600',color:action.style==='cancel'?colors.text:action.style==='destructive'?'#fff':colors.accentInk}}>{action.text||'OK'}</Text></Pressable>)}</View></Entrance>}</View></Modal></Context.Provider>;
}
