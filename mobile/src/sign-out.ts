import AsyncStorage from '@react-native-async-storage/async-storage';
import {api,vault} from './api';
import {firebaseSignOut} from './firebase-auth';

/** Remove local access first; remote cleanup must not keep an offline phone signed in. */
export async function signOutStore(){
 const session=await vault.get('session');
 const push=await AsyncStorage.getItem('vanta-push-token').catch(()=>null);
 await vault.remove('session');
 await Promise.allSettled([firebaseSignOut(),AsyncStorage.removeItem('vanta-push-token')]);
 if(session)void(async()=>{
  const headers={Authorization:'Bearer '+session};
  if(push)try{await api('/api/customer/push',{token:push},'DELETE',headers);}catch{/* Device is already signed out locally. */}
  try{await api('/api/customer/logout',{},'POST',headers);}catch{/* Offline sessions cannot be revoked remotely until reachable. */}
 })();
}
