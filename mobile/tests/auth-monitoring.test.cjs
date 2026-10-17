const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
test('native auth analytics require consent, omit identity data, and tolerate telemetry failure',async()=>{
 const events=[];let fail=false;
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(require.resolve('../src/monitoring.native.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports:module.exports,module,Set,require:name=>name==='@react-native-firebase/analytics'?{getAnalytics:()=>({}),setAnalyticsCollectionEnabled:async()=>{},logEvent:async(_,event,params)=>{if(fail)throw Error('Offline');events.push({event,params:JSON.parse(JSON.stringify(params))});}}:name==='@react-native-firebase/crashlytics'?{getCrashlytics:()=>({}),setCrashlyticsCollectionEnabled:async()=>{},deleteUnsentReports:async()=>{}}:{}});
 const api=module.exports;
 await api.trackAuth('sign_up','email');assert.equal(events.length,0);
 await api.applyMonitoring({analytics:true,diagnostics:false});
 await api.trackAuth('sign_up','google');await api.trackAuth('login','email');
 assert.deepEqual(events,[{event:'sign_up',params:{method:'google'}},{event:'login',params:{method:'email'}}]);
 fail=true;await assert.doesNotReject(()=>api.trackAuth('login','apple'));
 await api.applyMonitoring({analytics:false,diagnostics:false});
 fail=false;await api.trackAuth('login','email');assert.equal(events.length,2);
});
