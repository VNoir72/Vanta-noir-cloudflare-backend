// Production export, local fixture API; no real orders, accounts or shipping calls.
const {chromium}=require('playwright');
const {createServer}=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('outputs/cloudflare-preview');
const sizes=[[320,568],[375,812],[390,844],[430,932],[744,1133],[768,1024],[820,1180],[834,1194],[1024,1366]];
const results=[],errors=[];
const server=createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://local').pathname);if(p==='/')p='/index.html';if(!path.extname(p))p+='.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+'/')||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
let browser;
async function fit(page,selector,label){const e=page.locator(selector);await e.waitFor({state:'visible'});await page.waitForTimeout(180);const b=await e.boundingBox(),v=page.viewportSize();assert(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,`${label} outside ${JSON.stringify(v)}: ${JSON.stringify(b)}`);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' document overflow');}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-gpu']});
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.stack));
 const products=JSON.parse(fs.readFileSync('portable/catalog-snapshot.json'));for(const product of products){product.details={...product.details,availability:'in_stock',priceStatus:'approved'};for(const c of product.colorways)for(const s of Object.keys(c.stock))c.stock[s]=5;}
 await p.route('**/api/**',r=>r.fulfill({status:/\/api\/(catalog|store-settings)(?:[?]|$)/.test(r.request().url())?200:409,json:r.request().url().includes('/catalog')?{products,checkout:{internationalZones:[],shippingZones:[],shippingCountries:[["NG","Nigeria"]],shippingCountry:"Nigeria",shippingFeeKobo:null,paymentsEnabled:false,checkoutReady:false}}:r.request().url().includes('/store-settings')?{}:{}}));
 await p.goto('http://127.0.0.1:'+server.address().port+'/');await p.getByRole('button',{name:'Quick shop',exact:true}).first().waitFor();
 const decline=p.getByRole('button',{name:'Decline analytics',exact:true});if(await decline.isVisible())await decline.click();
 for(const [w,h] of sizes){for(const [width,height] of [[w,h],[h,w]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>scrollTo(0,0));await fit(p,'.vn-liquid-header','header');
  await p.getByRole('button',{name:'Open search',exact:true}).click();await fit(p,'.vn-liquid-search','inline search');
  const input=p.getByRole('searchbox',{name:'Search the collection'});assert(await input.evaluate(e=>getComputedStyle(e).fontSize==='16px'),'mobile input zoom prevention');await input.fill('cap');assert.equal(await input.inputValue(),'cap');await input.fill('');await p.getByRole('button',{name:'Close search',exact:true}).click();
  results.push({width,height,header:true,search:true});
 }}
 await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'Filters',exact:true}).click();
 console.log('PASS 18 phone/tablet header and inline-search layouts');await p.waitForTimeout(650);const dialog=p.getByRole('dialog');assert.equal(await dialog.count(),1);const filterClass=await dialog.getAttribute('class');
 for(let round=0;round<3;round++)for(const [w,h] of sizes)for(const [width,height] of [[w,h],[h,w]]){await p.setViewportSize({width,height});await fit(p,'[role="dialog"]','filters');}
 console.log('PASS filters: 54 rotations');await p.getByRole('button',{name:'Apply filters',exact:true}).click();
 await p.getByRole('button',{name:'Quick shop',exact:true}).first().click();await p.waitForTimeout(650);
 for(let round=0;round<3;round++)for(const [w,h] of sizes)for(const [width,height] of [[w,h],[h,w]]){await p.setViewportSize({width,height});await fit(p,'[role="dialog"]','quick shop');const close=p.getByRole('button',{name:'Close quick shop',exact:true});const b=await close.boundingBox();assert(b.y>=0&&b.y+b.height<=height+1,'quick shop close reachable');}
 console.log('PASS quick shop: 54 rotations');await p.locator('.dn-size-options button').first().click();await p.getByRole('button',{name:/Add to bag/}).click();await p.getByRole('dialog').waitFor({state:'hidden'});await p.getByRole('button',{name:/^Bag /}).first().click();await p.waitForTimeout(650);
 for(let round=0;round<3;round++)for(const [w,h] of sizes)for(const [width,height] of [[w,h],[h,w]]){await p.setViewportSize({width,height});await fit(p,'[role="dialog"]','bag');}
 console.log('PASS populated bag: 54 rotations');await p.getByRole('link',{name:'Continue to checkout',exact:true}).click();await p.getByRole('heading',{name:'01 / Your details',exact:true}).waitFor();for(const [w,h] of sizes)for(const [width,height] of [[w,h],[h,w]]){await p.setViewportSize({width,height});await p.waitForTimeout(180);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'checkout overflow');}console.log('PASS checkout: 18 layouts');await p.goto('http://127.0.0.1:'+server.address().port+'/products/'+products[0].slug);await p.locator('.dn-size-options').first().waitFor();for(const [w,h] of sizes)for(const [width,height] of [[w,h],[h,w]]){await p.setViewportSize({width,height});await p.waitForTimeout(180);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'product page overflow');}console.log('PASS product details: 18 layouts');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',scope:'Current production export with fixture catalog, Chromium touch emulation; not real Safari hardware',layouts:results,rotationsPerOverlay:sizes.length*2*3,overlays:['filters','quick shop','bag'],runtimeErrors:errors},null,2));
})().catch(e=>{console.error(e);console.error('Runtime errors:',errors);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
