import sharp from 'sharp';
import {readdir,readFile,writeFile} from 'node:fs/promises';
const targets=process.argv.slice(2);
if(!targets.length)throw new Error('Provide output directories');
const files=(await readdir('public/images/catalogue')).filter(n=>n.endsWith('.webp'));
let index=0,before=0,after=0;
await Promise.all(Array.from({length:4},async()=>{while(index<files.length){const name=files[index++],original=await readFile(`public/images/catalogue/${name}`),optimized=await sharp(original).webp({quality:76,effort:5}).toBuffer(),bytes=optimized.length<original.length?optimized:original;before+=original.length;after+=bytes.length;for(const target of targets)await writeFile(`${target}/images/catalogue/${name}`,bytes);}}));
console.log(JSON.stringify({images:files.length,originalBytes:before,deliveryBytes:after}));
