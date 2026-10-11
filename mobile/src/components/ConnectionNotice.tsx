import React,{useEffect,useState} from 'react';
import {Pressable,View} from 'react-native';
import * as Network from 'expo-network';
import {Text,useTheme} from '../theme';
export function ConnectionNotice(){
 const {colors}=useTheme();const [offline,setOffline]=useState(false),[checking,setChecking]=useState(false);
 const update=(n:Network.NetworkState)=>setOffline(n.isConnected===false||n.isInternetReachable===false);
 useEffect(()=>{let live=true;void Network.getNetworkStateAsync().then(n=>{if(live)update(n);}).catch(()=>{});const sub=Network.addNetworkStateListener(update);return()=>{live=false;sub.remove();};},[]);
 if(!offline)return null;
 return <View accessibilityLiveRegion="polite" style={{padding:12,backgroundColor:colors.notice}}><Text style={{fontWeight:'700'}}>You’re offline</Text><Text style={{fontSize:12}}>Your saved bag stays on this device. Reconnect to refresh stock, delivery and payment status.</Text><Pressable accessibilityRole="button" disabled={checking} onPress={()=>{setChecking(true);void Network.getNetworkStateAsync().then(update).catch(()=>{}).finally(()=>setChecking(false));}} style={{minHeight:44,justifyContent:'center'}}><Text>{checking?'Checking…':'Check connection'}</Text></Pressable></View>;
}
