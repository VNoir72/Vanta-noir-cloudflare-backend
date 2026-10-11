import {requireOptionalNativeModule} from 'expo';
import {Platform} from 'react-native';
const bridge=requireOptionalNativeModule<{launch:(key:string,accessCode:string)=>Promise<'completed'|'closed'|'failed'>}>('VantaPaystack');
const publicKey=process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY||'';
// Public key only. Never place a Paystack secret key in app config or an Expo public variable.
export const cardSdkAvailable=Platform.OS==='android'&&!!bridge&&/^pk_(live|test)_[A-Za-z0-9]+$/.test(publicKey);
export async function launchCardSdk(accessCode:string){
 if(!cardSdkAvailable||!bridge)throw Error('Card payment is unavailable in this build.');
 return bridge.launch(publicKey,accessCode);
}
