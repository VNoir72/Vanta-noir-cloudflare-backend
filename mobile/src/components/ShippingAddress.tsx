import React, {useState} from 'react';
import {View,Text,TextInput,Pressable,StyleSheet,ScrollView} from 'react-native';
import {Address} from '../types';
export const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
export function addressErrors(a:Address):Partial<Record<keyof Address,string>> {
 const e:Partial<Record<keyof Address,string>>={};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim()))e.email='Enter a valid email for your receipt.';
 if(a.firstName.trim().length<2)e.firstName='Enter your first name.';
 if(a.lastName.trim().length<2)e.lastName='Enter your last name.';
 if(!/^(?:0[789]\d{9}|\+?234[789]\d{9})$/.test(a.phone.replace(/[\s()-]/g,'')))e.phone='Use 08012345678 or +2348012345678.';
 if(a.addressLine1.trim().length<5)e.addressLine1='Enter your house number and street.';
 if(a.city.trim().length<2)e.city='Enter your city or town.';
 if(!STATES.includes(a.state))e.state='Select your state.';
 if(a.postalCode && !/^\d{6}$/.test(a.postalCode.trim()))e.postalCode='Use a 6-digit Nigerian postal code, or leave blank.';
 return e;
}
export function ShippingAddress({value,onChange,onDone,signedIn,busy}:{value:Address;onChange:(a:Address)=>void;onDone:(a:Address)=>void;signedIn:boolean;busy:boolean}) {
 const [errors,setErrors]=useState<Partial<Record<keyof Address,string>>>({});
 const [statesOpen,setStatesOpen]=useState(false),[search,setSearch]=useState('');
 const change=(key:keyof Address,text:string)=>{onChange({...value,[key]:text});setErrors(e=>({...e,[key]:undefined}));};
 const field=(key:keyof Address,label:string,placeholder:string,keyboard:'default'|'email-address'|'phone-pad'|'number-pad'='default')=><View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value[key]} onChangeText={t=>change(key,t)} placeholder={placeholder} placeholderTextColor="#74816d" keyboardType={keyboard} autoCapitalize={keyboard==='email-address'?'none':'words'} autoCorrect={false} editable={!(key==='email'&&signedIn)} maxLength={key==='postalCode'?6:200} style={[s.input,errors[key]&&s.invalid]}/>{errors[key]&&<Text accessibilityLiveRegion="polite" style={s.error}>{errors[key]}</Text>}</View>;
 return <View style={s.card}>
  <Text style={s.title}>Delivery address</Text><Text style={s.caption}>Nigeria · Where should we send your order?</Text>
  <View style={s.row}>{field('firstName','First name','First name')}{field('lastName','Last name','Last name')}</View>
  {field('phone','Mobile number','08012345678','phone-pad')}
  <Text style={s.caption}>The courier may call this number to arrange delivery.</Text>
  {field('email','Email address','you@example.com','email-address')}
  {field('addressLine1','House number & street','House number, street name')}
  {field('addressLine2','Apartment / landmark (optional)','Flat, estate, nearby landmark')}
  <Text style={s.label}>State</Text>
  <Pressable accessibilityRole="button" accessibilityLabel="Select delivery state" accessibilityState={{expanded:statesOpen}} onPress={()=>setStatesOpen(!statesOpen)} style={[s.input,errors.state&&s.invalid]}><Text style={s.label}>{value.state||'Select a state'}  ▾</Text></Pressable>
  {errors.state&&<Text style={s.error}>{errors.state}</Text>}
  {statesOpen&&<View style={s.picker}><TextInput accessibilityLabel="Search states" placeholder="Search states" value={search} onChangeText={setSearch} style={s.input}/><ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{maxHeight:220}}>{STATES.filter(x=>x.toLowerCase().includes(search.toLowerCase())).map(state=><Pressable accessibilityRole="button" key={state} style={s.option} onPress={()=>{change('state',state);setStatesOpen(false);setSearch('');}}><Text style={s.label}>{state}{value.state===state?' ✓':''}</Text></Pressable>)}</ScrollView></View>}
  <View style={s.row}>{field('city','City / town','City or town')}{field('postalCode','Postal code (optional)','6 digits','number-pad')}</View>
  <Pressable accessibilityRole="button" disabled={busy} style={s.button} onPress={()=>{const e=addressErrors(value);setErrors(e);if(!Object.keys(e).length)onDone({...value,email:value.email.trim().toLowerCase(),firstName:value.firstName.trim(),lastName:value.lastName.trim(),phone:value.phone.replace(/[\s()-]/g,""),addressLine1:value.addressLine1.trim(),addressLine2:value.addressLine2.trim(),city:value.city.trim(),postalCode:value.postalCode.trim()});}}><Text style={s.buttonText}>Use this address →</Text></Pressable>
 </View>;
}
const s=StyleSheet.create({card:{backgroundColor:'rgba(252,253,250,.94)',borderRadius:24,padding:20,gap:12,borderWidth:1,borderColor:'#fff'},title:{fontSize:23,fontWeight:'700',color:'#172019'},caption:{fontSize:13,lineHeight:19,color:'#596752'},row:{flexDirection:'row',gap:12},field:{flexGrow:1,flexBasis:0,gap:7},label:{fontSize:14,fontWeight:'600',color:'#34442f'},input:{backgroundColor:'#f8faf6',borderWidth:1,borderColor:'#bbc8b4',borderRadius:14,padding:14,fontSize:16,minHeight:50,color:'#18221a'},invalid:{borderColor:'#a33434'},error:{color:'#9d2929',fontSize:13},picker:{gap:8,backgroundColor:'#edf3e7',borderRadius:14,padding:8},option:{padding:14,minHeight:48,borderBottomWidth:1,borderColor:'#dce4d5'},button:{padding:17,borderRadius:24,backgroundColor:'#c9f774',alignItems:'center',minHeight:50},buttonText:{fontWeight:'700',color:'#182214',fontSize:16}});
