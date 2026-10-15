import fs from 'node:fs';
import {developmentConstruction,garmentFamily} from '../../lib/garment-development.mjs';
const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Usage: node complete-garments.mjs source.json output.json');
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const core={
 'vn-p005':['Relaxed utility fit','100% cotton twill, 220 GSM','Button front; retain saved utility pocket arrangement and original panel layout.',65000],
 'vn-p006':['Relaxed rugby fit','100% cotton jersey, 280 GSM; cotton twill collar','Rugby collar and concealed button placket; retain original stripe and crest positions.',55000],
 'vn-p008':['Relaxed athletic fit','100% polyester mesh, 180 GSM; rib binding 95% polyester/5% elastane','Sleeveless basketball construction; preserve split colour panels and original numbering/artwork.',45000],
 'vn-p009':['Relaxed sleeveless fit','100% polyester interlock, 160 GSM','Bound neck and armholes; reflective outline follows saved reference, not a safety-certified visibility claim.',35000],
 'vn-p011':['Relaxed knit fit','100% cotton cable-knit, target 7 gauge; approve washed swatch','Quarter zip with cable-knit body; preserve saved cable repeat, collar and rib widths.',75000],
 'vn-p016':['Relaxed utility fit','100% cotton twill, 260 GSM','Cargo pocket layout and gathered waistband follow saved style; reinforce pocket and belt-loop roots.',70000],
 'vn-p017':['Wide-leg pleated fit','65% polyester/35% viscose woven suiting, 240 GSM','Preserve pleat count, wide leg, waistband and saved pockets; press pleats without flattening fabric texture.',75000],
 'vn-p019':['Relaxed athletic fit','100% polyester double-layer mesh, 170 GSM per outer layer; 110 GSM inner mesh','Elastic waistband and mesh body; retain saved pocket and artwork locations.',40000],
 'vn-p020':['Relaxed Bermuda fit','100% cotton denim, 12 oz/yd²','Bermuda length; retain saved wash, pocket and topstitch layout. Wash before final measurement.',60000],
 'vn-p033':['Relaxed track-jacket fit','100% polyester tricot, 240 GSM; matching stretch rib','Stand collar and front zip; preserve saved panel and piping arrangement.',75000],
 'vn-p036':['Relaxed bomber fit','100% nylon woven shell, 180 GSM; 100% polyester lining, 70 GSM','Bomber silhouette with rib collar/cuffs/hem; retain saved pockets and front zip.',95000],
 'vn-p037':['Relaxed varsity fit','70% wool/30% polyester body, 500 GSM; synthetic-leather sleeves; polyester lining, 80 GSM','Varsity body, rib trims and snap front; preserve saved appliqué and sleeve artwork.',110000],
 'vn-p043':['One size; proposed head circumference 54–60 cm','100% acrylic rib-knit yarn; 7-gauge sampling target','Rib-knit crown and folded cuff; preserve saved emblem placement.',25000],
 'vn-p044':['Adjustable crossbody carry','100% polyester 600D outer; 210D polyester lining','Retain saved sling silhouette, main/front zip positions and adjustable strap.',45000],
 'vn-p047':['Adjustable; proposed usable waist range 75–105 cm','100% polyester woven webbing, 35 mm width','Retain saved triangular V buckle; folded webbing return; no substituted prong buckle.',30000],
 'vn-p049':['Stretch crew sock; sample fit required','75% cotton/22% polyamide/3% elastane','Rib cuff, shaped heel, linked toe; preserve architectural line pattern.',20000],
 'vn-season01-25':['Stretch crew sock; sample fit required','75% cotton/22% polyamide/3% elastane','Rib cuff, shaped heel, linked toe; preserve saved ankle emblem.',20000],
 'vn-p050':['Close-fitting stretch boxer brief','95% cotton/5% elastane jersey, 180 GSM','Retain topographic print and waistband design; soft gusset seams.',18000],
 'vn-pdf-p01-2-25':['Close-fitting stretch boxer brief','95% cotton/5% elastane jersey, 180 GSM','Retain original waistband and pouch construction.',18000],
 'vn-stealth':['Oversized hoodie with genuinely baggy trousers','Heavyweight cotton-rich fleece; retain saved composition and weight specification','Retain exact Stealth cut, reflective piping, hood and original branding.',120000]
};
const fallbackPrices={eyewear:35000,bottle:30000,glove:25000,sock:20000,belt:30000,bag:50000,knit:75000,cap:35000,bra:30000,stretch:30000,denim:85000,fleece:75000,shell:85000,outerwear:110000,shirt:65000,woven:75000,jersey:40000};
const audit=[];
for(const p of data.products){const d=JSON.parse(p.details_json||'{}'),before={...d};const spec=core[p.id];
 if(spec){const [fit,fabric,features]=spec;
 for(const [key,value]of Object.entries({fit,fabric,features}))if(!d[key]?.trim())d[key]=(key==='fit'?'Proposed: ':'R06 sampling proposal: ')+value;
 if(!d.care?.trim())d.care='Proposed care pending wash test: '+(/wool|leather/i.test(d.fabric)?'specialist professional cleaning; no tumble drying, bleach or direct heat.':/knit|beanie/i.test(p.name)?'gentle hand wash cold, reshape and dry flat; no bleach or tumble drying.':/bag|belt/i.test(p.name)?'spot clean with mild soap and a damp cloth; air dry; do not immerse hardware.':'wash inside out at 30°C with like colours, mild detergent; no bleach; air dry; avoid ironing prints or reflective trims.');
 if(!d.contents?.trim())d.contents=/sock/i.test(p.name)?'One pair of socks.':p.id==='vn-stealth'?'One hoodie and one pair of trousers.':'One '+p.name.toLowerCase()+'; styling garments excluded.';
 }
 if(d.sizeGuide?.status==='proposed')d.sizeGuide.status='reference';
 for(const section of d.sizeGuide?.sections||[])section.title=section.title.slice(0,60);
 Object.assign(d,developmentConstruction(p,d));
 const price=Number.isSafeInteger(p.price_kobo)&&p.price_kobo>0?p.price_kobo/100:(spec?.[3]||fallbackPrices[garmentFamily(p,d)])*(/sets|tracksuits/i.test(p.category||'')?1.6:1);
 d.suggestedPriceNgn=Math.round(price);if(!p.price_kobo){p.price_kobo=Math.round(price*100);d.priceStatus='proposed';}
 p.details_json=JSON.stringify(d);audit.push({id:p.id,name:p.name,family:garmentFamily(p,d),priceNgn:p.price_kobo/100,priceStatus:d.priceStatus||'approved',filled:Object.keys(d).filter(k=>JSON.stringify(d[k])!==JSON.stringify(before[k])),sampleConfirmed:d.sizeGuide?.status==='confirmed'});
}
fs.writeFileSync(output,JSON.stringify(data));fs.writeFileSync(output.replace(/\.json$/,'.audit.json'),JSON.stringify(audit,null,2));
console.log(JSON.stringify({products:audit.length,proposedFields:audit.reduce((n,p)=>n+p.filled.length,0),missingCore:data.products.filter(p=>{const d=JSON.parse(p.details_json);return ['fit','fabric','features','care','contents'].some(k=>!d[k]?.trim());}).map(p=>p.id)}));
