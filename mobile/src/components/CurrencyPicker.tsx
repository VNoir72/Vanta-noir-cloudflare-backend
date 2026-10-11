import React,{useEffect,useState} from 'react';
import currencyNames from '../currency-names.json';
import {Pressable,TextInput,View} from 'react-native';
import {Text,useTheme} from '../theme';
import {usePreferences,refreshCurrencies,savePreferences} from '../preferences';
export function CurrencyPicker(){
 const p=usePreferences(),{colors}=useTheme();const [query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=async()=>{setLoading(true);await refreshCurrencies();setLoading(false);};
 useEffect(()=>{void refreshCurrencies().finally(()=>setLoading(false));},[]);
 const [now]=useState(()=>Date.now());
 const names:Record<string,string>=currencyNames;
 const codes=Array.from(new Set(['NGN',p.currency,...Object.keys(p.rates),...Object.keys(names)]));
 return <View style={{gap:8}}><Text style={{fontSize:12,color:colors.muted}}>Browsing currency · checkout is charged in NGN.</Text><TextInput accessibilityLabel="Search currency by name or code" placeholder="Search currency, e.g. USD or dollar" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={{minHeight:44,borderRadius:24,borderWidth:1,borderColor:colors.border,paddingHorizontal:14,color:colors.text}}/>{loading&&<Text>Refreshing rates…</Text>}{!!error&&<Text accessibilityLiveRegion="polite">{error}</Text>}{(!p.rateAt||now-p.rateAt>48*3600000)&&<Pressable onPress={()=>void refresh()} style={{minHeight:44,justifyContent:'center'}}><Text>Rates unavailable. Prices stay in NGN until refreshed. Retry →</Text></Pressable>}{codes.sort().filter(c=>(c+' '+(names[c]||c)).toLowerCase().includes(query.toLowerCase())).map(c=><Pressable key={c} accessibilityRole="radio" accessibilityState={{checked:p.currency===c}} onPress={()=>{void savePreferences({currency:c}).catch(()=>setError('Could not save your currency. Please retry.'));}} style={{minHeight:44,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:colors.border,gap:8}}><Text style={{fontSize:13,width:38,fontWeight:'700'}}>{c}</Text><Text style={{flex:1,fontSize:12}}>{(names[c]||c)}</Text><Text>{p.currency===c?'●':'○'}</Text></Pressable>)}<Text style={{fontSize:11,color:colors.muted}}>ExchangeRate-API · {p.rateAt?new Date(p.rateAt).toLocaleDateString():'No verified rates yet'}. A currency without a current rate is saved as your preference; displayed prices remain clearly labelled NGN.</Text></View>;
}
