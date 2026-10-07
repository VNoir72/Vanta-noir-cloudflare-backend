const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--config','portable/vite.config.ts','--outDir','outputs/namecheap','--host','127.0.0.1','--strictPort','--port','5213']);
 let browser;
 try {
  await new Promise((r,j)=>{server.stdout.on('data',d=>{if(String(d).includes('127.0.0.1:'))r();});server.on('exit',j);});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox']});
  const products=JSON.parse(fs.readFileSync('portable/catalog-snapshot.json','utf8'));
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>localStorage.setItem('vanta-noir-analytics-consent','denied'));
   await page.route('**/api/**',r=>r.fulfill({json:r.request().url().includes('/catalog')?{products,merchandising:{sales:[]}}:{}}));
   // Hold application startup: the responsive hero must download independently.
   let release;const gate=new Promise(r=>release=r);
   await page.route('**/assets/entry-*.js',async r=>{await gate;await r.continue();});
   await page.goto('http://127.0.0.1:5213/',{waitUntil:'commit'});
   const expected=width<=700?'vanta-stealth-campaign-mobile-2026.webp':'vanta-stealth-campaign-2026.webp';
   await page.waitForFunction(name=>performance.getEntriesByType('resource').some(e=>e.name.endsWith(name)&&e.responseEnd>0),expected);
   const artwork=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('vanta-stealth-campaign')).map(e=>e.name));
   assert.equal(artwork.length,1,'preload only the matching responsive artwork');
   release();await page.locator('.dn-card').first().waitFor();
   const last=page.locator('.dn-card .vn-sliding-views').last();
   assert.equal(await last.locator('img').count(),1,'offscreen card loads only the front image');
   const gallery=page.locator('.dn-card .vn-sliding-views').first();
   await gallery.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const g=document.querySelector('.dn-card .vn-sliding-views');return g.querySelectorAll('img').length===g.querySelectorAll('.vn-independent-frame').length;});
   const count=await gallery.locator('.vn-independent-frame').count();assert(count>=3,'multiple garment views retained');
   await gallery.locator('xpath=..').focus();await page.keyboard.press('ArrowRight');
   const active=gallery.locator('.vn-independent-frame[aria-hidden="false"] img');
   await active.evaluate(async img=>{await img.decode();if(!img.naturalWidth)throw Error('Selected garment image failed');});
   assert.match(await active.getAttribute('alt'),/back|left|right|side/i);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS mobile/desktop hero loads before application JavaScript; one responsive preload; offscreen alternate images deferred; garment navigation and decoding intact');
 } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
