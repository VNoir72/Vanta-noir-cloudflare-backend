import {useEffect} from 'react';
import {AppState} from 'react-native';
import * as Updates from 'expo-updates';

/** Download quietly. Apply on the next normal launch, preserving this session. */
export function BackgroundUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let live = true, pending = false, lastCheck = 0;
    async function check() {
      if (!live || pending || AppState.currentState !== 'active' || Date.now() - lastCheck < 15 * 60_000) return;
      pending = true;
      lastCheck = Date.now();
      try {
        const update = await Updates.checkForUpdateAsync();
        if (live && update.isAvailable) await Updates.fetchUpdateAsync();
      } catch { /* Keep the installed update and the current screen on failure. */ }
      finally { pending = false; }
    }
    const initial = setTimeout(() => { void check(); }, 15_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    const interval = setInterval(() => { void check(); }, 15 * 60_000);
    return () => { live = false; clearTimeout(initial); clearInterval(interval); subscription.remove(); };
  }, []);
  return null;
}
