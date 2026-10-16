import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {buildTechPack,renderTechPackHTML} from '../../lib/tech-packs.mjs';
const [snapshotPath,missingPath,outputPath]=process.argv.slice(2);
const snapshot=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const manifest=JSON.parse(fs.readFileSync('data/tech-pack-pdf-r07.json','utf8'));
const entries=Object.entries(manifest).flatMap(([id,rows])=>rows.map(r=>({id,...r})));
const indices=JSON.parse(fs.readFileSync(missingPath,'utf8'));
const root=path.resolve(outputPath);fs.mkdirSync(path.join(root,'pdf'),{recursive:true});fs.mkdirSync(path.join(root,'assets'),{recursive:true});
const downloads=new Map(),coverage=[];
for(const index of indices){const entry=entries[index],product=snapshot.products.find(p=>p.id===entry.id);if(!product)throw Error('Missing garment '+entry.id);
 const pack=buildTechPack(product,snapshot.product_images.filter(i=>i.product_id===entry.id),snapshot.product_variants.filter(v=>v.product_id===entry.id),{color:entry.color});
 let html=renderTechPackHTML(pack);
 html=html.replace(/(src|href)="(https:\/\/api\.vantanoir\.store\/[^"<>]+)"/g,(_,attr,url)=>{const parsed=new URL(url.replaceAll('&amp;','&'));const ext=path.extname(parsed.pathname)||'.bin';const name=crypto.createHash('sha256').update(url).digest('hex').slice(0,24)+ext;const local=path.join(root,'assets',name),source=path.resolve('public','.'+parsed.pathname);if(fs.existsSync(source))fs.copyFileSync(source,local);else downloads.set(url,{url:parsed.href,path:local});return `${attr}="assets/${name}"`;});
 const file=entry.file.replace(/\.pdf$/,'.html');fs.writeFileSync(path.join(root,file),html);coverage.push({id:entry.id,color:entry.color,file,pages:(html.match(/<article class="sheet">/g)||[]).length});
}
fs.writeFileSync(path.join(root,'coverage.json'),JSON.stringify(coverage,null,2));fs.writeFileSync(path.join(root,'downloads.json'),JSON.stringify([...downloads.values()],null,2));console.log(JSON.stringify({packs:coverage.length,downloads:downloads.size}));
