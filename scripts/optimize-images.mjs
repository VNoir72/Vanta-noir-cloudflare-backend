import sharp from 'sharp';
import {readdir,readFile,writeFile} from 'node:fs/promises';
const targets=process.argv.slice(2);
if(!targets.length)throw new Error('Provide output directories');
// Re-encoding the full catalogue must fit the release runner's memory budget.
// Keep only one decoded source in flight and bound libvips' persistent cache.
sharp.concurrency(1);
sharp.cache({memory:32,files:20,items:50});
const files=(await readdir('public/images/catalogue')).filter(n=>n.endsWith('.webp'));
let before=0,after=0;
for(const name of files){
 const original=await readFile(`public/images/catalogue/${name}`);
 const optimized=await sharp(original).webp({quality:76,effort:5}).toBuffer();
 const bytes=optimized.length<original.length?optimized:original;
 before+=original.length;after+=bytes.length;
 for(const target of targets)await writeFile(`${target}/images/catalogue/${name}`,bytes);
}
console.log(JSON.stringify({images:files.length,originalBytes:before,deliveryBytes:after}));
