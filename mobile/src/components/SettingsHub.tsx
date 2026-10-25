import {AboutBrand} from './AboutBrand';
import {initialAccountPanel,openAccountPanel,previousAccountPanel} from '../account-navigation';
import {BrandHeader,PageTitle,Segments} from './AppChrome';
import {AccountSecurity} from './AccountSecurity';
import {PhoneVerification,CircleMembership} from './GrowthExperience';
import {monitoringChoice,saveMonitoring,MonitoringChoice} from '../monitoring';
import {Entrance} from './Motion';
import {CurrencyPicker} from './CurrencyPicker';
import {useBrandDialog} from './BrandDialog';
import {usePreferences,savePreferences} from "../preferences";
import React,{useEffect,useState,useCallback} from 'react';
import {Image,Pressable,TextInput,View,Switch,BackHandler} from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Text,Icon,useTheme} from '../theme';
import {Address,Customer,emptyAddress} from '../types';
import {api} from '../api';
import {ShippingAddress} from './ShippingAddress';

type Props={initialPanel?:string;customer:Customer|null;onSave:(next:Customer)=>Promise<void>;onBack:()=>void;onOrders:()=>void;onLogout:()=>void;onDelete:()=>void;onHelp:(topic:string)=>void;onCountry:()=>void;country:string;countries:readonly (readonly [string,string])[];viewed:React.ReactNode;onClearViewed:()=>Promise<void>;autoplay:boolean;onAutoplay:(value:boolean)=>Promise<void>};
export function SettingsHub(p:Props){
 const Alert=useBrandDialog();
 const preferences=usePreferences();
 const [monitoring,setMonitoring]=useState<MonitoringChoice>({analytics:false,diagnostics:false}),[monitoringReady,setMonitoringReady]=useState(false);

 const {colors}=useTheme();
 const [history,setHistory]=useState([initialAccountPanel(p.initialPanel)]);
 const panel=history[history.length-1];
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[name,setName]=useState(p.customer?.name||''),[phone,setPhone]=useState(p.customer?.phone||'');
 const [extra,setExtra]=useState(p.customer?.profile||{photo:'',gender:'',birthday:''});
 const [profileField,setProfileField]=useState<'Nickname'|'Birthday'|'Phone'|null>(null),[editing,setEditing]=useState<number|null>(null),[draft,setDraft]=useState<Address>(emptyAddress);
 useEffect(()=>{let active=true;void monitoringChoice().then(value=>{if(active){setMonitoring(value);setMonitoringReady(true);}}).catch(()=>{if(active)setMessage('Privacy preferences could not load. Reopen this page to retry.');});return()=>{active=false;};},[]);
 const key='vanta-profile-device:'+p.customer?.email;
 useEffect(()=>{let live=true;AsyncStorage.getItem(key).then(v=>{if(live&&v&&!p.customer?.profile)setExtra(JSON.parse(v));}).catch(()=>{});return()=>{live=false;};},[key,p.customer?.profile]);
 const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}};
 const open=(s:string)=>{setHistory(current=>openAccountPanel(current,s));setMessage('');setEditing(null);setProfileField(null);};
 const onExit=p.onBack;
 const goBack=useCallback(()=>{if(editing!==null){setEditing(null);return;}if(profileField!==null){setProfileField(null);return;}const previous=previousAccountPanel(history);if(previous){setHistory(previous);setMessage('');}else onExit();},[editing,profileField,history,onExit]);
 useEffect(()=>{const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{goBack();return true;});return()=>subscription.remove();},[goBack]);
 const icons:Record<string,React.ComponentProps<typeof Icon>['name']>={'Account information':'person-outline','Nickname':'create-outline','Gender':'person-outline','Phone number':'call-outline','Birthday':'calendar-outline','Country/region':'globe-outline','Sign-in security':'lock-closed-outline','Usage analytics':'bar-chart-outline','Crash diagnostics':'bug-outline','Drop calendar':'calendar-outline','Push notifications':'notifications-outline','Email subscriptions':'mail-outline','Language':'language-outline','Theme':'moon-outline','Country':'globe-outline','Image quality':'image-outline','Security':'lock-closed-outline','Appearance':'contrast-outline','Account security':'shield-checkmark-outline','Help & support':'headset-outline','About Vanta Noir':'information-circle-outline','Vanta Circle':'star-outline','Verify phone':'call-outline','Orders':'cube-outline','Profile':'person-circle-outline','Shipping address':'location-outline','Ship to':'globe-outline','Currency':'cash-outline','General settings':'settings-outline','Notification settings':'notifications-outline','Viewed':'eye-outline','Privacy & diagnostics':'shield-checkmark-outline','App suggestion':'help-circle-outline','Privacy policy':'document-text-outline','Legal information':'document-text-outline','Delete account':'trash-outline','App video preferences':'play-outline'};
 const row=(label:string,value:string,action:()=>void)=><Pressable key={label} accessibilityRole="button" disabled={busy} onPress={action} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:48,paddingVertical:10,paddingHorizontal:12,marginHorizontal:16,marginBottom:6,borderRadius:12,backgroundColor:colors.glass,borderWidth:1,borderColor:colors.border}}><Icon name={icons[label]||'settings-outline'} size={21} color={label==='Delete account'?colors.danger:colors.text}/><Text style={{flex:1,fontSize:15,color:label==='Delete account'?colors.danger:colors.text}}>{label}</Text>{value!==''&&<Text numberOfLines={1} style={{fontSize:13,color:colors.muted,maxWidth:'50%'}}>{value}</Text>}<Icon name="chevron-forward" size={18}/></Pressable>;
 const section=(title:string)=><Text accessibilityRole="header" style={{fontSize:11,letterSpacing:1.5,fontWeight:'700',color:colors.muted,paddingHorizontal:16,paddingTop:24,paddingBottom:10}}>{title}</Text>;
 const gap=<View style={{height:10}}/>;
 const button=(label:string,action:()=>void)=><Pressable accessibilityRole="button" disabled={busy} onPress={action} style={{padding:15,margin:16,borderRadius:25,backgroundColor:colors.accent,alignItems:'center'}}><Text style={{fontWeight:'700',color:colors.onAccent}}>{label}</Text></Pressable>;
 const toggle=(label:string,value:boolean,onChange:(value:boolean)=>void,description?:string,disabled=false)=><View style={{marginHorizontal:16,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1,gap:5}}><Text style={{fontSize:14}}>{label}</Text>{description&&<Text style={{fontSize:12,lineHeight:18,color:colors.muted}}>{description}</Text>}</View><Switch accessibilityLabel={label} value={value} disabled={busy||disabled} onValueChange={onChange} trackColor={{false:colors.border,true:colors.accentInk}}/></View>;
 const input=(label:string,value:string,change:(v:string)=>void)=><View style={{padding:16,gap:8,backgroundColor:colors.surface}}><Text>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change} maxLength={label.startsWith('Phone')?30:label.startsWith('Birthday')?10:80} style={{padding:12,minHeight:44,borderWidth:1,borderColor:colors.border,borderRadius:10,color:colors.text}}/></View>;
 const info=(title:string,body:string)=>Alert.alert(title,body);
 const saveAddresses=async(addresses:Address[])=>{if(!p.customer)return;await p.onSave({...p.customer,addresses});setEditing(null);setMessage('Addresses saved.');};
 const choosePhoto=()=>void run(async()=>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.35,base64:true});if(!result.canceled&&result.assets[0].base64){if(result.assets[0].base64.length>1500000)throw Error('Please choose a smaller photo.');const next={...extra,photo:'data:image/jpeg;base64,'+result.assets[0].base64};if(!p.customer)throw Error('Sign in first.');await p.onSave({...p.customer,profile:next});await AsyncStorage.setItem(key,JSON.stringify(next));setExtra(next);setMessage('Photo saved to your account.');}});
 return <Entrance transitionKey={panel} style={{backgroundColor:colors.page,minHeight:400}}>
  <BrandHeader title={panel==='Shipping address'?'Saved addresses':panel} onBack={goBack}/><View style={{height:12}}/>
  {!!message&&<Text accessibilityLiveRegion="polite" style={{padding:16}}>{message}</Text>}
  {panel==='Settings'&&<>
    {p.customer?row('Account security','',()=>open('Account security')):button('Sign in',p.onBack)}
    {section('APP PREFERENCES')}
    {!p.customer&&<>{row('Country',p.countries.find(([code])=>code===p.country)?.[1]||p.country,p.onCountry)}{row('Currency',preferences.currency,()=>open('Currency'))}</>}
    <View style={{paddingHorizontal:16,gap:10,paddingBottom:16}}><Text style={{fontSize:14}}>Image quality</Text><Segments values={['smart','high','normal'] as const} value={preferences.imageQuality} onChange={imageQuality=>void run(()=>savePreferences({imageQuality}))}/></View>
    {toggle('Autoplay videos',p.autoplay,enabled=>void run(()=>p.onAutoplay(enabled)),'Videos play muted. Turn off to play them manually.')}
    {row('Viewed','Recently viewed pieces',()=>open('Viewed'))}
    {section('PRIVACY')}
    <Text style={{paddingHorizontal:16,paddingBottom:12,fontSize:12,lineHeight:18,color:colors.muted}}>Optional analytics and crash reports go to Google Firebase. Reports exclude your email, address, payment details and search text.</Text>
    {toggle('Usage analytics',monitoring.analytics,enabled=>void run(async()=>{const next={...monitoring,analytics:enabled};await saveMonitoring(next);setMonitoring(next);}),undefined,!monitoringReady)}
    {toggle('Crash diagnostics',monitoring.diagnostics,enabled=>void run(async()=>{const next={...monitoring,diagnostics:enabled};await saveMonitoring(next);setMonitoring(next);}),undefined,!monitoringReady)}
    {row('About Vanta Noir','',()=>open('About Vanta Noir'))}
    {p.customer&&button('Sign out',p.onLogout)}
    {p.customer&&row('Delete account','',p.onDelete)}
    <Text style={{textAlign:'center',fontSize:11,color:colors.muted,padding:18}}>VANTA NOIR · {Constants.expoConfig?.version}</Text>
  </>}
  {panel==='Vanta Circle'&&(p.customer?<CircleMembership/>:<Text style={{padding:20}}>Sign in from You to see your Vanta Circle membership.</Text>)}{panel==='Verify phone'&&p.customer&&<PhoneVerification/>}
  {panel==='Profile'&&(!p.customer?<Text style={{padding:20}}>Sign in from You to manage your profile.</Text>:<>
    <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={choosePhoto} style={{padding:16,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text>Photo</Text>{extra.photo?<Image source={{uri:extra.photo}} style={{width:54,height:54,borderRadius:27}}/>:<Icon name="person-circle-outline" size={54}/>}</Pressable>{gap}
    {row('Account information',p.customer.email,()=>info('Account information',`Your account works on the app and website. Email: ${p.customer!.email}\nContact support for account email changes.`))}
    {row('Nickname',p.customer.name||'Not set',()=>setProfileField(profileField==='Nickname'?null:'Nickname'))}{profileField==='Nickname'&&<>{input('Nickname',name,setName)}{button('Save nickname',()=>void run(async()=>{if(!name.trim())throw Error('Enter your name.');await p.onSave({...p.customer!,name:name.trim()});setMessage('Profile saved.');setProfileField(null);}))}</>}
    {row('Gender',extra.gender||'Not set',()=>Alert.alert('Gender','Optional; save your profile to sync this detail.',[{text:'Woman',onPress:()=>setExtra({...extra,gender:'Woman'})},{text:'Man',onPress:()=>setExtra({...extra,gender:'Man'})},{text:'Prefer not to say',onPress:()=>setExtra({...extra,gender:'Prefer not to say'})}]))}
    {row('Phone number',p.customer.phone||'Not set',()=>setProfileField(profileField==='Phone'?null:'Phone'))}{profileField==='Phone'&&<>{input('Phone number including country code',phone,setPhone)}{button('Save phone number',()=>void run(async()=>{if(!/^\+?[0-9 ()-]{7,30}$/.test(phone.trim()))throw Error('Enter a valid phone number.');await p.onSave({...p.customer!,phone:phone.trim()});setMessage('Contact number saved.');setProfileField(null);}))}</>}
    {row('Birthday',extra.birthday||'Not set',()=>setProfileField(profileField==='Birthday'?null:'Birthday'))}{profileField==='Birthday'&&input('Birthday (YYYY-MM-DD, optional)',extra.birthday,v=>setExtra({...extra,birthday:v}))}
    {button('Save profile details',()=>void run(async()=>{if(extra.birthday&&(!/^\d{4}-\d{2}-\d{2}$/.test(extra.birthday)||!Number.isFinite(Date.parse(extra.birthday))||new Date(extra.birthday).toISOString().slice(0,10)!==extra.birthday||Date.parse(extra.birthday)>Date.now()))throw Error('Enter a valid birthday in YYYY-MM-DD format.');await p.onSave({...p.customer!,profile:extra});await AsyncStorage.setItem(key,JSON.stringify(extra));setMessage('Profile saved on the app and website.');}))}
    <Text style={{padding:16,color:colors.muted}}>Your saved profile details sync to your account on the app and website.</Text>

  </>)}
  {panel==='Shipping address'&&(!p.customer?<Text style={{padding:20}}>Sign in to save addresses.</Text>:editing!==null?<View style={{padding:16}}><ShippingAddress value={draft} onChange={setDraft} signedIn busy={busy} countries={p.countries} onDone={a=>void run(async()=>{const list=[...p.customer!.addresses];if(editing===-1)list.push(a);else list[editing]=a;await saveAddresses(list);})}/>{button('Cancel',()=>setEditing(null))}{editing>=0&&button('Delete address',()=>Alert.alert('Delete address?','Remove this saved address?', [{text:'Keep',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void run(()=>saveAddresses(p.customer!.addresses.filter((_,i)=>i!==editing)))}]))}</View>:<>
    {p.customer.addresses.map((a,index)=><View key={index} style={{padding:18,backgroundColor:colors.glass,marginHorizontal:18,marginBottom:14,borderRadius:18,borderWidth:1,borderColor:colors.border,gap:7}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{alignSelf:'flex-start',paddingHorizontal:12,paddingVertical:6,borderRadius:12,backgroundColor:index===0?colors.selected:colors.secondary,fontSize:12}}>{index===0?'Default':`Address ${index+1}`}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Edit address ${index+1}`} onPress={()=>{setDraft(a);setEditing(index);}} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="create-outline" size={23}/></Pressable></View><Text style={{fontWeight:'700'}}>{a.firstName} {a.lastName}</Text>{[a.addressLine1,a.addressLine2,[a.city,a.state,a.postalCode].filter(Boolean).join(', '),p.countries.find(([code])=>code===a.countryCode)?.[1]||a.countryCode,a.phone].filter(Boolean).map((line,i)=><Text key={i} style={{fontSize:14,lineHeight:20}}>{line}</Text>)}{index>0&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void run(()=>saveAddresses([a,...p.customer!.addresses.filter((_,i)=>i!==index)]))} style={{minHeight:44,justifyContent:'center'}}><Text style={{fontSize:12,color:colors.accentInk}}>Make default</Text></Pressable>}</View>)}
    {p.customer.addresses.length<5?button('+  Add address',()=>{setDraft({...emptyAddress,email:p.customer!.email,countryCode:p.country});setEditing(-1);}):<Text style={{padding:16}}>Up to five saved addresses.</Text>}
  </>)}
  {panel==='Currency' &&<View style={{padding:12}}><CurrencyPicker/></View>}
  {panel==='Email subscriptions'&&<View style={{padding:16,gap:12}}><Text>Order and payment emails are separate from optional collection news.</Text>{p.customer&&button('Subscribe to collection news',()=>Alert.alert('Subscribe to email news?',`Send a confirmation email to ${p.customer!.email}?`,[{text:'Cancel',style:'cancel'},{text:'Subscribe',onPress:()=>void run(async()=>{await api('/api/subscriptions',{email:p.customer!.email,kind:'newsletter',consent:true});setMessage('Check your email to confirm your subscription.');})}]))}<Text>To stop collection news, use the unsubscribe link in a Vanta Noir email.</Text></View>}
  {panel==='Account security'&&(p.customer?<AccountSecurity email={p.customer.email} phone={p.customer.phone||''} onPhone={()=>open('Profile')}/>:<Text style={{padding:20}}>Sign in to manage account security.</Text>)}
  {panel==='About Vanta Noir'&&<View style={{paddingHorizontal:20,gap:14}}><PageTitle title="About Vanta Noir"/><AboutBrand onContact={()=>p.onHelp('contact')}/></View>}

  {panel==='Viewed'&&<>{p.viewed}{button('Clear browsing history',()=>Alert.alert('Clear browsing history?','Your bag, saved items and sign-in will be kept.',[{text:'Cancel',style:'cancel'},{text:'Clear',onPress:()=>void run(async()=>{await p.onClearViewed();setMessage('Browsing history cleared.');})}]))}</>}
 </Entrance>;
}
