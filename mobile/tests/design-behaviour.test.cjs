const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,mocks={}){
 const filename=path.resolve(__dirname,'../src',file),exports={};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>id in mocks?mocks[id]:id.startsWith('.')?(id.endsWith('.json')?require(path.resolve(path.dirname(filename),id)):load(id+'.ts',mocks)):require(id),Date,Intl,Set,Number,Object,JSON,AbortSignal,AbortController,setTimeout,clearTimeout,fetch:async()=>{throw Error('offline');}});
 return exports;
}
test('country choices update browsing currency, persist, and never turn stale rates into prices',async()=>{
 const saved=[];
 const p=load('preferences.ts',{'react':{},'@react-native-async-storage/async-storage':{setItem:async(k,v)=>saved.push(JSON.parse(v))}});
 for(const [country,currency] of [['NG','NGN'],['US','USD'],['GB','GBP'],['FR','EUR'],['KE','KES'],['JP','JPY']]){
  await p.selectCountryCurrency(country);
  assert.equal(p.preferenceSnapshot().currency,currency);
  assert.equal(saved.at(-1).currency,currency);
 }
 await p.savePreferences({currency:'USD',rates:{NGN:1,USD:0.001},rateAt:Date.now()});
 assert.equal(p.displayMoney(100000),'≈ $1.00');
 await p.savePreferences({rateAt:Date.now()-49*3600000});
 assert.match(p.displayMoney(100000),/NGN/);
 assert.doesNotMatch(p.displayMoney(100000),/≈/);
});
test('order journey does not imply shipment for unpaid, cancelled or stock-review orders',()=>{
 const p=load('order-policy.ts');
 for(const [status,expected] of [['processing',0],['packed',1],['shipped',2],['delivered',3],['paid_stock_review',null],['cancelled',null],['refunded',null]])assert.equal(p.fulfilmentStep({status,paymentStatus:'paid'}),expected);
 assert.equal(p.fulfilmentStep({status:'shipped',paymentStatus:'pending'}),null);
});
