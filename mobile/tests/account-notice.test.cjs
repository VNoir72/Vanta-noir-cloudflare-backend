const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(require('node:path').join(__dirname,'../App.tsx'),'utf8');
function fixture(){
 const start=source.indexOf('  const accountEpoch = useRef'),code=source.slice(start,source.indexOf('  useEffect(() => {',start));
 let notice='',fail=true;
 const ctx={Error,useRef:value=>({current:value}),vault:{get:async k=>k==='session'?'test-token':null},api:async path=>{if(fail)throw Error('Network request failed');return path.endsWith('/me')?{customer:{email:'test@example.test',favourites:[],addresses:[]}}:{orders:[]}},AsyncStorage:{getItem:async()=>null},ApiError:class extends Error{},setCustomer:()=>{},setSaved:()=>{},setAddress:()=>{},setOrders:()=>{},refreshCards:async()=>{},setNotice:value=>{notice=typeof value==='function'?value(notice):value;}};
 vm.createContext(ctx);vm.runInContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 return {account:ctx.account,recover:()=>{fail=false;},notice:()=>notice,setNotice:ctx.setNotice};
}
test('successful account retry clears its previous error',async()=>{const f=fixture();await f.account();assert.equal(f.notice(),'Network request failed');f.recover();await f.account();assert.equal(f.notice(),'');});
test('account recovery preserves a newer unrelated notice',async()=>{const f=fixture();await f.account();f.setNotice('Payment is pending.');f.recover();await f.account();assert.equal(f.notice(),'Payment is pending.');});
test('startup account refresh fails quietly',async()=>{const f=fixture();f.setNotice('Saved data could not be restored.');await f.account(true);assert.equal(f.notice(),'Saved data could not be restored.');});
