import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, Pressable, View} from 'react-native';
import * as Network from 'expo-network';
import {Text, useTheme} from '../theme';
import {fetchWithTimeout} from '../fetch-with-timeout';
import {connectionStatus, type ConnectionStatus} from '../connection-status';

export function ConnectionNotice() {
  const {colors} = useTheme();
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [checking, setChecking] = useState(false);
  const [dismissed,setDismissed]=useState(false);
  useEffect(()=>{if(status==='online')return;const timer=setTimeout(()=>setDismissed(true),7000);return()=>clearTimeout(timer);},[status]);
  const generation = useRef(0);
  const check = useCallback(async () => {
    const request = ++generation.current;
    const [network, reachable] = await Promise.all([
      Network.getNetworkStateAsync().catch(() => undefined),
      fetchWithTimeout((process.env.EXPO_PUBLIC_API_URL || 'https://api.vantanoir.store').replace(/\/$/, '') + '/health', {cache: 'no-store'}, 8000)
        .then(async response => response.ok && (await response.json()).ok === true).catch(() => false),
    ]);
    if (request !== generation.current) return;
    if(reachable)setDismissed(false);
    setStatus(connectionStatus(reachable, network?.isConnected));
    setChecking(false);
  }, []);
  useEffect(() => {
    const counter = generation;
    const initial=setTimeout(()=>{void check();},0);
    const network = Network.addNetworkStateListener(() => { void check(); });
    const app = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    // Recover automatically after an outage without polling while backgrounded.
    const timer = setInterval(() => { if (AppState.currentState === 'active') void check(); }, 60000);
    return () => { counter.current++; clearTimeout(initial); network.remove(); app.remove(); clearInterval(timer); };
  }, [check]);
  if (status === 'online'||dismissed) return null;
  return <View accessibilityLiveRegion="polite" style={{position:'absolute',top:55,left:12,right:12,zIndex:100,borderRadius:12,paddingHorizontal:12, paddingVertical:8, backgroundColor:colors.surface, borderBottomWidth:1, borderColor:colors.border}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss connection notice" onPress={()=>setDismissed(true)} style={{alignSelf:'flex-end',padding:10}}><Text>Dismiss</Text></Pressable>
    <Text style={{fontWeight:'700'}}>{status === 'offline' ? 'You’re offline' : 'Can’t reach the store'}</Text>
    <Text style={{fontSize:12, color:colors.muted}}>Your bag is saved on this device. {status === 'offline' ? 'Reconnect to refresh stock and delivery.' : 'Check your connection or try again shortly.'}</Text>
    <Pressable accessibilityRole="button" disabled={checking} onPress={() => { setChecking(true); void check(); }} style={{minHeight:44, justifyContent:'center'}}>
      <Text style={{color:colors.accentInk}}>{checking ? 'Checking…' : 'Check connection'}</Text>
    </Pressable>
  </View>;
}
