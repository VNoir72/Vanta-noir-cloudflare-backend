export async function passwordLogin(_email:string,_password:string,_create:boolean):Promise<string>{throw Error('Use an email code on this platform.');}
export async function googleLogin():Promise<boolean>{throw Error('Use an email code on this platform.');}
export async function resetPassword(_email:string):Promise<void>{throw Error('Use an email code on this platform.');}
export async function firebaseSignOut(){}

export async function appleLogin():Promise<boolean>{throw Error('Apple sign-in requires the iOS app.');}
export async function prepareFirebaseDeletion(_email:string){}
