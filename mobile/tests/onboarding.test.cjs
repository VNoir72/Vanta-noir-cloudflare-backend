const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function fixture({seen=null,session=null,choice=null}={}){
 const state=[],effects=[],writes=[],saved=[],completed=[];let i=0,tree;
 const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)}),useState:initial=>{const n=i++;if(!(n in state))state[n]=initial;return[state[n],v=>{state[n]=v;}];},useEffect:fn=>{if(!effects.length)effects.push(fn);}};
 const storage={getItem:async k=>k==='vanta-onboarding-v1'?seen:choice,setItem:async(...args)=>writes.push(args)};
 const exports={};const mocks={react:React,'react-native':{},'@react-native-async-storage/async-storage':storage,'expo-router':{router:{}},'expo-status-bar':{},'../theme':{useTheme:()=>({colors:{accent:'#00ff66',onAccent:'#000'}})},'../monitoring':{monitoringChoice:async()=>({analytics:false,diagnostics:true}),saveMonitoring:async v=>saved.push(v)},'../api':{vault:{get:async()=>session}}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/components/Onboarding.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:id=>mocks[id]||{}});
 const render=()=>{i=0;tree=exports.Onboarding({children:'storefront',onComplete:v=>completed.push(v)});return tree;};render();effects[0]();await new Promise(r=>setImmediate(r));render();
 const nodes=n=>[n,...(n?.children||[]).flatMap(nodes)];
 return {render,writes,saved,completed,button:label=>nodes(tree).find(n=>n?.props?.label===label),texts:()=>nodes(tree).filter(n=>typeof n==='string')};
}
test('existing analytics choice does not hide unseen welcome or get overwritten',async()=>{const f=await fixture({choice:'{"analytics":false,"diagnostics":true}'});assert.ok(f.button('Get started'));await f.button('Sign in').props.onPress();await new Promise(r=>setImmediate(r));f.render();assert.equal(f.saved.length,0);assert.deepEqual(f.completed,[false]);assert.equal(f.writes[0][0],'vanta-onboarding-v1');});
test('completed welcome and signed-in sessions skip onboarding',async()=>{for(const input of [{seen:'complete'},{session:'session-fixture'}]){const f=await fixture(input);assert.ok(f.texts().includes('storefront'));assert.equal(f.button('Get started'),undefined);}});
test('new installs choose analytics explicitly and preserve diagnostics',async()=>{const f=await fixture();f.button('Get started').props.onPress();f.render();assert.ok(f.button('No thanks'));await f.button('No thanks').props.onPress();await new Promise(r=>setImmediate(r));assert.equal(f.saved[0].analytics,false);assert.equal(f.saved[0].diagnostics,true);assert.deepEqual(f.completed,[true]);});
