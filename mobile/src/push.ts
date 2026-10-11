import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {Platform} from 'react-native';
import {api} from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:true,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true})});
export async function enablePush(){
 if(Platform.OS==='web')throw Error('Enable phone push notifications in the installed Android app.');
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('orders',{name:'Order updates',importance:Notifications.AndroidImportance.DEFAULT});
 const permission=await Notifications.requestPermissionsAsync();
 if(!permission.granted)throw Error('Notifications are off in phone settings. Allow them there to receive order updates.');
 let token:string;
 try{token=(await Notifications.getExpoPushTokenAsync({projectId:Constants.easConfig?.projectId||Constants.expoConfig?.extra?.eas?.projectId})).data;}
 catch{throw Error('Push registration is not available in this build. Android Firebase configuration must be completed before notifications can be enabled.');}
 await api('/api/customer/push',{token});
 await AsyncStorage.setItem('vanta-push-token',token);
}
export async function disablePush(){const token=await AsyncStorage.getItem('vanta-push-token');if(token)await api('/api/customer/push',{token},'DELETE');await AsyncStorage.removeItem('vanta-push-token');}
