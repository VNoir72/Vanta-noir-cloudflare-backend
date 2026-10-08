// Isolated customer journeys against the actual built storefront. No external writes.
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--config','portable/vite.config.ts','--outDir','outputs/namecheap','--host','127.0.0.1','--strictPort','--port','5213']);
 let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('127.0.0.1:'))resolve();});server.on('exit',reject);});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox']});
  const product=structuredClone(JSON.parse(fs.readFileSync('portable/catalog-snapshot.json'))[0]);
  product.name=product.name.replace(/^\d+\s+/, '');
  product.details={...product.details,availability:'in_stock',priceStatus:'approved'};
  const color=product.colorways[0];product.colorways=[color];
  const size=Object.keys(color.stock).find(s=>s!=='Size pending');assert(size);
  color.stock={[size]:3};const variant=color.variantIds?.[size]||`${product.id}-${size}-${color.name}`;
  const settings={checkoutReady:true,paymentsEnabled:true,acceptingOrders:true,inventoryConfirmed:true,internationalEnabled:true,internationalZones:[{countryCode:'US',feeKobo:2000000,estimate:'7–10 days'}],internationalDutiesNote:'Customer handles applicable import charges.',shippingZones:[{state:'Lagos',feeKobo:200000,estimate:'2–4 business days'}],shippingFeeKobo:null,dispatchNote:'Dispatch within 2 business days.',returnPolicy:'Contact customer care for return approval.',supportEmail:'care@example.com'};
  const cartItem={productId:product.id,variantId:variant,name:product.name,size,color:color.name,imageUrl:color.imageUrl,priceKobo:product.priceKobo,quantity:1};
  const reference='VN-ISOLATED-AUDIT';
  const results=[];
  for(const width of [390,820,1440]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));console.log('START',width);
   let catalogFail=false,checkoutFail=true,rewardFail=false,paid=false,verifyHang=false;
   const submissions=[];
   // Every external request is intercepted, including analytics, payment scripts and images.
   await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname.startsWith('/api/')){
     const body=req.method()==='POST'?req.postDataJSON():{};
     if(url.pathname==='/api/catalog')return route.fulfill(catalogFail?{status:503,json:{error:'Temporarily unavailable'}}:{json:{products:[product],checkout:settings,merchandising:{sales:[],stockBadgesEnabled:false}}});
     if(url.pathname==='/api/store-settings')return route.fulfill({json:settings});
     if(url.pathname==='/api/catalog-options')return route.fulfill({json:{}});
     if(url.pathname==='/api/rewards/quote'){
      if(rewardFail)return route.fulfill({status:503,json:{error:'Quote unavailable. Retry.'}});
      const subtotal=body.cart.reduce((n,i)=>n+i.quantity*product.priceKobo,0),fee=body.countryCode==='US'?2000000:body.state==='Lagos'?200000:null;
      return route.fulfill({json:{signature:'isolated-signature',subtotalKobo:subtotal,discountKobo:0,shippingSavingsKobo:0,baseShippingKobo:fee,shippingKobo:fee,totalKobo:fee===null?null:subtotal+fee,progress:{title:'Free shipping',shippingRemainingKobo:Math.max(0,product.priceKobo*2-subtotal),giftRemainingKobo:null,giftAvailable:false}}});
     }
     if(url.pathname==='/api/promotions/quote')return route.fulfill({status:400,json:{error:'This code is not valid.'}});
     if(url.pathname==='/api/checkout'){
      submissions.push(body);
      if(checkoutFail)return route.fulfill({status:503,json:{error:'Payment unavailable. Retry the same order.'}});
      return route.fulfill({json:{reference,receiptToken:'isolated-receipt',authorizationUrl:'https://checkout.paystack.com/isolated',accessCode:'isolated-code'}});
     }
     if(url.pathname==='/api/payments/verify'){
      if(verifyHang)return; // Deliberately stalled transport; tested with the browser clock below.
      return route.fulfill({json:{order:{reference,paymentStatus:paid?'paid':'pending',status:paid?'paid':'pending',subtotalKobo:product.priceKobo,shippingKobo:200000,totalKobo:product.priceKobo+200000,items:[{variantId:variant,productName:product.name,color:color.name,size,quantity:1,unitPriceKobo:product.priceKobo}]}}});
     }
     if(url.pathname==='/api/orders/track')return route.fulfill({status:404,json:{error:'No matching order. Check your reference and contact details.'}});
     return route.fulfill({json:{reviews:[]}});
    }
    if(url.hostname==='js.paystack.co')return route.fulfill({contentType:'application/javascript',body:'window.PaystackPop=class{resumeTransaction(code,callbacks){window.__auditPayment=callbacks;}}'});
    if(url.hostname!=='127.0.0.1')return route.abort();
    return route.continue();
   });
   await page.goto('http://127.0.0.1:5213/');
   await page.locator('.dn-card').first().waitFor();console.log('catalog loaded');
   const consent=page.getByRole('button',{name:'Decline analytics',exact:true});if(await consent.count())await consent.click();
   const hero=page.locator('.vn-responsive-hero'),header=page.locator('.vn-store-header');
   await hero.locator('img').first().evaluate(img=>img.decode());
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`work/audit-hero-${width}.png`,animations:'disabled'});
   const heroBox=await hero.boundingBox(),ctaBox=await hero.getByRole('link',{name:'Find your fit',exact:true}).boundingBox();
   assert(ctaBox&&ctaBox.y>=heroBox.y&&ctaBox.y+ctaBox.height<=heroBox.y+heroBox.height,'Hero call to action must fit inside the visible campaign');
   await hero.getByRole('link',{name:'Find your fit',exact:true}).click();
   await page.waitForFunction(()=>scrollY>150);
   await page.evaluate(()=>scrollTo(0,0));
   const heroHeight=(await hero.boundingBox()).height;
   await page.evaluate(()=>scrollTo(0,150));
   await page.waitForFunction(()=>document.querySelector('.vn-store-header').dataset.scrolled==='false');
   assert.equal(await header.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','Transparent over hero');
   assert.equal(await header.evaluate(e=>Math.round(e.getBoundingClientRect().top)),0,'Navigation stays visible');
   await page.evaluate(y=>scrollTo(0,y),heroHeight+50);
   await page.waitForFunction(()=>document.querySelector('.vn-store-header').dataset.scrolled==='true');
   assert.equal(await header.evaluate(e=>Math.round(e.getBoundingClientRect().top)),0);
   await page.evaluate(()=>scrollTo(0,0));
   await page.waitForFunction(()=>document.querySelector('.vn-store-header').dataset.scrolled==='false');
   await page.getByRole('button',{name:'Search',exact:true}).click();
   await page.getByLabel('Search the collection').fill('nonexistent-audit-garment');
   await page.getByRole('heading',{name:'No pieces found.'}).waitFor();
   assert.equal(await header.locator('img').getAttribute('src'),'/images/vanta-spire-light.svg','Readable logo when search removes hero');
   await page.getByRole('button',{name:'Close search',exact:true}).click();
   await page.getByRole('button',{name:'Explore the collection',exact:true}).click();
   await page.locator('.dn-card').first().waitFor();
   await page.getByRole('button',{name:/^Save .* in /}).first().click();
   await page.getByRole('button',{name:'Saved items, 1',exact:true}).waitFor();
   await page.getByRole('button',{name:'Saved items, 1',exact:true}).click();
   await page.getByRole('heading',{name:'Your saved pieces'}).waitFor();
   await page.getByRole('button',{name:'Quick shop',exact:true}).click();
   await page.locator('.dn-size-options').getByRole('button',{name:size,exact:true}).click();
   await page.getByRole('button',{name:/^Add to bag/}).click();
   await page.getByRole('button',{name:'Bag 1',exact:true}).click();
   await page.getByRole('progressbar',{name:'Progress toward free shipping'}).waitFor();
   assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'50');
   await page.getByRole('button',{name:`Increase ${product.name} quantity`}).click();
   await page.getByText('Free shipping unlocked.',{exact:true}).waitFor();
   await page.getByRole('button',{name:`Decrease ${product.name} quantity`}).click();
   await page.getByRole('link',{name:'Continue to checkout'}).click();
   await page.getByRole('heading',{name:'Checkout.',exact:true}).waitFor();
   await page.getByRole('button',{name:'Bag 1',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Saved items, 1',exact:true}).count(),1);
   const pay=page.getByRole('button',{name:'Continue to payment'});
   assert(await pay.isDisabled(),'Missing destination must block payment');
   for(const [label,value] of [['Email address','audit@example.com'],['First name','Audit'],['Last name','Customer'],['Phone number','08000000000'],['Street address','10 Example Road'],['City','Lagos']])await page.locator('.dn-checkout-grid').getByLabel(label,{exact:true}).fill(value);
   await page.locator('select[name=countryCode]').selectOption('US');
   assert.equal(await page.getByLabel('Postal / ZIP code',{exact:true}).getAttribute('required'),'');
   await page.locator('select[name=countryCode]').selectOption('NG');
   await page.locator('select[name=state]').selectOption('Lagos');
   await page.locator('.dn-checkbox input').check();
   await page.getByLabel('Promotion code',{exact:true}).fill('INVALID');
   await page.getByRole('button',{name:'Apply code',exact:true}).click();
   await page.getByText('This code is not valid.',{exact:true}).waitFor();
   await page.getByLabel('Promotion code',{exact:true}).fill('');
   await pay.click();await page.getByText('Payment unavailable. Retry the same order.',{exact:true}).waitFor();
   assert.equal(submissions.length,1);
   checkoutFail=false;
   await pay.click();await page.waitForFunction(()=>Boolean(window.__auditPayment));
   assert.equal(submissions.length,2);
   assert.equal(submissions[0].checkoutAttempt,submissions[1].checkoutAttempt,'Failed payment retry keeps idempotency key');
   await page.evaluate(()=>window.__auditPayment.onCancel());
   await page.getByText('Payment window closed. Your bag is saved; you can continue when ready.').waitFor();
   assert(await pay.isEnabled());
   await page.screenshot({path:`work/audit-checkout-${width}.png`,fullPage:true});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Checkout bounds');
   await page.getByRole('link',{name:'Back to your bag',exact:true}).click();
   await page.locator('.vn-full-bag').waitFor();
   await page.getByRole('button',{name:`Remove ${product.name}`,exact:true}).click();
   await page.getByRole('heading',{name:'Make it yours.',exact:true}).waitFor();
   // A failed catalogue must offer recovery inside the open bag, not a permanent loader.
   catalogFail=true;
   await page.goto('http://127.0.0.1:5213/?bag=1');
   await page.getByRole('button',{name:'Retry bag',exact:true}).waitFor();
   catalogFail=false;await page.getByRole('button',{name:'Retry bag',exact:true}).click();
   await page.getByRole('heading',{name:'Make it yours.',exact:true}).waitFor();
   await page.evaluate(item=>localStorage.setItem('vn-discover-bag-v1',JSON.stringify([item])),cartItem);
   rewardFail=true;await page.goto('http://127.0.0.1:5213/checkout');
   await page.getByText('Quote unavailable. Retry.',{exact:false}).waitFor();assert(await pay.isDisabled());
   rewardFail=false;await page.locator('.dn-order-summary').getByRole('button',{name:'Try again',exact:true}).click();
   await page.getByRole('progressbar').waitFor();
   // Verification uses server response, clears purchased quantity only once and supports receipt return.
   paid=true;await page.goto('http://127.0.0.1:5213/checkout/complete?reference='+reference);
   await page.getByRole('heading',{name:'Order confirmed.',exact:true}).waitFor();
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('vn-discover-bag-v1'))),[]);
   await page.getByRole('button',{name:'View receipt',exact:true}).click();
   await page.getByRole('button',{name:'Back to confirmation',exact:true}).click();
   await page.getByRole('button',{name:'View receipt',exact:true}).waitFor();
   await page.screenshot({path:`work/audit-confirmation-${width}.png`,fullPage:true});
   await page.getByRole('link',{name:'Track order',exact:true}).click();
   await page.getByRole('button',{name:'Saved items, 1',exact:true}).waitFor();
   await page.getByLabel('Order reference',{exact:true}).fill(reference);
   await page.getByLabel('Order email or phone',{exact:true}).fill('audit@example.com');
   await page.getByRole('button',{name:'Find my order',exact:true}).click();
   await page.getByText('No matching order. Check your reference and contact details.',{exact:true}).waitFor();
   assert(await page.getByRole('button',{name:'Find my order',exact:true}).isEnabled());
   if(width===390){
    verifyHang=true;await page.goto('http://127.0.0.1:5213/checkout/complete?reference='+reference);
    await page.getByText('The connection was interrupted. Checking again automatically; please do not pay again.',{exact:true}).waitFor({timeout:26000});
    verifyHang=false;await page.getByRole('button',{name:'Check payment again',exact:true}).click();
    await page.getByRole('heading',{name:'Order confirmed.',exact:true}).waitFor();
   }
   assert.deepEqual(errors,[]);results.push({width,passed:true});await page.close();
   console.log('PASS real customer journey, checkout/retry/cancel/receipt, failed bag recovery, counts and hero navigation',width);
  }
  fs.writeFileSync('work/launch-journeys.json',JSON.stringify(results,null,2));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
