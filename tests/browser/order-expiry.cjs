// Run after npm run build:storefront. Uses mocked APIs; never charges or books.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const server=spawn('python3',['-m','http.server','5181','--bind','127.0.0.1'],{cwd:resolve(__dirname,'../../outputs/namecheap')});
(async()=>{await new Promise(r=>setTimeout(r,400));const browser=await chromium.launch({headless:true,executablePath:'/tmp/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));let quotes=0,lookups=0,lastQuote;
 const item={productId:'tee',variantId:'tee-M',name:'Vanta Tee',size:'M',color:'Black',imageUrl:'/test.png',priceKobo:100000,quantity:1};
 await page.addInitScript(i=>{if(!localStorage.getItem('vn-discover-bag-v1'))localStorage.setItem('vn-discover-bag-v1',JSON.stringify([i]));},item);
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let json={};
 if(path==='/api/catalog')json={products:[{id:'tee',name:'Vanta Tee',priceKobo:100000,colorways:[{name:'Black',imageUrl:'/test.png',stock:{M:5},variantIds:{M:'tee-M'}}]}],checkout:{checkoutReady:true,acceptingOrders:true,shipbubbleCheckoutEnabled:true,internationalCourierEnabled:true,internationalEnabled:false,internationalZones:[],shippingCountries:[['NG','Nigeria'],['GB','United Kingdom'],['US','United States']],customTransferEnabled:true,internationalDutiesNote:'Import duties may apply.'}};
 if(path==='/api/shipping/address'){lookups++;json={postalCode:'100001'};}
 if(path==='/api/shipping/quotes'){quotes++;lastQuote=route.request().postDataJSON();assert.ok(lastQuote.customer.countryCode!=='NG'||lastQuote.customer.state);json={quoteId:'q-'+quotes,expiresAt:Date.now()+900000,rates:[{rateId:'expensive',provider:'shipbubble',carrier:'Other Courier',amountKobo:900000,delivery:'2 days'},{rateId:'cheap',provider:'shipbubble',carrier:'Cheapest Courier',amountKobo:600000,delivery:'3 days'}]};}
 if(path==='/api/rewards/quote'){const selected=route.request().postDataJSON().shippingSelection;if(selected)assert.equal(selected.rateId,'cheap');json={subtotalKobo:100000,discountKobo:0,shippingSavingsKobo:0,baseShippingKobo:selected?600000:null,shippingKobo:selected?600000:null,totalKobo:selected?700000:null,signature:'test'};}
 if(path==='/api/checkout')json={reference:'VN-PREVIEW',receiptToken:'preview-token',transfer:{reference:'VN-PREVIEW',bankName:'Preview Bank',accountName:'Vanta Noir',accountNumber:'0000000000',amountKobo:700000,expiresAt:new Date(Date.now()+3500).toISOString()}};if(path==='/api/payments/verify')json={order:{reference:'VN-PREVIEW',paymentStatus:'pending',status:'expired'}};await route.fulfill({json});});
 await page.goto('http://127.0.0.1:5181/checkout.html');
 for(const [key,value] of Object.entries({email:'buyer@example.com',firstName:'Test',lastName:'Buyer',phone:'08012345678',addressLine1:'10 Test Street',city:'Ikeja'}))await page.locator(`[name="${key}"]`).fill(value);
 const pay=page.getByRole('button',{name:'Continue to payment'});assert.equal(await pay.isDisabled(),true);assert.equal(quotes,0);
 await page.locator('[name="state"]').selectOption('Lagos');await page.getByText('Delivery is calculated automatically.',{exact:false}).waitFor();assert.equal(await page.getByText(/Cheapest Courier/).count(),0);await page.waitForFunction(()=>!document.querySelector('.dn-pay').disabled);
 await page.waitForFunction(()=>document.querySelector('[name=postalCode]').value==='100001');assert.equal(lookups,1);assert.equal(lastQuote.customer.postalCode,'100001');assert.equal(await page.getByText('Choose delivery',{exact:false}).count(),0);assert.match(await page.locator('.dn-totals').innerText(),/6,000/);
 await page.locator('[name="state"]').selectOption('');assert.equal(await pay.isDisabled(),true);
 await page.locator('[name="countryCode"]').selectOption('GB');assert.equal(await page.locator('[name="postalCode"]').inputValue(),'');assert.equal(await pay.isDisabled(),true);
 await page.locator('[name="city"]').fill('London');await page.locator('[name="postalCode"]').fill('SW1A 2AA');await page.getByText('Delivery is calculated automatically.',{exact:false}).waitFor();assert.equal(await page.getByText(/Cheapest Courier/).count(),0);await page.waitForFunction(()=>!document.querySelector('.dn-pay').disabled);assert.equal(lastQuote.customer.countryCode,'GB');
 await page.locator('[name="countryCode"]').selectOption('US');await page.locator('[name="postalCode"]').fill('10001');assert.equal(await pay.isDisabled(),true);await page.locator('[name="state"]').fill('New York');await page.waitForFunction(()=>!document.querySelector('.dn-pay').disabled);assert.equal(lastQuote.customer.state,'New York');
 await page.locator('.dn-checkbox input').check();await pay.click();await page.getByRole('heading',{name:'Pay by bank transfer'}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vn-discover-bag-v1')).length),0,'Bag clears as payment begins');
 await page.getByRole('heading',{name:'Order expired'}).waitFor();
 assert.equal(await page.getByText('0000000000',{exact:true}).count(),0,'Expired account details disappear');
 assert.equal(await page.getByText(/Do not pay twice/).count(),0,'Expired waiting message disappears');
 await page.reload();await page.getByRole('heading',{name:'Order expired'}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vn-discover-bag-v1')).length),0,'Expired items do not return after refresh');
 await page.getByRole('button',{name:'Notifications',exact:true}).click();await page.getByRole('heading',{name:'Order updates'}).waitFor();
 assert.equal(await page.getByRole('link',{name:/VN-PREVIEW/}).count(),1);
 assert.deepEqual(errors,[]);console.log('PASS: mocked checkout clears bag, expires account, removes warning, survives refresh and lists order under bell.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
