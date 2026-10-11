import {getAuth,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut,signInWithCredential,GoogleAuthProvider} from '@react-native-firebase/auth';
import {GoogleSignin,isSuccessResponse} from '@react-native-google-signin/google-signin';
import {api,vault} from './api';
GoogleSignin.configure({webClientId:'78543560148-017c9ov5ja032ehpba0vebl8mj5d8igs.apps.googleusercontent.com'});
async function exchange(){const user=getAuth().currentUser;if(!user?.emailVerified)throw Error('Verify your email using the link we sent, then sign in again.');const result=await api<{token:string}>('/api/customer/firebase',{idToken:await user.getIdToken(true),acceptTerms:true});await vault.set('session',result.token);}
export async function passwordLogin(email:string,password:string,create:boolean){
 const auth=getAuth();
 const credential=create?await createUserWithEmailAndPassword(auth,email.trim(),password):await signInWithEmailAndPassword(auth,email.trim(),password);
 if(!credential.user.emailVerified){await sendEmailVerification(credential.user);await signOut(auth);return 'Check your email to verify your address, then choose Sign in.';}
 await exchange();return '';
}
export async function googleLogin(){await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});const response=await GoogleSignin.signIn();if(!isSuccessResponse(response))return false;if(!response.data.idToken)throw Error('Google could not verify this sign-in.');await signInWithCredential(getAuth(),GoogleAuthProvider.credential(response.data.idToken));await exchange();return true;}
export async function resetPassword(email:string){await sendPasswordResetEmail(getAuth(),email.trim());}
export async function firebaseSignOut(){try{await signOut(getAuth());await GoogleSignin.signOut();}catch{/* The store session is separately revoked. */}}
