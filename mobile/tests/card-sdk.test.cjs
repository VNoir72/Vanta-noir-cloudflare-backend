const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/card-sdk.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function load({key='',platform='android',bridge=null}){
 const exports={};
 vm.runInNewContext(code,{exports,process:{env:{EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY:key}},require:id=>id==='expo'?{requireOptionalNativeModule:()=>bridge}:{Platform:{OS:platform}}});
 return exports;
}
test('card availability requires the public key and Android native bridge',async()=>{
 const calls=[];const bridge={launch:async(...args)=>{calls.push(args);return 'completed';}};
 for(const config of [{bridge},{key:'sk_live_notapublickey',bridge},{key:'pk_live_example',bridge,platform:'web'},{key:'pk_live_example'}]){
  const sdk=load(config);assert.equal(sdk.cardSdkAvailable,false);await assert.rejects(()=>sdk.launchCardSdk('access'));
 }
 const sdk=load({key:'pk_live_example',bridge});assert.equal(sdk.cardSdkAvailable,true);assert.equal(await sdk.launchCardSdk('access-code'),'completed');assert.deepEqual(calls,[['pk_live_example','access-code']]);
});
test('reference APK uses configured payment environment and preview update channel',()=>{
 const d=JSON.parse(fs.readFileSync('eas.json','utf8'));assert.equal(d.build['reference-review'].environment,'production');assert.equal(d.build['reference-review'].channel,'preview');
});
