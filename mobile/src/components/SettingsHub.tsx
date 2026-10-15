import {AboutBrand} from './AboutBrand';
import {BrandHeader,PageTitle} from './AppChrome';
import {AccountSecurity} from './AccountSecurity';
import {ActivityPreference,PhoneVerification,CircleMembership} from './GrowthExperience';
import {monitoringChoice,saveMonitoring,MonitoringChoice} from '../monitoring';
import {Entrance} from './Motion';
import {CurrencyPicker} from './CurrencyPicker';
import {useBrandDialog} from './BrandDialog';
import {enablePush,disablePush} from "../push";
import {usePreferences,savePreferences,refreshCurrencies} from "../preferences";
import React,{useEffect,useState} from 'react';
import {Image,Linking,Pressable,TextInput,View} from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Text,Icon,useTheme} from '../theme';
import {Address,Customer,emptyAddress} from '../types';
import {api} from '../api';
import {ShippingAddress} from './ShippingAddress';

type Props={initialPanel?:string;customer:Customer|null;onSave:(next:Customer)=>Promise<void>;onBack:()=>void;onLogout:()=>void;onDelete:()=>void;onHelp:(topic:string)=>void;onCountry:()=>void;country:string;countries:readonly (readonly [string,string])[];viewed:React.ReactNode;onClearViewed:()=>Promise<void>;autoplay:boolean;onAutoplay:(value:boolean)=>Promise<void>};
export function SettingsHub(p:Props){
 const Alert=useBrandDialog();
 const preferences=usePreferences();
 const [monitoring,setMonitoring]=useState<MonitoringChoice>({analytics:false,diagnostics:false});
 useEffect(()=>{void monitoringChoice().then(setMonitoring);},[]);
 const {colors,appearance,setAppearance}=useTheme();
 const [moreSettings,setMoreSettings]=useState(false);
 const [panel,setPanel]=useState(p.initialPanel||'Settings'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[name,setName]=useState(p.customer?.name||''),[phone,setPhone]=useState(p.customer?.phone||'');
 const [extra,setExtra]=useState({photo:'',gender:'',birthday:''});
 const [profileField,setProfileField]=useState<'Nickname'|'Birthday'|'Phone'|null>(null),[editing,setEditing]=useState<number|null>(null),[draft,setDraft]=useState<Address>(emptyAddress);
 const key='vanta-profile-device:'+p.customer?.email;
 useEffect(()=>{let live=true;AsyncStorage.getItem(key).then(v=>{if(live&&v)setExtra(JSON.parse(v));}).catch(()=>{});return()=>{live=false;};},[key]);
 const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}};
 const open=(s:string)=>{setPanel(s);setMessage('');setEditing(null);setProfileField(null);};
 const icons:Record<string,React.ComponentProps<typeof Icon>['name']>={'Theme':'moon-outline','Country':'globe-outline','Image quality':'image-outline','Security':'lock-closed-outline','Appearance':'contrast-outline','Account security':'shield-checkmark-outline','Help & support':'headset-outline','About Vanta Noir':'information-circle-outline','Vanta Circle':'star-outline','Verify phone':'call-outline','Profile':'person-circle-outline','Shipping address':'location-outline','Ship to':'globe-outline','Currency':'cash-outline','General settings':'options-outline','Notification settings':'notifications-outline','Viewed':'eye-outline','Privacy & diagnostics':'shield-checkmark-outline','App suggestion':'help-circle-outline','Privacy policy':'document-text-outline','Legal information':'document-text-outline','Delete account':'trash-outline','App video preferences':'play-outline'};
 const row=(label:string,value:string,action:()=>void)=><Pressable key={label} accessibilityRole="button" disabled={busy} onPress={action} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:62,paddingVertical:14,paddingHorizontal:16,marginHorizontal:18,marginBottom:10,borderRadius:16,backgroundColor:colors.glass,borderWidth:1,borderColor:colors.border}}><Icon name={icons[label]||'options-outline'} size={21} color={label==='Delete account'?colors.danger:colors.text}/><Text style={{flex:1,fontSize:15,color:label==='Delete account'?colors.danger:colors.text}}>{label}</Text>{value!==''&&<Text numberOfLines={1} style={{fontSize:13,color:colors.muted,maxWidth:'50%'}}>{value}</Text>}<Icon name="chevron-forward" size={18}/></Pressable>;
 const section=(title:string)=><Text accessibilityRole="header" style={{fontSize:11,letterSpacing:1.5,fontWeight:'700',color:colors.muted,paddingHorizontal:16,paddingTop:24,paddingBottom:10}}>{title}</Text>;
 const gap=<View style={{height:10}}/>;
 const button=(label:string,action:()=>void)=><Pressable disabled={busy} onPress={action} style={{padding:15,margin:16,borderRadius:25,backgroundColor:colors.accent,alignItems:'center'}}><Text style={{fontWeight:'700',color:colors.accentInk}}>{label}</Text></Pressable>;
 const input=(label:string,value:string,change:(v:string)=>void)=><View style={{padding:16,gap:8,backgroundColor:colors.surface}}><Text>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change} style={{padding:12,minHeight:44,borderWidth:1,borderColor:colors.border,borderRadius:10,color:colors.text}}/></View>;
 const info=(title:string,body:string)=>Alert.alert(title,body);
 const saveAddresses=async(addresses:Address[])=>{if(!p.customer)return;await p.onSave({...p.customer,addresses});setEditing(null);setMessage('Addresses saved.');};
 const choosePhoto=()=>void run(async()=>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.35,base64:true});if(!result.canceled&&result.assets[0].base64){if(result.assets[0].base64.length>1500000)throw Error('Please choose a smaller photo.');const next={...extra,photo:'data:image/jpeg;base64,'+result.assets[0].base64};await AsyncStorage.setItem(key,JSON.stringify(next));setExtra(next);}});
 return <Entrance transitionKey={panel} style={{backgroundColor:colors.page,minHeight:400}}>
  <BrandHeader title={['Vanta Circle','Account security','About Vanta Noir'].includes(panel)?undefined:panel==='Shipping address'?'Saved addresses':panel} action={panel==='Settings'?<Pressable accessibilityRole="button" accessibilityLabel="More settings" onPress={()=>setMoreSettings(!moreSettings)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="ellipsis-horizontal" size={22}/></Pressable>:undefined} onBack={()=>panel==='Settings'?p.onBack():open('Settings')}/><View style={{height:20}}/>
  {!!message&&<Text accessibilityLiveRegion="polite" style={{padding:16}}>{message}</Text>}
  {panel==='Settings'&&<>
    {row('Theme',appearance==='system'?'System':appearance==='dark'?'Dark':'Light',()=>open('Appearance'))}
    {row('Country',p.countries.find(([code])=>code===p.country)?.[1]||p.country,p.onCountry)}
    {row('Currency',preferences.currency,()=>{open('Currency');void refreshCurrencies();})}
    {row('Image quality',preferences.imageQuality==='smart'?'Auto':preferences.imageQuality,()=>open('App image quality'))}
    {row('Security','',()=>open('Account security'))}
    {row('Help & support','',()=>p.onHelp('contact'))}
    {p.customer&&row('Delete account','',p.onDelete)}
    <View style={{padding:18,marginHorizontal:18,marginTop:4,borderRadius:16,borderWidth:1,borderColor:colors.border,gap:8}}><Text style={{fontSize:13,fontWeight:'600'}}>Currency set by country</Text><Text style={{fontSize:12,lineHeight:18,color:colors.muted}}>We set your currency automatically based on your selected country.</Text>{[['Nigeria','NGN'],['United States','USD'],['United Kingdom','GBP']].map(([label,currency])=><View key={currency} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:4}}><Text style={{fontSize:13}}>{label}</Text><Text style={{fontSize:13}}>→   {currency}</Text></View>)}</View>{moreSettings&&<>{section('MORE SETTINGS')}
    {row('Vanta Circle','',()=>open('Vanta Circle'))}{row('Profile','',()=>open('Profile'))}{row('Notification settings','',()=>open('Notification settings'))}
    {row('General settings','Media & browsing',()=>open('General settings'))}
    {row('Privacy & diagnostics','',()=>open('Privacy & diagnostics'))}
    {row('About Vanta Noir','',()=>open('About Vanta Noir'))}{row('Drop calendar','',()=>p.onHelp('calendar'))}
    {p.customer&&button('Sign out',p.onLogout)}
    <Text style={{textAlign:'center',fontSize:11,color:colors.muted,padding:18}}>VANTA NOIR · {Constants.expoConfig?.version}</Text></>}
  </>}
  {panel==='Vanta Circle'&&p.customer&&<CircleMembership/>}{panel==='Verify phone'&&p.customer&&<PhoneVerification/>}
  {panel==='Profile'&&(!p.customer?<Text style={{padding:20}}>Sign in from You to manage your profile.</Text>:<>
    <Pressable onPress={choosePhoto} style={{padding:16,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text>Photo</Text>{extra.photo?<Image source={{uri:extra.photo}} style={{width:54,height:54,borderRadius:27}}/>:<Icon name="person-circle-outline" size={54}/>}</Pressable>{gap}
    {row('Account information',p.customer.email,()=>info('Account information',`Your account works on the app and website. Email: ${p.customer!.email}\nContact support for account email changes.`))}
    {row('Nickname',p.customer.name||'Not set',()=>setProfileField(profileField==='Nickname'?null:'Nickname'))}{profileField==='Nickname'&&<>{input('Nickname',name,setName)}{button('Save nickname',()=>void run(async()=>{if(!name.trim())throw Error('Enter your name.');await p.onSave({...p.customer!,name:name.trim()});setMessage('Profile saved.');setProfileField(null);}))}</>}
    {row('Gender',extra.gender||'Not set',()=>Alert.alert('Gender','Optional; saved on this device.',[{text:'Woman',onPress:()=>setExtra({...extra,gender:'Woman'})},{text:'Man',onPress:()=>setExtra({...extra,gender:'Man'})},{text:'Prefer not to say',onPress:()=>setExtra({...extra,gender:'Prefer not to say'})}]))}
    {row('Phone number',p.customer.phone||'Not set',()=>setProfileField(profileField==='Phone'?null:'Phone'))}{profileField==='Phone'&&<>{input('Phone number including country code',phone,setPhone)}{button('Save phone number',()=>void run(async()=>{if(!/^\+?[0-9 ()-]{7,30}$/.test(phone.trim()))throw Error('Enter a valid phone number.');await p.onSave({...p.customer!,phone:phone.trim()});setMessage('Contact number saved.');setProfileField(null);}))}</>}
    {row('Birthday',extra.birthday||'Not set',()=>setProfileField(profileField==='Birthday'?null:'Birthday'))}{profileField==='Birthday'&&input('Birthday (YYYY-MM-DD, optional)',extra.birthday,v=>setExtra({...extra,birthday:v}))}{row('Country/region',p.country,p.onCountry)}
    {button('Save device profile details',()=>void run(async()=>{if(extra.birthday&&(!/^\d{4}-\d{2}-\d{2}$/.test(extra.birthday)||!Number.isFinite(Date.parse(extra.birthday))||new Date(extra.birthday).toISOString().slice(0,10)!==extra.birthday||Date.parse(extra.birthday)>Date.now()))throw Error('Enter a valid birthday in YYYY-MM-DD format.');await AsyncStorage.setItem(key,JSON.stringify(extra));setMessage('Photo, gender and birthday saved on this device.');}))}
    <Text style={{padding:16,color:colors.muted}}>Nickname and addresses sync to your account. Photo, gender and birthday are currently stored on this device only.</Text>
    {row('Sign-in security','Sign-in options',()=>info('Sign-in security','Use Continue with Google or email and password from the sign-in screen. Never share your password or verification code.'))}
  </>)}
  {panel==='Shipping address'&&(!p.customer?<Text style={{padding:20}}>Sign in to save addresses.</Text>:editing!==null?<View style={{padding:16}}><ShippingAddress value={draft} onChange={setDraft} signedIn busy={busy} countries={p.countries} onDone={a=>void run(async()=>{const list=[...p.customer!.addresses];if(editing===-1)list.push(a);else list[editing]=a;await saveAddresses(list);})}/>{button('Cancel',()=>setEditing(null))}{editing>=0&&button('Delete address',()=>Alert.alert('Delete address?','Remove this saved address?', [{text:'Keep',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void run(()=>saveAddresses(p.customer!.addresses.filter((_,i)=>i!==editing)))}]))}</View>:<>
    {p.customer.addresses.map((a,index)=><View key={index} style={{padding:18,backgroundColor:colors.glass,marginHorizontal:18,marginBottom:14,borderRadius:18,borderWidth:1,borderColor:colors.border,gap:7}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{alignSelf:'flex-start',paddingHorizontal:12,paddingVertical:6,borderRadius:12,backgroundColor:index===0?colors.selected:colors.secondary,fontSize:12}}>{index===0?'Default':`Address ${index+1}`}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Edit address ${index+1}`} onPress={()=>{setDraft(a);setEditing(index);}} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="create-outline" size={23}/></Pressable></View><Text style={{fontWeight:'700'}}>{a.firstName} {a.lastName}</Text>{[a.addressLine1,a.addressLine2,[a.city,a.state,a.postalCode].filter(Boolean).join(', '),p.countries.find(([code])=>code===a.countryCode)?.[1]||a.countryCode,a.phone].filter(Boolean).map((line,i)=><Text key={i} style={{fontSize:14,lineHeight:20}}>{line}</Text>)}{index>0&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void run(()=>saveAddresses([a,...p.customer!.addresses.filter((_,i)=>i!==index)]))} style={{minHeight:44,justifyContent:'center'}}><Text style={{fontSize:12,color:colors.accentInk}}>Make default</Text></Pressable>}</View>)}
    {p.customer.addresses.length<5?button('+  Add address',()=>{setDraft({...emptyAddress,email:p.customer!.email,countryCode:p.country});setEditing(-1);}):<Text style={{padding:16}}>Up to five saved addresses.</Text>}
  </>)}
  {panel==='Privacy & diagnostics'&&<>{p.customer&&<ActivityPreference/>}<Text style={{padding:16}}>Optional usage analytics and crash reports help improve Vanta Noir. These reports go to Google Firebase. We do not add your email, address, payment details or search text to analytics. You can turn either option off at any time.</Text>{row('Usage analytics',monitoring.analytics?'On':'Off',()=>void run(async()=>{const next={...monitoring,analytics:!monitoring.analytics};await saveMonitoring(next);setMonitoring(next);} ))}{row('Crash diagnostics',monitoring.diagnostics?'On':'Off',()=>void run(async()=>{const next={...monitoring,diagnostics:!monitoring.diagnostics};await saveMonitoring(next);setMonitoring(next);} ))}</>}
  {panel==='Currency' &&<View style={{padding:12}}><CurrencyPicker/></View>}
  {panel==='App image quality'&&<>{row('Smart quality','Adapts to connection',()=>void run(()=>savePreferences({imageQuality:'smart'})))}{row('High quality','Suitable for Wi-Fi',()=>void run(()=>savePreferences({imageQuality:'high'})))}{row('Normal quality','Suitable for 3G / 2G',()=>void run(()=>savePreferences({imageQuality:'normal'})))}<Text style={{padding:16}}>Selected: {preferences.imageQuality}. Applies where optimized image sizes are available.</Text></>}
  {panel==='Appearance'&&(['system','light','dark'] as const).map(mode=>row(mode==='system'?'Follow device':mode,appearance===mode?'✓':'',()=>void run(()=>setAppearance(mode))))}
  {panel==='Notification settings'&&<>{row('Push notifications','',()=>open('Push notifications'))}{row('Email subscriptions','',()=>open('Email subscriptions'))}</>}
  {panel==='Push notifications'&&<><Text style={{padding:16}}>Receive payment and delivery updates on your phone. Sign in to link this device to your account.</Text>{button('Enable order notifications',()=>void run(async()=>{if(!p.customer)throw Error('Please sign in first.');await enablePush();setMessage('This device is registered for order notifications.');}))}{button('Disable order notifications',()=>void run(async()=>{await disablePush();setMessage('Order notifications disabled for this device.');}))}{row('Phone notification settings','',()=>void Linking.openSettings())}</>}
  {panel==='Email subscriptions'&&<View style={{padding:16,gap:12}}><Text>Order and payment emails are separate from optional collection news.</Text>{p.customer&&button('Subscribe to collection news',()=>Alert.alert('Subscribe to email news?',`Send a confirmation email to ${p.customer!.email}?`,[{text:'Cancel',style:'cancel'},{text:'Subscribe',onPress:()=>void run(async()=>{await api('/api/subscriptions',{email:p.customer!.email,kind:'newsletter',consent:true});setMessage('Check your email to confirm your subscription.');})}]))}<Text>To stop collection news, use the unsubscribe link in a Vanta Noir email.</Text></View>}
  {panel==='General settings'&&<>
   {section('MEDIA & CONNECTION')}{row('App image quality',preferences.imageQuality,()=>open('App image quality'))}{row('App video preferences',p.autoplay?'Autoplay muted':'Tap to play',()=>open('App video preferences'))}{row('Network acceleration',preferences.acceleration?'On':'Off',()=>open('Network acceleration'))}
   {section('BROWSING')}{row('Viewed','Recently viewed pieces',()=>open('Viewed'))}{row('Clear browsing history','',()=>Alert.alert('Clear browsing history?','Your bag, saved items and sign-in will be kept.',[{text:'Cancel',style:'cancel'},{text:'Clear',onPress:()=>void run(async()=>{await p.onClearViewed();setMessage('Browsing history cleared.');})}]))}
   {row('Language','English',()=>info('Language','English is currently the supported app language.'))}{row('Phone app settings','',()=>void Linking.openSettings().catch(()=>setMessage('Open your phone Settings manually.')))}
  </>}
  {panel==='Account security'&&(p.customer?<AccountSecurity email={p.customer.email} phone={p.customer.phone||''} onPhone={()=>open('Profile')}/>:<Text style={{padding:20}}>Sign in to manage account security.</Text>)}
  {panel==='About Vanta Noir'&&<View style={{paddingHorizontal:20,gap:14}}><PageTitle title="About Vanta Noir"/><AboutBrand onContact={()=>p.onHelp('contact')}/></View>}

  {panel==='App video preferences'&&<>{row('Autoplay muted',p.autoplay?'✓':'',()=>void run(()=>p.onAutoplay(true)))}{row('Tap to play',!p.autoplay?'✓':'',()=>void run(()=>p.onAutoplay(false)))}</>}
  {panel==='Network acceleration'&&<View style={{padding:16,gap:12}}><Text style={{fontWeight:'700'}}>Intelligent network acceleration</Text><Text>If Wi-Fi cannot load the catalogue, allow the Android app to retry using mobile data. Your phone must have mobile data available. Data charges may apply. Payment and account requests are never automatically repeated through this fallback.</Text>{row('Use mobile data when Wi-Fi is weak',preferences.acceleration?'On':'Off',()=>void run(()=>savePreferences({acceleration:!preferences.acceleration})))}{button('Test store connection',()=>void run(async()=>{const start=Date.now();await api('/health');setMessage(`Store reached in ${Date.now()-start} ms.`);}))}</View>}
  {panel==='Viewed'&&p.viewed}
 </Entrance>;
}
