import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {router} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {Text,Icon,useTheme} from '../theme';
import {monitoringChoice,saveMonitoring} from '../monitoring';
import {vault} from '../api';

const background='#080b09',ink='#f5f1e8';
export function EditorialButton({label,onPress,secondary=false,disabled=false}:{label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}){
 const {colors}=useTheme();
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>({minHeight:52,padding:14,borderRadius:10,borderWidth:1,borderColor:secondary?ink:colors.accent,backgroundColor:secondary?'transparent':colors.accent,alignItems:'center',justifyContent:'center',opacity:disabled?.45:pressed?.75:1})}><Text style={{color:secondary?ink:colors.onAccent,fontSize:15,fontWeight:secondary?'400':'700'}}>{label}</Text></Pressable>;
}
export function Wordmark(){return <Text style={{color:ink,textAlign:'center',fontSize:12,letterSpacing:6,paddingVertical:18}}>VANTA NOIR</Text>;}
export function Onboarding({children,onComplete}:{children:React.ReactNode;onComplete:(create:boolean)=>void}){
 const {colors}=useTheme();
 const [step,setStep]=useState<'loading'|'welcome'|'privacy'|'done'>('loading');
 const [hasChoice,setHasChoice]=useState(false);
 const [create,setCreate]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let alive=true;void Promise.all([AsyncStorage.getItem('vanta-onboarding-v1'),vault.get('session'),AsyncStorage.getItem('vanta-monitoring')]).then(([seen,session,choice])=>{if(alive){setHasChoice(choice!==null);setStep(seen||session?'done':'welcome');}}).catch(()=>{if(alive)setStep('welcome');});return()=>{alive=false;};},[]);
 async function begin(nextCreate:boolean){if(busy)return;setCreate(nextCreate);if(!hasChoice){setStep('privacy');return;}setBusy(true);setError('');try{await AsyncStorage.setItem('vanta-onboarding-v1','complete');onComplete(nextCreate);setStep('done');}catch{setError('Could not continue. Please try again.');}finally{setBusy(false);}}
 async function finish(analytics:boolean){if(busy)return;setBusy(true);setError('');try{const current=await monitoringChoice();await saveMonitoring({...current,analytics});await AsyncStorage.setItem('vanta-onboarding-v1','complete');onComplete(create);setStep('done');}catch{setError('Could not save your choice. Please try again.');}finally{setBusy(false);}}
 if(step==='done')return <>{children}</>;
 if(step==='loading')return <View style={{flex:1,backgroundColor:background,justifyContent:'center'}}><ActivityIndicator color={colors.accent}/></View>;
 return <ScrollView style={{flex:1,backgroundColor:background}} contentContainerStyle={{flexGrow:1,width:'100%',maxWidth:480,alignSelf:'center',paddingHorizontal:26,paddingBottom:26}}><StatusBar style="light"/><Wordmark/>{step==='welcome'?<>
 <Image source={require('../../assets/welcome-burgundy.jpg')} resizeMode="cover" accessibilityLabel="Burgundy garment with a silver zip" style={{height:300,marginHorizontal:-26,width:undefined}}/>
 <Text accessibilityRole="header" style={{color:ink,fontSize:36,lineHeight:42,fontWeight:'300',marginTop:-30}}>Presence.{'\n'}Power. Precision.</Text>
 <Text style={{color:ink,fontSize:21,marginTop:12}}>Welcome to Vanta Noir.</Text>
 <Text style={{color:'#bfbfba',fontSize:13,lineHeight:21,marginTop:10,marginBottom:26}}>Considered pieces. Your everyday signature.</Text>
 <View style={{gap:10}}><EditorialButton label="Get started" disabled={busy} onPress={()=>void begin(true)}/><EditorialButton label="Sign in" secondary disabled={busy} onPress={()=>void begin(false)}/></View>
 {!!error&&<Text accessibilityRole="alert" style={{color:ink,marginTop:14}}>{error}</Text>}
 <Text style={{color:ink,letterSpacing:3,fontSize:11,textAlign:'center',marginTop:35}}>Your next everyday uniform.</Text>
 </>:<>
 <Text style={{color:colors.accent,fontSize:10,letterSpacing:4,textAlign:'center',marginTop:40}}>YOUR PRIVACY</Text>
 <View style={{height:180,flexDirection:'row',alignItems:'flex-end',justifyContent:'center',gap:12,paddingBottom:22,marginTop:20}}>{[50,78,105].map(h=><View key={h} style={{width:25,height:h,borderWidth:1,borderColor:ink}}/>)}<Icon name="shield-checkmark-outline" size={46} color={colors.accent}/></View>
 <Text accessibilityRole="header" style={{color:ink,fontSize:31,fontWeight:'300',textAlign:'center',marginTop:15}}>Better, with your say.</Text>
 <Text style={{color:ink,fontSize:16,lineHeight:25,textAlign:'center',marginTop:20}}>Allow usage analytics to help us improve browsing and checkout.</Text>
 <Text style={{color:'#bfbfba',fontSize:13,lineHeight:21,textAlign:'center',marginTop:30}}>Optional. Change your choice anytime in Settings.</Text>
 <View style={{flexDirection:'row',gap:10,marginTop:30}}><View style={{flex:1}}><EditorialButton label="Allow analytics" disabled={busy} onPress={()=>void finish(true)}/></View><View style={{flex:1}}><EditorialButton label="No thanks" secondary disabled={busy} onPress={()=>void finish(false)}/></View></View>
 {!!error&&<Text accessibilityRole="alert" style={{color:ink,marginTop:14}}>{error}</Text>}
 <Pressable accessibilityRole="link" onPress={()=>router.push({pathname:'/help',params:{topic:'privacy-policy'}})} style={{borderTopWidth:1,borderColor:'#303330',padding:22,marginTop:48}}><Text style={{color:ink,fontSize:12,textDecorationLine:'underline',textAlign:'center'}}>Privacy policy</Text></Pressable>
 </>}</ScrollView>;
}
