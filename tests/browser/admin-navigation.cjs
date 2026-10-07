// Run from repository root with Playwright installed; optional CHROMIUM_EXECUTABLE overrides its browser.
const {spawn}=require('child_process');const {chromium}=require('playwright');const assert=require('assert/strict');
(async()=>{const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','portable/vite.config.ts','--host','127.0.0.1','--port','5184']);try{await new Promise((resolve,reject)=>{server.stdout.on('data',b=>{if(b.toString().includes('127.0.0.1:'))resolve()});server.on('exit',c=>reject(Error('server '+c)));server.stderr.on('data',b=>process.stderr.write(b));});const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});try{const page=await browser.newPage({hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1504,height:1046});await page.goto('http://127.0.0.1:5184/tests/browser/admin-navigation.html');await page.getByRole('heading',{name:'Store overview',exact:true}).waitFor();
for(const width of [390,768,820,1023,1024,1180,820,390]){
 await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
 const mobile=width<1024,nav=page.getByRole('navigation',{name:mobile?'Quick navigation':'Store administration'});
 for(const name of ['Orders','Products','Overview']){
  await page.evaluate(()=>{window.scrollTo(0,600);document.querySelector('.vn-control-content').scrollTo(0,600)});
  if(mobile){const r=await page.evaluate(()=>{const n=document.querySelector('.vn-mobile-tabs').getBoundingClientRect(),c=document.querySelector('.vn-control-content').getBoundingClientRect();return {bottom:n.bottom,top:n.top,contentBottom:c.bottom,h:innerHeight}});assert(Math.abs(r.bottom-r.h)<2,'bottom gap '+width);assert(r.contentBottom<=r.top+1,'nav overlap '+width);}
  await nav.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(100);
  assert(await page.evaluate(()=>document.querySelector('h1').getBoundingClientRect().top>=0),'heading hidden '+width+' '+name);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+width);
 }
 if(mobile){await page.getByRole('button',{name:'More navigation'}).click();await page.getByRole('dialog').getByRole('button',{name:'Products',exact:true}).click();await page.waitForTimeout(100);await page.getByRole('dialog').waitFor({state:'hidden'});await nav.getByRole('button',{name:'Overview',exact:true}).click();await page.getByRole('button',{name:'More navigation'}).click();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});}
 if(!mobile){
  const positions=()=>page.evaluate(()=>({side:document.querySelector('.vn-control-sidebar').scrollTop,main:document.querySelector('.vn-control-content').scrollTop,body:window.scrollY}));
  await page.locator('.vn-control-sidebar').hover();await page.mouse.wheel(0,2000);await page.waitForTimeout(200);const left=await positions();assert.equal(left.main,0,'sidebar moved main '+width);assert.equal(left.body,0,'sidebar moved document '+width);
  await page.locator('.vn-control-content').hover();await page.mouse.wheel(0,2000);await page.waitForTimeout(200);const right=await positions();assert.equal(right.side,left.side,'main moved sidebar '+width);assert.equal(right.body,0,'main moved document '+width);
  assert(await page.evaluate(()=>getComputedStyle(document.querySelector('.vn-control-sidebar')).overscrollBehaviorY==='contain'),'sidebar chains scroll');
 }
 console.log('PASS navigation + independent scroll + bounds',width);
}
await page.setViewportSize({width:820,height:600});
await page.getByRole('button',{name:'Add product',exact:true}).click();
await page.getByPlaceholder('e.g. Axis shell jacket').fill('Unsaved navigation test');
await page.getByRole('button',{name:'Close product editor'}).click();
await page.getByRole('button',{name:'Stay here',exact:true}).click();
assert.equal(await page.getByPlaceholder('e.g. Axis shell jacket').inputValue(),'Unsaved navigation test');
await page.getByRole('button',{name:'Close product editor'}).click();
await page.getByRole('button',{name:'Discard and continue',exact:true}).click();
await page.getByRole('dialog').waitFor({state:'hidden'});
await page.getByRole('button',{name:'More navigation'}).click();
await page.setViewportSize({width:1180,height:820});await page.getByRole('dialog').waitFor({state:'hidden'});
console.log('PASS unsaved editor protection and rotation with drawer open');
await page.getByRole('button',{name:'Add product',exact:true}).click();
const imageInput=page.locator('.vn-studio-upload input');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
for(const [i,view] of ['Front','Back','Left','Right'].entries()){
 await page.locator('.vn-studio-tabs').getByRole('button',{name:view,exact:true}).click();
 await imageInput.setInputFiles({name:'view.png',mimeType:'image/png',buffer:png});
 await page.locator('.vn-studio-preview img').waitFor();
 assert((await page.locator('.vn-studio-preview img').getAttribute('src')).includes('test-'+(i+1)+'.png'),'wrong view '+view);
}
await page.evaluate(()=>window.__qaUploadFail=true);
await imageInput.setInputFiles({name:'view.png',mimeType:'image/png',buffer:png});
await page.getByText('Storage unavailable. Retry upload.',{exact:true}).waitFor();
assert((await page.locator('.vn-studio-preview img').getAttribute('src')).includes('test-4.png'),'failed upload replaced existing image');
await page.evaluate(()=>window.__qaUploadFail=false);
await imageInput.setInputFiles({name:'view.png',mimeType:'image/png',buffer:png});
await page.waitForFunction(()=>document.querySelector('.vn-studio-preview img')?.getAttribute('src')?.includes('test-5.png'));
await page.getByRole('button',{name:'Remove view',exact:true}).click();
assert.equal(await page.locator('.vn-studio-preview img').count(),0);
await page.locator('.vn-studio-tabs').getByRole('button',{name:'Front',exact:true}).click();
assert((await page.locator('.vn-studio-preview img').getAttribute('src')).includes('test-1.png'),'removing right removed front');
await page.getByRole('button',{name:'Close product editor'}).click();await page.getByRole('button',{name:'Discard and continue',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
console.log('PASS four image destinations, failed upload recovery, retry and remove');

const sectionButtons=page.getByRole('navigation',{name:'Store administration'}).getByRole('button');
for(const name of await sectionButtons.allTextContents()){
 await page.getByRole('navigation',{name:'Store administration'}).getByRole('button',{name,exact:true}).click();await page.waitForTimeout(200);
 assert(await page.locator('h1').count()>0,'blank section '+name);
 console.log('PASS section renders',name);
}

await page.getByRole('navigation',{name:'Store administration'}).getByRole('button',{name:'Orders',exact:true}).click();
await page.evaluate(()=>{const original=window.fetch;window.__bulkCalls=[];window.fetch=async(input,init)=>{if(String(input).includes('/api/admin/orders')){if(init?.method==='PATCH'){window.__bulkCalls.push(JSON.parse(init.body));await new Promise(r=>setTimeout(r,100));return Response.json({ok:true});}return Response.json({orders:[{id:'bulk-test',reference:'VN-BULK-TEST',firstName:'Test',lastName:'Buyer',city:'Kaduna',state:'Kaduna',status:'paid',paymentStatus:'paid',items:[{quantity:1,productName:'Test garment',color:'Black',size:'L'}]}],hasMore:false,total:1});}return original(input,init)}});
await page.getByRole('button',{name:'Review all eligible paid orders'}).click();
const confirm=page.getByRole('button',{name:'Confirm 1 orders as processing'});await confirm.waitFor();assert(await confirm.isDisabled());
await page.getByRole('checkbox',{name:/I checked every listed order/}).check();await confirm.dblclick();
await page.getByText(/1 orders updated. 0 not confirmed/).waitFor();assert.equal(await page.evaluate(()=>window.__bulkCalls.length),1,'double tap duplicated bulk action');
assert.equal(await page.evaluate(()=>window.__bulkCalls[0].expectedStatus),'paid');
console.log('PASS bulk review, verification gate and double-tap lock');
assert.deepEqual(errors,[]);console.log('PASS all admin navigation regression checks');}finally{await browser.close()}}finally{server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
