export async function passwordLogin(_email:string,_password:string,_create:boolean):Promise<string>{throw Error('Open vantanoir.store/account to sign in on the website.');}
export async function googleLogin():Promise<boolean>{throw Error('Open vantanoir.store/account to sign in on the website.');}
export async function resetPassword(_email:string):Promise<void>{throw Error('Open vantanoir.store/account to sign in on the website.');}
export async function firebaseSignOut(){}

export async function appleLogin():Promise<boolean>{throw Error('Apple sign-in requires the iOS app.');}
export async function prepareFirebaseDeletion(_email:string){}

export function securityStatus(){return {verified:false,factors:[] as {uid:string;name:string;kind:string}[]};}
export function resolveSecondFactor(_error:unknown):null|{factors:{uid:string;name:string}[];confirm:(uid:string,code:string)=>Promise<void>}{return null;}
export async function beginAuthenticator():Promise<{key:string;confirm:(code:string)=>Promise<void>}>{throw Error('Authenticator setup requires the Android app.');}
export async function removeAuthenticator(_uid:string):Promise<void>{throw Error('Authenticator settings require the Android app.');}

export function watchPendingVerification(_callback:(email:string)=>void){return ()=>{};}
export async function resendVerification():Promise<void>{throw Error('Open the app to verify your email.');}
export async function finishVerification():Promise<boolean>{return false;}
