const {createFingerprintAsync}=require('@expo/fingerprint');
const expected='9829b16b33975c503904e03aebd352fa673a78ca';
async function verify(){
 if(process.env.APP_VARIANT!=='customer')throw Error('Build 32 updates must target the customer app.');
 const fingerprint=await createFingerprintAsync(process.cwd(),{platforms:['android']});
 if(fingerprint.hash!==expected)throw Error(`Refusing incompatible OTA: expected build 32 runtime ${expected}, got ${fingerprint.hash}.`);
 console.log(`Verified build 32 Android runtime: ${fingerprint.hash}`);
}
verify().catch(error=>{console.error(error.message);process.exitCode=1;});
