import React, {useEffect, useState} from 'react';
import {AppState, Pressable, View} from 'react-native';
import * as Network from 'expo-network';
import {Text, useTheme} from '../theme';
import {fetchWithTimeout} from '../fetch-with-timeout';
import {connectionStatus, type ConnectionStatus} from '../connection-status';
import {storeReachedSince, subscribeStoreReachable} from '../store-reachability';

export function ConnectionNotice() {
  const {colors} = useTheme();
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (status === 'online') return;
    const timer = setTimeout(() => setDismissed(true), 7000);
    return () => clearTimeout(timer);
  }, [status]);
  useEffect(() => {
    let live = true, pending = false, failures = 0, firstFailure = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const recovered = () => {
      failures = 0; firstFailure = 0;
      if (retry) clearTimeout(retry);
      if (live) { setStatus('online'); setDismissed(false); }
    };
    const check = async () => {
      if (!live || pending || AppState.currentState !== 'active') return;
      pending = true;
      const started = Date.now();
      const [network, reachable] = await Promise.all([
        Network.getNetworkStateAsync().catch(() => undefined),
        fetchWithTimeout((process.env.EXPO_PUBLIC_API_URL || 'https://api.vantanoir.store').replace(/\/$/, '') + '/health', {cache:'no-store'}, 8000)
          .then(async response => response.ok && (await response.json()).ok === true).catch(() => false),
      ]);
      pending = false;
      if (!live || AppState.currentState !== 'active') return;
      if (reachable || storeReachedSince(started - 30_000)) { recovered(); return; }
      failures++;
      if (!firstFailure) firstFailure = Date.now();
      const next = connectionStatus(false, network?.isConnected);
      // Explicit disconnection is actionable. A transient timeout is not an outage.
      if (next === 'offline' || (failures >= 3 && Date.now() - firstFailure >= 15_000)) setStatus(next);
      if (retry) clearTimeout(retry);
      retry = setTimeout(() => { void check(); }, 8000);
    };
    const unsubscribe = subscribeStoreReachable(recovered);
    const initial = setTimeout(() => { void check(); }, 3000);
    const network = Network.addNetworkStateListener(() => { void check(); });
    const app = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    const timer = setInterval(() => { void check(); }, 60000);
    return () => { live = false; clearTimeout(initial); if (retry) clearTimeout(retry); unsubscribe(); network.remove(); app.remove(); clearInterval(timer); };
  }, []);
  if (status === 'online' || dismissed) return null;
  return <View accessibilityLiveRegion="polite" style={{position:'absolute',top:55,left:12,right:12,zIndex:100,borderRadius:12,paddingHorizontal:12,paddingVertical:8,backgroundColor:colors.surface,borderBottomWidth:1,borderColor:colors.border}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss connection notice" onPress={() => setDismissed(true)} style={{alignSelf:'flex-end',padding:10}}><Text>Dismiss</Text></Pressable>
    <Text style={{fontWeight:'700'}}>{status === 'offline' ? 'You’re offline' : 'Store temporarily unavailable'}</Text>
    <Text style={{fontSize:12,color:colors.muted}}>Your bag is saved. We’ll reconnect automatically.</Text>
  </View>;
}
