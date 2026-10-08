const {spawn}=require('node:child_process'),{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--config','portable/vite.config.ts','--outDir','outputs/namecheap','--host','127.0.0.1','--strictPort','--port','5216']);let browser;
 try{
  await new Promise((r,j)=>{server.stdout.on('data',d=>{if(String(d).includes('127.0.0.1:'))r();});server.on('exit',j);});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox']});
  const product=JSON.parse(fs.readFileSync('portable/catalog-snapshot.json'))[0];
  async function setup(width,{failedImage=false,custom=false}={}){
   const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{const url=new URL(route.request().url());
    if(failedImage&&url.pathname.includes('carousel-varsity'))return route.abort();
    if(url.pathname==='/api/catalog')return route.fulfill({json:{products:[product],merchandising:{sales:[]}}});
    if(url.pathname==='/api/store-settings')return route.fulfill({json:custom?{hero:{image:'/images/vanta-technical-campaign-2026.webp',playlist:[{url:'/images/vanta-carousel-olive-2026.webp',type:'image',alt:'Owner-selected olive campaign'}]}}:{}});
    if(url.pathname.startsWith('/api/'))return route.fulfill({json:{}});
    if(url.hostname!=='127.0.0.1')return route.abort();return route.continue();
   });
   await page.clock.install();await page.goto('http://127.0.0.1:5216/');await page.locator('.dn-card').first().waitFor();
   const consent=page.getByRole('button',{name:'Decline analytics',exact:true});if(await consent.count())await consent.click();
   await page.locator('.vn-hero-frame img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
   await page.mouse.move(width-1,899);return {page,errors,hero:page.locator('.vn-responsive-hero')};
  }
  for(const width of [390,820,1440]){
   const {page,hero,errors}=await setup(width);assert.equal(await hero.locator('.vn-hero-frame').count(),4);
   assert.equal(await hero.locator('.vn-hero-frame[data-layered=true]').count(),4,'all four model layers decoded');
   assert.equal(await hero.locator('.vn-hero-frame[data-active=true] .vn-campaign-detail').evaluate(e=>getComputedStyle(e).animationName),'vn-detail-story','independent detail choreography');
   await page.waitForFunction(()=>document.querySelector('.vn-responsive-hero').dataset.running==='true');
   await page.clock.fastForward(8200);assert.equal(await hero.getAttribute('data-slide'),'1','automatic next slide');
   await hero.focus();await page.clock.fastForward(17000);assert.equal(await hero.getAttribute('data-slide'),'1','keyboard focus pauses rotation');
   for(let n=1;n<=4;n++){
    const index=n%4;if(n>1)await page.keyboard.press('ArrowRight');
    assert.equal(await hero.getAttribute('data-slide'),String(index));
    assert.equal(await hero.locator('.vn-hero-frame[aria-hidden=false]').count(),1);
    await page.screenshot({path:`work/carousel-${width}-${index}.png`,animations:'disabled'});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   }
   await page.keyboard.press('ArrowRight');await page.clock.fastForward(16000);assert.equal(await hero.getAttribute('data-slide'),'1','manual browse remains paused');
   assert.equal(await hero.getByRole('button').count(),1,'pause control only; no arrows or dots');
   await hero.getByRole('button',{name:'Play campaign motion'}).click();await page.getByRole('button',{name:'Search',exact:true}).focus();await page.mouse.move(width-1,899);
   await page.clock.fastForward(8200);assert.equal(await hero.getAttribute('data-slide'),'2','explicit play resumes');
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.vn-responsive-hero').dataset.running==='false');await page.clock.fastForward(17000);assert.equal(await hero.getAttribute('data-slide'),'2','reduced motion stops automatic changes');
   assert.equal(await hero.locator('.vn-hero-frame[data-active=true] .vn-campaign-model').evaluate(e=>getComputedStyle(e).animationName),'none');
   assert.equal(await hero.locator('.vn-hero-frame[data-active=true] .vn-campaign-detail').isVisible(),false,'reduced motion hides animated detail overlay');
   const box=await hero.boundingBox();await hero.dispatchEvent('touchstart',{touches:[{identifier:0,clientX:300,clientY:200}]});await hero.dispatchEvent('touchend',{changedTouches:[{identifier:0,clientX:100,clientY:205}]});assert.equal(await hero.getAttribute('data-slide'),'3','horizontal swipe');
   await page.getByRole('button',{name:'Search',exact:true}).click();assert(Math.abs((await hero.boundingBox()).y-box.y)<2,'same-row search preserves hero position');
   assert.deepEqual(errors,[]);await page.close();console.log(`PASS carousel ${width}: rotation, focus, manual pause/play, keyboard, swipe, reduced motion, search and bounds`);
  }
  const failure=await setup(390,{failedImage:true});await failure.page.clock.fastForward(8200);assert.equal(await failure.hero.getAttribute('data-slide'),'2','broken image is skipped without blank frame');await failure.page.close();
  const custom=await setup(390,{custom:true});assert.equal(await custom.hero.locator('.vn-hero-frame').count(),1,'owner playlist preserved');assert.equal(await custom.hero.locator('img').getAttribute('alt'),'Owner-selected olive campaign');await custom.page.close();
  console.log('PASS failed-image fallback and custom owner playlist');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
