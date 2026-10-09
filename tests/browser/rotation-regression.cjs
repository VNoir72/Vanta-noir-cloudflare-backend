// Local production-component fixtures only; no live orders or catalogue writes.
const {spawn}=require('node:child_process'),{chromium}=require('playwright'),assert=require('node:assert/strict');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','portable/vite.config.ts','--host','127.0.0.1','--port','5197']);let browser;
const pairs=process.env.EXTENDED_ROTATION
 ? [[320,568],[375,812],[390,844],[414,896],[430,932],[744,1133],[768,1024],[810,1080],[820,1180],[834,1194],[1024,1366],[1080,1920],[900,1440]]
 : [[390,844],[320,568],[820,1180]];
const sizes=[...pairs.flatMap(([w,h])=>[[w,h],[h,w]]),[1023,768],[1024,768]];
const changeCount=sizes.length*3;
// The appearance bar is part of the viewport budget, including iPad landscape.
async function checkDashboardEnd(page){
 for(const [width,height] of [[1366,1024],[1180,820],[1024,768],[820,1180],[390,844]]){
  await page.reload();await page.setViewportSize({width,height});
  const pane=page.locator('.vn-control-content');
  const box=await pane.boundingBox();
  assert(box&&box.y>=0&&box.y+box.height<=height+1,`dashboard scrollport escapes ${width}x${height}: ${JSON.stringify(box)}`);
  const insights=page.locator('.vn-extended-reports').filter({has:page.getByText('More insights',{exact:true})});
  const artwork=page.locator('.vn-extended-reports').filter({has:page.getByText('Dashboard artwork',{exact:true})});
  for(const disclosure of [insights,artwork]){
   const summary=disclosure.locator('summary');await summary.click();assert(await disclosure.getAttribute('open')!==null);
   const bounds=await summary.boundingBox();assert(bounds&&bounds.y>=0&&bounds.y+bounds.height<=height+1,'bottom disclosure must stay visible without overscroll');
   await summary.click();
  }
  await artwork.locator('summary').click();await page.getByRole('button',{name:'Edit dashboard artwork',exact:true}).click();
  assert(await page.getByLabel('Dashboard artwork product').isVisible());
  await artwork.locator('summary').click();
 }
 console.log('PASS dashboard end: Appearance plus reachable disclosures across desktop, iPad portrait/landscape and phone');
}
async function rotate(page,selector){for(let repeat=0;repeat<3;repeat++)for(const [width,height]of sizes){await page.setViewportSize({width,height});await page.waitForTimeout(80);const box=await page.locator(selector).boundingBox();assert(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=width+1&&box.y+box.height<=height+1,`${selector} escaped ${width}x${height}: ${JSON.stringify(box)}`);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document overflow');if(selector==='.vn-studio-sheet'){const backdrop=await page.locator('.vn-control-center').evaluate(e=>({image:getComputedStyle(e,'::before').backgroundImage,position:getComputedStyle(e,'::before').position}));assert(backdrop.image.includes('vanta-pearl-leaf-glass')&&backdrop.position==='fixed','admin backdrop changed on rotation');}}}
(async()=>{await new Promise((r,j)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))r()});server.on('exit',j)});browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/tmp/chromium',args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:390,height:844},...(process.env.TOUCH_ROTATION?{hasTouch:true,isMobile:true,deviceScaleFactor:2}:{})}),errors=[];p.on('pageerror',e=>errors.push(e.message));const products=JSON.parse(require('node:fs').readFileSync('portable/catalog-snapshot.json'));await p.route('**/api/**',r=>r.fulfill({json:r.request().url().includes('/catalog')?{products}:{}}));await p.goto('http://127.0.0.1:5197/tests/browser/rotation-store.html');await p.getByRole('button',{name:'Decline analytics'}).click();await p.locator('.approved-filter-trigger').click();await p.waitForTimeout(650);await rotate(p,'.approved-filter-modal');await p.getByRole('button',{name:'Apply filters'}).click();await p.locator('.approved-filter-modal').waitFor({state:'detached'});console.log('PASS filters:',changeCount,'rapid viewport changes and Apply');await p.locator('.dn-quick-button').first().click();await p.waitForTimeout(650);await rotate(p,'.dn-quick-dialog');await p.getByRole('button',{name:'Close quick shop',exact:true}).click();await p.locator('.dn-quick-dialog').waitFor({state:'detached'});console.log('PASS quick shop:',changeCount,'changes and Close');await p.getByRole('button',{name:/^Bag /}).first().click();await p.waitForTimeout(650);await rotate(p,'.vn-full-bag');await p.keyboard.press('Escape');await p.locator('.vn-full-bag').waitFor({state:'detached'});console.log('PASS bag:',changeCount,'changes and Escape');await p.goto('http://127.0.0.1:5197/tests/browser/rotation-admin.html');await checkDashboardEnd(p);await p.reload();await p.getByRole('button',{name:'Add product',exact:true}).click();await p.waitForTimeout(650);await p.getByPlaceholder('e.g. Axis shell jacket').fill('Unsaved rotation check');await rotate(p,'.vn-studio-sheet');assert.equal(await p.getByPlaceholder('e.g. Axis shell jacket').inputValue(),'Unsaved rotation check');assert.equal(await p.locator('.vn-studio-sheet .vn-studio-form').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');await p.getByRole('button',{name:'Close product editor'}).click();await p.getByRole('button',{name:'Stay here',exact:true}).click();assert.equal(await p.getByPlaceholder('e.g. Axis shell jacket').inputValue(),'Unsaved rotation check');await p.getByRole('button',{name:'Close product editor'}).click();await p.getByRole('button',{name:'Exit without saving',exact:true}).click();await p.locator('.vn-studio-sheet').waitFor({state:'detached'});assert.deepEqual(errors,[]);console.log('PASS editor:',changeCount,'changes, glass, draft preservation, unsaved guard and Close; no runtime errors');})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.kill()});
