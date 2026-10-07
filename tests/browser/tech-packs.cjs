const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {buildTechPack,renderTechPackHTML}=await import('../../lib/tech-packs.mjs');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1150}});
  const product={id:'test-garment',name:'Construction layout verification',category:'Jackets',details_json:JSON.stringify({fabric:'450 GSM wool blend. '.repeat(30),features:'Seams: 10 mm; snaps: 17 mm. '.repeat(50),sizeGuide:{sections:[{title:'Top',rows:[{size:'S',chest:61,length:62}]},{title:'Bottom',rows:[{size:'S',waist:40,inseam:76}]}]}})};
  await page.setContent(renderTechPackHTML(buildTechPack(product)));
  await page.emulateMedia({media:'print'});
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.locator('.sheet').count(),2);
  const fits=await page.locator('.sheet').evaluateAll(sheets=>sheets.every(s=>s.firstElementChild.getBoundingClientRect().height<=s.getBoundingClientRect().height+2));
  await page.screenshot({path:'work/tech-pack-layout.png',fullPage:true});
  console.log(await page.locator('.sheet').evaluateAll(s=>s.map(el=>({sheet:el.getBoundingClientRect().height,content:el.firstElementChild.getBoundingClientRect().height,transform:el.firstElementChild.style.transform}))));
  assert(fits,'Pack content must fit within two landscape sheets');
  const pdf=await page.pdf({format:'A3',landscape:true,preferCSSPageSize:true,printBackground:true});
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2,'Export must contain exactly two PDF pages');
  console.log('PASS tech pack landscape layout and long construction content');
  // Synthetic local PNGs exercise actual browser image decoding without external data.
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=','base64');
  let releaseImages;const imageGate=new Promise(resolve=>{releaseImages=resolve;});
  await page.route('https://api.vantanoir.store/images/**',async route=>{await imageGate;await route.fulfill({contentType:'image/png',body:png});});
  const gallery=['Black','Ivory'].flatMap(color=>['Front','Back','Left','Right'].map(role=>({product_id:'gallery-test',color,image_alt:color+' '+role+' view',image_url:'/images/'+color+'-'+role+'.png'})));
  const galleryPack=buildTechPack({id:'gallery-test',name:'Colour and image export verification',image_url:gallery[0].image_url},gallery,[],{color:'Ivory'});
  await page.setContent(renderTechPackHTML(galleryPack),{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#print').isDisabled(),true,'Print must wait for images');
  releaseImages();
  await page.waitForFunction(()=>!document.getElementById('print').disabled);
  assert.equal(await page.locator('.views img').count(),4);
  assert.equal(await page.locator('.detail-zoom img').count(),3);
  assert(await page.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0&&i.src.includes('Ivory'))));
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  const imagePDF=await page.pdf({format:'A3',landscape:true,preferCSSPageSize:true,printBackground:true});
  assert.equal((imagePDF.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2);
  assert(imagePDF.toString('latin1').includes('/Subtype /Image'),'PDF must embed decoded garment images');
  await page.screenshot({path:'work/tech-pack-images.png',fullPage:true});
  await page.unroute('https://api.vantanoir.store/images/**');
  await page.route('https://api.vantanoir.store/images/**',route=>route.fulfill({status:404,body:'missing'}));
  await page.setContent(renderTechPackHTML(galleryPack));
  await page.waitForFunction(()=>document.getElementById('image-status').textContent.includes('failed'));
  assert.equal(await page.locator('#print').isDisabled(),true,'Missing image bytes must block blank PDF export');
  console.log('PASS saved gallery images, colour isolation, detail magnifications, PDF image embedding and failed-image print guard');
  await page.unroute('https://api.vantanoir.store/images/**');
  const fs=require('node:fs');
  const files=['season-01-jet-black-front.webp','season-01-jet-black-back.webp','season-01-jet-black-side.webp','approved/vn-season01-01-jet-black-right-r03.webp'];
  const actualGallery=files.map((file,i)=>({product_id:'vn-season01-01',color:'Jet Black',image_alt:'Oversized Graphic Tee — Jet Black, '+['front','back','left','right'][i]+' view',image_url:'/images/catalogue/'+file}));
  const allowed=new Map(files.map(file=>['https://api.vantanoir.store/images/catalogue/'+file,'public/images/catalogue/'+file]));
  await page.route('https://api.vantanoir.store/images/**',route=>{const path=allowed.get(route.request().url());return path?route.fulfill({contentType:'image/webp',body:fs.readFileSync(path)}):route.abort();});
  const actualProduct={id:'vn-season01-01',name:'Oversized Graphic Tee',category:'Streetwear',image_url:actualGallery[0].image_url,details_json:JSON.stringify({audience:'unisex',garmentType:'Oversized Graphic Tee',fit:'Oversized silhouette',fabric:'Cotton jersey (design target).',fabricWeight:'260 GSM (design target)',features:'Oversized silhouette',contents:'One tee'})};
  await page.setContent(renderTechPackHTML(buildTechPack(actualProduct,actualGallery)));
  await page.waitForFunction(()=>!document.getElementById('print').disabled);
  assert.equal(await page.locator('.views img').count(),4);
  assert(await page.locator('.views img').evaluateAll(images=>images.every(img=>img.naturalWidth>100&&img.naturalHeight>100)));
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  const actualPDF=await page.pdf({format:'A3',landscape:true,preferCSSPageSize:true,printBackground:true});
  assert.equal((actualPDF.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2);
  assert((actualPDF.toString('latin1').match(/\/Subtype \/Image/g)||[]).length>=4,'Real garment PDF must embed four distinct view images');
  await page.screenshot({path:'work/tech-pack-real-garment.png',fullPage:true});
  console.log('PASS real catalogue garment: four decoded views, enlarged details, two PDF sheets, four embedded image objects');


 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
