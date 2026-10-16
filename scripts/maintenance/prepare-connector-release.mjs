import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),blake=require('blake3-wasm');
const [name,directory,outputDirectory]=process.argv.slice(2);
if(!['backend','storefront'].includes(name)||!directory||!outputDirectory)throw Error('Usage: backend|storefront asset-directory output-directory');
fs.mkdirSync(outputDirectory,{recursive:true});const manifest={},lookup={};
function visit(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name.startsWith('.'))continue;const p=path.join(d,e.name);if(e.isDirectory())visit(p);else if(e.isFile()){const bytes=fs.readFileSync(p),hash=blake.hash(bytes.toString('base64')+path.extname(p).slice(1)).toString('hex').slice(0,32);manifest['/'+path.relative(directory,p)]={hash,size:bytes.length};lookup[hash]=path.resolve(p);}}}
visit(directory);fs.writeFileSync(path.join(outputDirectory,name+'-assets-manifest.json'),JSON.stringify(manifest));fs.writeFileSync(path.join(outputDirectory,name+'-assets-lookup.json'),JSON.stringify(lookup));
const modules=[];if(name==='backend'){const root='dist/server';function read(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())read(p);else if(e.name.endsWith('.js'))modules.push({name:path.relative(root,p),content:fs.readFileSync(p,'utf8')});}}read(root);}else modules.push({name:'index.js',content:fs.readFileSync('worker/storefront.mjs','utf8')});
const compressed=gzipSync(JSON.stringify(modules),{level:9}).toString('base64');fs.writeFileSync(path.join(outputDirectory,name+'-modules.gz.b64'),compressed);console.log(JSON.stringify({name,assets:Object.keys(manifest).length,modules:modules.length,transportBytes:compressed.length}));
