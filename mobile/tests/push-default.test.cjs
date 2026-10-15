const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function fixture(){
 const values=new Map(),calls=[];let granted=true;
 const mocks={'expo-notifications':{setNotificationHandler(){},setNotificationChannelAsync:async()=>{},AndroidImportance:{DEFAULT:3},getPermissionsAsync:async()=>({granted,canAskAgain:true}),requestPermissionsAsync:async()=>{calls.push('permission');return {granted}},getExpoPushTokenAsync:async()=>({data:'ExponentPushToken[test]'})},'expo-constants':{easConfig:{projectId:'test'}},'react-native':{Platform:{OS:'android'}},'./api':{api:async(...args)=>calls.push(args)},'@react-native-async-storage/async-storage':{getItem:async k=>values.get(k)||null,setItem:async(k,v)=>values.set(k,v),removeItem:async k=>values.delete(k)}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/push.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports,require:id=>mocks[id]});
 return {exports,values,calls,deny:()=>{granted=false}};
}
test('default registration links signed-in owner; explicit opt-out survives next launch',async()=>{const f=fixture();await f.exports.registerDefaultOrderPush('one');assert.equal(f.values.get('vanta-order-push:one'),'on');await f.exports.disablePush('one');const count=f.calls.length;await f.exports.registerDefaultOrderPush('one');assert.equal(f.calls.length,count);await f.exports.registerDefaultOrderPush('two');assert.equal(f.values.get('vanta-order-push:two'),'on');assert.equal(f.values.get('vanta-order-push:one'),'off');});
test('logout detaches device without changing notification preference',async()=>{const f=fixture();await f.exports.enablePush('one');await f.exports.disablePush();assert.equal(f.values.get('vanta-order-push:one'),'on');assert.equal(f.values.has('vanta-push-token'),false);});
test('denied permission is requested only once, never in a loop',async()=>{const f=fixture();f.deny();await assert.rejects(f.exports.registerDefaultOrderPush('one'),/off in phone settings/);await f.exports.registerDefaultOrderPush('one');assert.equal(f.calls.filter(x=>x==='permission').length,1);assert.equal(f.values.has('vanta-push-token'),false);});
