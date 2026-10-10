import {postalCodeRequired,regionRequired,shippingCountryName} from "../shipping-countries";
import {api} from "../api";
import {Text,useTheme,Palette} from "../theme";
import React, {useEffect,useEffectEvent,useRef,useState} from 'react';
import {View,TextInput,Pressable,StyleSheet,ScrollView} from 'react-native';
import {Address} from '../types';
export const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
export function addressErrors(a:Address):Partial<Record<keyof Address,string>> {
 const e:Partial<Record<keyof Address,string>>={};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim()))e.email='Enter a valid email for your receipt.';
 if(a.firstName.trim().length<2)e.firstName='Enter your first name.';
 if(a.lastName.trim().length<2)e.lastName='Enter your last name.';
 if(a.countryCode==='NG'&&!/^(?:0[789]\d{9}|\+?234[789]\d{9})$/.test(a.phone.replace(/[\s()-]/g,'')))e.phone='Use 08012345678 or +2348012345678.';
 if(a.addressLine1.trim().length<5)e.addressLine1='Enter your house number and street.';
 if(a.city.trim().length<2)e.city='Enter your city or town.';
 if(a.countryCode!=='NG'&&!/^\+?[0-9 ()-]{7,30}$/.test(a.phone))e.phone='Enter your phone number with country calling code.';
 if(a.countryCode==='NG'&&!STATES.includes(a.state))e.state='Select your state.';
 if(a.countryCode!=='NG'&&regionRequired(a.countryCode)&&!a.state.trim())e.state='Enter your state or province.';
 if(postalCodeRequired(a.countryCode)&&!a.postalCode.trim())e.postalCode='Enter your destination postal code.';
 if(a.countryCode==='NG'&&a.postalCode && !/^\d{6}$/.test(a.postalCode.trim()))e.postalCode='Use a 6-digit Nigerian postal code, or leave blank.';
 return e;
}
export function ShippingAddress({value,onChange,onDone,signedIn,busy,countries=[["NG","Nigeria"]]}:{value:Address;onChange:(a:Address)=>void;onDone:(a:Address)=>void;signedIn:boolean;busy:boolean;countries?:readonly (readonly [string,string])[]}) {
 const {colors}=useTheme(); const s=styles(colors);
 const [errors,setErrors]=useState<Partial<Record<keyof Address,string>>>({});
 const [countryOpen,setCountryOpen]=useState(false),[countrySearch,setCountrySearch]=useState('');
 const [postalNote,setPostalNote]=useState('');const autoPostal=useRef(false);
 const applyAddress=useEffectEvent((snapshot:Address,found:{postalCode?:string;city?:string;state?:string})=>onChange({...snapshot,postalCode:snapshot.postalCode||found.postalCode||'',city:snapshot.city||found.city||'',state:snapshot.state||(snapshot.countryCode!=='NG'?found.state||'':'')}));
 const lookupKey=JSON.stringify(value);const lastLookup=useRef('');
 useEffect(()=>{const snapshot:Address=JSON.parse(lookupKey);const errors=addressErrors(snapshot);delete errors.postalCode;delete errors.city;if(snapshot.countryCode!=='NG')delete errors.state;if(Object.keys(errors).length||(snapshot.postalCode&&snapshot.city&&(!regionRequired(snapshot.countryCode)||snapshot.state))||lastLookup.current===lookupKey)return;let active=true;const timer=setTimeout(()=>{lastLookup.current=lookupKey;void api<{postalCode:string;city:string;state:string}>('/api/shipping/address',snapshot).then(found=>{if(active){autoPostal.current=Boolean(!snapshot.postalCode&&found.postalCode);applyAddress(snapshot,found);setPostalNote('Address checked. Please review the completed details.');}}).catch(()=>{if(active)setPostalNote('Enter missing details manually. Postcode is optional for Nigeria.');});},1100);return()=>{active=false;clearTimeout(timer);};},[lookupKey]);
 const [statesOpen,setStatesOpen]=useState(false),[search,setSearch]=useState('');
 const change=(key:keyof Address,text:string)=>{const reset=autoPostal.current&&['addressLine1','addressLine2','city','state','countryCode'].includes(key);if(reset||key==='postalCode'){autoPostal.current=false;setPostalNote('');}onChange({...value,...(reset?{postalCode:''}:{}),[key]:text});setErrors(e=>({...e,[key]:undefined}));};
 const field=(key:keyof Address,label:string,placeholder:string,keyboard:'default'|'email-address'|'phone-pad'|'number-pad'='default')=><View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value[key]} onChangeText={t=>change(key,t)} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboard} autoCapitalize={keyboard==='email-address'?'none':'words'} autoCorrect={false} editable={!(key==='email'&&signedIn)} maxLength={key==='postalCode'?32:200} style={[s.input,errors[key]&&s.invalid]}/>{errors[key]&&<Text accessibilityLiveRegion="polite" style={s.error}>{errors[key]}</Text>}</View>;
 return <View style={s.card}>
  <Text style={s.title}>Delivery address</Text><Text style={s.caption}>{shippingCountryName(value.countryCode)} · Where should we send your order?</Text>
  <Text style={s.label}>Country</Text><Pressable accessibilityRole="button" accessibilityLabel="Select delivery country" onPress={()=>setCountryOpen(!countryOpen)} style={s.input}><Text>{shippingCountryName(value.countryCode)} ▾</Text></Pressable>
  {countryOpen&&<View style={s.picker}><TextInput accessibilityLabel="Search countries" value={countrySearch} onChangeText={setCountrySearch} placeholder="Search countries" style={s.input}/><ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{maxHeight:220}}>{countries.filter(([,name])=>name.toLowerCase().includes(countrySearch.toLowerCase())).map(([code,name])=><Pressable accessibilityRole="button" accessibilityLabel={name} key={code} style={s.option} onPress={()=>{onChange({...value,countryCode:code,state:'',postalCode:''});setCountryOpen(false);setStatesOpen(false);setErrors({});setPostalNote('');autoPostal.current=false;}}><Text>{name}{value.countryCode===code?' ✓':''}</Text></Pressable>)}</ScrollView></View>}
  <View style={s.row}>{field('firstName','First name','First name')}{field('lastName','Last name','Last name')}</View>
  {field('phone','Mobile number',value.countryCode==='NG'?'08012345678':'+1 202 555 0100','phone-pad')}
  <Text style={s.caption}>The courier may call this number to arrange delivery.</Text>
  {field('email','Email address','you@example.com','email-address')}
  {field('addressLine1','House number & street','House number, street name')}
  {field('addressLine2','Apartment / landmark (optional)','Flat, estate, nearby landmark')}
  {value.countryCode==='NG'?<><Text style={s.label}>State</Text>
  <Pressable accessibilityRole="button" accessibilityLabel="Select delivery state" accessibilityState={{expanded:statesOpen}} onPress={()=>setStatesOpen(!statesOpen)} style={[s.input,errors.state&&s.invalid]}><Text style={s.label}>{value.state||'Select a state'}  ▾</Text></Pressable>
  {errors.state&&<Text style={s.error}>{errors.state}</Text>}
  {statesOpen&&<View style={s.picker}><TextInput accessibilityLabel="Search states" placeholder="Search states" value={search} onChangeText={setSearch} style={s.input}/><ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{maxHeight:220}}>{STATES.filter(x=>x.toLowerCase().includes(search.toLowerCase())).map(state=><Pressable accessibilityRole="button" key={state} style={s.option} onPress={()=>{change('state',state);setStatesOpen(false);setSearch('');}}><Text style={s.label}>{state}{value.state===state?' ✓':''}</Text></Pressable>)}</ScrollView></View>}
  </>:field('state',regionRequired(value.countryCode)?'State / province':'State / region (optional)','State or province')}
  <View style={s.row}>{field('city','City / town','City or town')}{field('postalCode',postalCodeRequired(value.countryCode)?'Postal / ZIP code':'Postal code (optional)',value.countryCode==='NG'?'Automatic lookup':'Postal / ZIP code',value.countryCode==='NG'?'number-pad':'default')}</View>
  {postalNote!==''&&<Text style={s.caption}>{postalNote}</Text>}
  <Pressable accessibilityRole="button" disabled={busy} style={s.button} onPress={()=>{const e=addressErrors(value);setErrors(e);if(!Object.keys(e).length)onDone({...value,email:value.email.trim().toLowerCase(),firstName:value.firstName.trim(),lastName:value.lastName.trim(),phone:value.phone.replace(/[\s()-]/g,""),addressLine1:value.addressLine1.trim(),addressLine2:value.addressLine2.trim(),city:value.city.trim(),postalCode:value.postalCode.trim()});}}><Text style={s.buttonText}>Use this address →</Text></Pressable>
 </View>;
}
const styles=(colors:Palette)=>StyleSheet.create({card:{backgroundColor:colors.glass,borderRadius:24,padding:20,gap:12,borderWidth:1,borderColor:colors.border},title:{fontSize:23,fontWeight:'700',color:colors.text},caption:{fontSize:13,lineHeight:19,color:colors.muted},row:{flexDirection:'row',gap:12},field:{flexGrow:1,flexBasis:0,gap:7},label:{fontSize:14,fontWeight:'600',color:colors.text},input:{backgroundColor:colors.input,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:14,fontSize:16,minHeight:50,color:colors.text},invalid:{borderColor:'#a33434'},error:{color:colors.danger,fontSize:13},picker:{gap:8,backgroundColor:colors.secondary,borderRadius:14,padding:8},option:{padding:14,minHeight:48,borderBottomWidth:1,borderColor:colors.border},button:{padding:17,borderRadius:24,backgroundColor:'#c9f774',alignItems:'center',minHeight:50},buttonText:{fontWeight:'700',color:'#182214',fontSize:16}});
