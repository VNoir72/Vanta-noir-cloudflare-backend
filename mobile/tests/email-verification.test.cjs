const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function fixture(){
 const calls=[],events=[];let verified=false,failEmail=false,failExchange=false;
 const user={email:'owner@example.test',emailVerified:false,getIdToken:async()=> 'verified-by-server',reload:async()=>{user.emailVerified=verified;}};
 const auth={currentUser:user};
 const firebase={getAuth:()=>auth,onAuthStateChanged:(_,cb)=>{cb(auth.currentUser);return()=>{};},createUserWithEmailAndPassword:async()=>({user}),signInWithEmailAndPassword:async()=>({user}),signOut:async()=>{auth.currentUser=null;calls.push('signout');}};
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(require.resolve('../src/firebase-auth.native.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports:module.exports,module,require:name=>name==='@react-native-firebase/auth'?firebase:name==='@react-native-google-signin/google-signin'?{GoogleSignin:{configure(){}}}:name==='./monitoring'?{trackAuth:async(event,method)=>events.push({event,method})}:name==='./api'?{api:async(path)=>{calls.push(path);if(failExchange&&path==='/api/customer/firebase')throw Error('Session rejected');if(failEmail&&path==='/api/customer/email')throw Error('Delivery failed');return{token:'store-session'};},vault:{set:async()=>calls.push('store-session')}}:{}});
 return{api:module.exports,auth,calls,events,rejectExchange:()=>failExchange=true,verify:()=>verified=true,fail:()=>failEmail=true};
}
test('unverified signup waits without signing out or granting store access',async()=>{const f=fixture();assert.ok(await f.api.passwordLogin('owner@example.test','password',true));assert.ok(f.auth.currentUser);assert.equal(await f.api.finishVerification(),false);assert.deepEqual(f.calls,['/api/customer/email']);});
test('verified provider state is required before session exchange',async()=>{const f=fixture();f.verify();assert.equal(await f.api.finishVerification(),true);assert.deepEqual(f.calls,['/api/customer/firebase','store-session']);});
test('email failure retains pending identity and allows resend',async()=>{const f=fixture();f.fail();await assert.rejects(f.api.passwordLogin('owner@example.test','password',true));let address;f.api.watchPendingVerification(v=>address=v);assert.equal(address,'owner@example.test');assert.ok(f.auth.currentUser);assert.ok(!f.calls.includes('store-session'));});
test('expired verification session cannot advance',async()=>{const f=fixture();f.auth.currentUser=null;await assert.rejects(f.api.finishVerification(),/expired/);assert.deepEqual(f.calls,[]);});

test('signup records account creation but not a login before verification',async()=>{const f=fixture();await f.api.passwordLogin('owner@example.test','password',true);assert.deepEqual(f.events,[{event:'sign_up',method:'email'}]);});
test('failed backend exchange cannot report a successful login',async()=>{const f=fixture();f.verify();f.rejectExchange();await assert.rejects(f.api.finishVerification());assert.deepEqual(f.events,[]);});
test('verification completion records successful login',async()=>{const f=fixture();f.verify();await f.api.finishVerification();assert.deepEqual(f.events,[{event:'login',method:'email'}]);});
