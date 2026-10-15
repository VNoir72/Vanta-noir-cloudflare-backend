import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {Platform} from 'react-native';
import {api} from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:true,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true})});
export async function enablePush(owner?:string){
 if(Platform.OS==='web')throw Error('Enable phone push notifications in the installed Android app.');
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('orders',{name:'Order updates',importance:Notifications.AndroidImportance.DEFAULT});
 const permission=await Notifications.requestPermissionsAsync();
 if(!permission.granted)throw Error('Notifications are off in phone settings. Allow them there to receive order updates.');
 let token:string;
 try{token=(await Notifications.getExpoPushTokenAsync({projectId:Constants.easConfig?.projectId||Constants.expoConfig?.extra?.eas?.projectId})).data;}
 catch{throw Error('Push registration is not available in this build. Android Firebase configuration must be completed before notifications can be enabled.');}
 await api('/api/customer/push',{token});
 await AsyncStorage.setItem('vanta-push-token',token);
 if(owner)await AsyncStorage.setItem('vanta-order-push:'+owner,'on');
}
export async function disablePush(owner?:string){const token=await AsyncStorage.getItem('vanta-push-token');if(token)await api('/api/customer/push',{token},'DELETE');await AsyncStorage.removeItem('vanta-push-token');if(owner)await AsyncStorage.setItem('vanta-order-push:'+owner,'off');}

/** Register signed-in accounts by default, respecting explicit opt-out and OS permission. */
export async function registerDefaultOrderPush(owner:string){
 if(Platform.OS==='web')return;
 if(await AsyncStorage.getItem('vanta-order-push:'+owner)==='off')return;
 const permission=await Notifications.getPermissionsAsync();
 if(permission.granted){await enablePush(owner);return;}
 const asked='vanta-push-permission-requested';
 if(!permission.canAskAgain||await AsyncStorage.getItem(asked))return;
 await AsyncStorage.setItem(asked,'true');
 await enablePush(owner);
}
