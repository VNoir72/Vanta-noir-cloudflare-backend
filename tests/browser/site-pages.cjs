const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--config','portable/vite.config.ts','--outDir','outputs/namecheap','--host','127.0.0.1','--strictPort','--port','5211']);
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('127.0.0.1:'))resolve();});server.on('exit',reject);});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  const products=JSON.parse(fs.readFileSync('portable/catalog-snapshot.json','utf8'));
  if(products[0])products[0].details={...products[0].details,availability:'preview',priceStatus:'approved'};
  await page.route('**/api/**',r=>{
   const path=new URL(r.request().url()).pathname;
   return r.fulfill({json:path.includes('/catalog')?{products,merchandising:{sales:[],stockBadgesEnabled:false}}:path.includes('/reviews')?{reviews:[]}:path.includes('/store-settings')?{announcement:{enabled:false}}:{}});
  });
  const routes=['/','/about','/contact','/help-center','/privacy-policy','/privacy-choices','/shipping-returns','/terms-of-service','/reviews','/case-studies','/email-preferences','/checkout','/checkout/complete','/404.html'];
  if(products[0]?.slug)routes.push('/products/'+products[0].slug);
  for(const width of [390,820,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of routes){
    const response=await page.goto('http://127.0.0.1:5211'+route);
    assert(response.status()<500,route+' server error');
    await page.locator('#root').waitFor();await page.waitForTimeout(150);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    assert.equal(overflow,false,`${route} overflows at ${width}px`);
    assert((await page.locator('#root').innerText()).trim().length>20,route+' empty view');
    const palette=await page.evaluate(()=>{
      const app=document.querySelector('.dn-app');
      const buttons=[...document.querySelectorAll('.dn-app .dn-primary,.dn-app .dn-lime')].filter(el=>el.getBoundingClientRect().width>0);
      return {background:app?getComputedStyle(app).backgroundColor:null,buttons:buttons.map(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}))};
    });
    if(palette.background)assert.equal(palette.background,'rgb(255, 255, 255)',route+' white page surface');
    for(const button of palette.buttons){assert.equal(button.background,'rgb(198, 242, 118)',route+' approved lime');assert.equal(button.color,'rgb(23, 26, 28)',route+' readable charcoal text');}
    if(route.startsWith('/products/')){
      await page.locator('.dn-option-price').waitFor();
      assert.equal(await page.locator('.dn-option-price').innerText(),'Price announced at launch');
      assert.equal(await page.locator('.dn-add').isDisabled(),true);
      assert.doesNotMatch(await page.locator('.dn-add').innerText(),/₦|NGN/);
    }
    results.push({route,width,status:response.status(),overflow});
    if(['/about','/contact','/help-center','/checkout'].includes(route)&&width!==820)await page.screenshot({path:`work/page-${route.slice(1)}-${width}.png`});
   }
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync('work/site-pages.json',JSON.stringify({results,errors},null,2));
  console.log(`PASS ${results.length} page/viewport checks across every static customer route family; no runtime errors or horizontal overflow`);
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});

