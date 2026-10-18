import React,{useEffect,useState} from 'react';
import {Image,Linking,Platform,Pressable,View} from 'react-native';
import {Text,useTheme} from '../theme';
import {EditorialButton,Wordmark} from './Onboarding';
export function VerificationScreen({email,busy,message,onCheck,onResend,onChange}:{email:string;busy:boolean;message:string;onCheck:()=>Promise<void>;onResend:()=>Promise<void>;onChange:()=>Promise<void>}){
 const {colors}=useTheme();const [until,setUntil]=useState(()=>Date.now()+60000),[now,setNow]=useState(()=>Date.now()),[error,setError]=useState('');
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const seconds=Math.max(0,Math.ceil((until-now)/1000));
 async function openMail(){try{if(Platform.OS==='android')await Linking.openURL('googlegmail://');else await Linking.openURL('message://');}catch{setError('Open your email app from your home screen, then return here.');}}
 return <View style={{backgroundColor:'#080b09',flexGrow:1,minHeight:700,paddingHorizontal:26,paddingBottom:30,width:'100%',maxWidth:480,alignSelf:'center',gap:12}}>
 <Wordmark/><Text style={{color:colors.accent,letterSpacing:4,textAlign:'center',fontSize:10,marginTop:5}}>ACCOUNT CREATED</Text>
 <View style={{height:165,alignItems:'center',justifyContent:'center'}}><Image source={require('../../assets/verification-envelope.jpg')} resizeMode="contain" style={{height:165,width:'100%'}} accessibilityLabel="Silver envelope"/><View style={{position:'absolute',bottom:19,width:36,height:2,backgroundColor:colors.accent,borderRadius:2}}/></View>
 <Text accessibilityRole="header" style={{color:'#f5f1e8',fontSize:36,fontWeight:'300'}}>One last step.</Text>
 <Text style={{color:'#f5f1e8',fontSize:15,lineHeight:23}}>Verify your email to finish setting up your account.</Text>
 <Text selectable style={{color:'#f5f1e8',fontSize:16}}>{email}</Text>
 <View style={{gap:8,marginVertical:6}}>{['Open your email','Tap Verify email','Return to Vanta Noir'].map((label,i)=><View key={label} style={{flexDirection:'row',gap:14,alignItems:'center'}}><View style={{width:27,height:27,borderWidth:1,borderColor:'#f5f1e8',borderRadius:14,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#f5f1e8',fontSize:12}}>{i+1}</Text></View><Text style={{color:'#f5f1e8',fontSize:14}}>{label}</Text></View>)}</View>
 <EditorialButton label="Open email app" disabled={busy} onPress={()=>void openMail()}/><EditorialButton label="Check verification" secondary disabled={busy} onPress={()=>void onCheck()}/>
 <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8,marginTop:8}}><Pressable disabled={busy||seconds>0} accessibilityRole="button" onPress={()=>void onResend().then(()=>{setUntil(Date.now()+60000);setNow(Date.now());setError('');}).catch(()=>setError('Could not resend yet. Please wait a moment and try again.'))} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:'#deded8',fontSize:11}}>{seconds?`Resend email in ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:'Resend email'}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void onChange()} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:'#deded8',fontSize:11}}>Wrong email? <Text style={{color:colors.accent,textDecorationLine:'underline'}}>Change it</Text></Text></Pressable></View>
 <Text style={{color:'#a5a6a1',textAlign:'center',fontSize:12}}>Check your spam folder too.</Text>{!!(message||error)&&<Text accessibilityLiveRegion="polite" style={{color:'#f5f1e8',fontSize:13,lineHeight:20}}>{error||message}</Text>}
 </View>;
}
