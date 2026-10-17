import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {getAuth,getAdditionalUserInfo,onAuthStateChanged,multiFactor,getMultiFactorResolver,TotpMultiFactorGenerator,type MultiFactorError,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut,signInWithCredential,GoogleAuthProvider,AppleAuthProvider,reauthenticateWithCredential,revokeToken} from '@react-native-firebase/auth';
import {GoogleSignin,isSuccessResponse} from '@react-native-google-signin/google-signin';
import {api,vault} from './api';
import {trackAuth} from './monitoring';
let signInMethod:'email'|'google'|'apple'='email';
GoogleSignin.configure({webClientId:'78543560148-017c9ov5ja032ehpba0vebl8mj5d8igs.apps.googleusercontent.com'});
async function exchange(){const user=getAuth().currentUser;if(!user?.emailVerified)throw Error('Verify your email using the link we sent, then sign in again.');const result=await api<{token:string}>('/api/customer/firebase',{idToken:await user.getIdToken(true),acceptTerms:true});await vault.set('session',result.token);}
export async function passwordLogin(email:string,password:string,create:boolean){
 signInMethod='email';
 const auth=getAuth();
 const credential=create?await createUserWithEmailAndPassword(auth,email.trim(),password):await signInWithEmailAndPassword(auth,email.trim(),password);
 if(create)void trackAuth('sign_up','email');
 if(!credential.user.emailVerified){await api('/api/customer/email',{purpose:'verification',idToken:await credential.user.getIdToken(true)});return 'Open the verification link in your email, then return here.';}
 await exchange();void trackAuth('login','email');return '';
}
export async function googleLogin(){signInMethod='google';await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});const response=await GoogleSignin.signIn();if(!isSuccessResponse(response))return false;if(!response.data.idToken)throw Error('Google could not verify this sign-in.');const result=await signInWithCredential(getAuth(),GoogleAuthProvider.credential(response.data.idToken));if(getAdditionalUserInfo(result)?.isNewUser)void trackAuth('sign_up','google');await exchange();void trackAuth('login','google');return true;}
export async function resetPassword(email:string){await api('/api/customer/email',{purpose:'reset',email:email.trim()});}
export async function firebaseSignOut(){try{await signOut(getAuth());await GoogleSignin.signOut();}catch{/* The store session is separately revoked. */}}

async function appleCredential(){
 const nonce=Array.from(await Crypto.getRandomBytesAsync(32),b=>b.toString(16).padStart(2,'0')).join('');
 const response=await AppleAuthentication.signInAsync({requestedScopes:[AppleAuthentication.AppleAuthenticationScope.EMAIL],nonce:await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,nonce)});
 if(!response.identityToken)throw Error('Apple could not verify this sign-in.');
 return {credential:AppleAuthProvider.credential(response.identityToken,nonce),code:response.authorizationCode};
}
export async function appleLogin(){
 signInMethod='apple';
 try{const {credential}=await appleCredential();const result=await signInWithCredential(getAuth(),credential);if(getAdditionalUserInfo(result)?.isNewUser)void trackAuth('sign_up','apple');await exchange();void trackAuth('login','apple');return true;}
 catch(error){if((error as {code?:string}).code==='ERR_REQUEST_CANCELED')return false;throw error;}
}
export async function prepareFirebaseDeletion(email:string){
 const user=getAuth().currentUser;
 if(!user?.providerData.some(p=>p.providerId==='apple.com'))return;
 if(user.email?.toLowerCase()!==email.toLowerCase())throw Error('Sign in with the Apple account used for this store account before deleting it.');
 const {credential,code}=await appleCredential();
 if(!code)throw Error('Apple did not return an authorization code. Please try again.');
 await reauthenticateWithCredential(user,credential);
 await exchange();
 await revokeToken(getAuth(),code);
}

export function securityStatus(){const user=getAuth().currentUser;return {verified:!!user?.emailVerified,factors:user?multiFactor(user).enrolledFactors.map(f=>({uid:f.uid,name:f.displayName||'Authenticator',kind:f.factorId})):[]};}
export function resolveSecondFactor(error:unknown){
 if((error as {code?:string})?.code!=='auth/multi-factor-auth-required')return null;
 const resolver=getMultiFactorResolver(getAuth(),error as MultiFactorError);
 return {factors:resolver.hints.filter(h=>h.factorId==='totp').map(h=>({uid:h.uid,name:h.displayName||'Authenticator'})),confirm:async(uid:string,code:string)=>{await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(uid,code));await exchange();void trackAuth('login',signInMethod);}};
}
export async function beginAuthenticator(){const user=getAuth().currentUser;if(!user?.emailVerified)throw Error('Sign in again with a verified email first.');const secret=await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession());return {key:secret.secretKey,confirm:async(code:string)=>{await multiFactor(user).enroll(TotpMultiFactorGenerator.assertionForEnrollment(secret,code),'Vanta Noir authenticator');await exchange();}};}
export async function removeAuthenticator(uid:string){const user=getAuth().currentUser;if(!user)throw Error('Please sign in again.');await multiFactor(user).unenroll(uid);await exchange();}

// Keep the Firebase identity only; no store session is granted before verification.
export function watchPendingVerification(callback:(email:string)=>void){
 return onAuthStateChanged(getAuth(),user=>{if(user&&!user.emailVerified&&user.email)callback(user.email);});
}
export async function resendVerification(){
 const user=getAuth().currentUser;
 if(!user)throw Error('Your verification session expired. Go back and sign in again.');
 await api('/api/customer/email',{purpose:'verification',idToken:await user.getIdToken(true)});
}
export async function finishVerification(){
 const user=getAuth().currentUser;
 if(!user)throw Error('Your verification session expired. Go back and sign in again.');
 await user.reload();
 if(!getAuth().currentUser?.emailVerified)return false;
 await exchange();void trackAuth('login','email');return true;
}
