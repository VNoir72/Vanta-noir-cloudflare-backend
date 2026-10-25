const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const references={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/order-reference.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:references});
const code=ts.transpileModule(fs.readFileSync('src/receipt-download.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function setup({granted=true}={}){const calls=[];const exports={};const modules={
 './order-reference':references,
 'react-native':{Platform:{OS:'android'}},
 './api':{money:n=>`NGN ${n/100}`},
 'expo-print':{printToFileAsync:async opts=>{calls.push(['pdf',opts]);return{uri:'file:///receipt.pdf',base64:'JVBERg=='};},printAsync:async opts=>calls.push(['print',opts])},
 'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async(...args)=>calls.push(['share',...args])},
 'expo-file-system/legacy':{StorageAccessFramework:{requestDirectoryPermissionsAsync:async()=>({granted,directoryUri:'content://chosen-folder'}),createFileAsync:async(...args)=>{calls.push(['create',...args]);return'content://chosen-folder/receipt';}},EncodingType:{Base64:'base64'},writeAsStringAsync:async(...args)=>calls.push(['write',...args])}
};vm.runInNewContext(code,{exports,require:name=>modules[name]});return{download:exports.downloadReceipt,calls};}
const order={reference:'VN-1042',paymentStatus:'paid',totalKobo:6800000,shippingKobo:300000,items:[{productName:'<script>bad()</script>',color:'Black',size:'L',quantity:1,unitPriceKobo:6500000}]};
test('cancelled folder selection does not generate or write a receipt',async()=>{const s=setup({granted:false});assert.equal(await s.download(order,'download'),'cancelled');assert.deepEqual(s.calls,[]);});
test('Android download writes PDF only into the chosen folder, with escaped receipt data',async()=>{const s=setup();assert.equal(await s.download(order,'download'),'saved');assert.deepEqual(s.calls.map(c=>c[0]),['pdf','create','write']);assert.match(s.calls[0][1].html,/&lt;script&gt;/);assert.equal(s.calls[1][1],'content://chosen-folder');assert.equal(s.calls[2][1],'content://chosen-folder/receipt');assert.equal(s.calls[2][2],'JVBERg==');});
test('Save opens the file chooser without claiming the user saved it',async()=>{const s=setup();assert.equal(await s.download(order,'save'),'shared');assert.deepEqual(s.calls.map(c=>c[0]),['pdf','share']);assert.equal(s.calls[1][1],'file:///receipt.pdf');});

test('legacy customer references are shortened in PDF and filename',async()=>{const s=setup();const reference='VN-0123456789abcdef0123456789abcdef';await s.download({...order,reference},'download');const short=references.customerOrderReference(reference);assert.ok(s.calls[0][1].html.includes(short));assert.ok(!s.calls[0][1].html.includes(reference));assert.equal(s.calls[1][2],'Vanta-Noir-'+short);});

test('native reference and accent helpers match the shared website helpers',()=>{for(const name of ['order-reference','brand-accent'])assert.equal(fs.readFileSync('src/'+name+'.ts','utf8'),fs.readFileSync('../lib/'+name+'.ts','utf8'));});

test('receipts preserve and escape the preorder dispatch promise',async()=>{const s=setup();await s.download({...order,preorders:[{productId:'p1',productName:'<Dress>',dispatchNote:'Dispatch within 4 weeks <script>bad()</script>'}]},'download');const html=s.calls[0][1].html;assert.match(html,/Dispatch within 4 weeks &lt;script&gt;/);assert.match(html,/&lt;Dress&gt;/);assert.match(html,/transit time starts after dispatch/i);assert.ok(!html.includes('<script>'));});
