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
  assert(fits,'Pack content must fit within two landscape sheets');
  await page.screenshot({path:'work/tech-pack-layout.png',fullPage:true});
  console.log('PASS tech pack landscape layout and long construction content');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
