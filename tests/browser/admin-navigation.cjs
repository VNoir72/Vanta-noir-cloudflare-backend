// Run from repository root with Playwright installed; optional CHROMIUM_EXECUTABLE overrides its browser.
const {spawn}=require('child_process');const {chromium}=require('playwright');const assert=require('assert/strict');
(async()=>{const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','portable/vite.config.ts','--host','127.0.0.1','--port','5184']);try{await new Promise((resolve,reject)=>{server.stdout.on('data',b=>{if(b.toString().includes('Local:'))resolve()});server.on('exit',c=>reject(Error('server '+c)));server.stderr.on('data',b=>process.stderr.write(b));});const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1504,height:1046});await page.goto('http://127.0.0.1:5184/tests/browser/admin-navigation.html');await page.getByRole('heading',{name:'Store overview',exact:true}).waitFor();
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
 console.log('PASS navigation + scroll + bounds',width);
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
assert.deepEqual(errors,[]);console.log('PASS all admin navigation regression checks');}finally{await browser.close()}}finally{server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
