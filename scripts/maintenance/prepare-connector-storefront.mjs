import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';import {gzipSync} from 'node:zlib';
// The connector cannot authorize the asset-upload endpoint with its account credential.
// Package changed generated text assets as a versioned module; retain existing assets
// for fonts/legacy paths. Normal Wrangler deploys continue to use the ASSETS binding.
const output=process.argv[2];if(!output)throw Error('Provide a release output directory');
fs.mkdirSync(output,{recursive:true});const files={};
function visit(d){for(const entry of fs.readdirSync(d,{withFileTypes:true})){const file=path.join(d,entry.name);if(entry.isDirectory())visit(file);else if(/\.(?:html|js|css|json|webmanifest|txt|xml)$/.test(file)){const p='/'+path.relative('outputs/cloudflare-preview',file);files[p]={body:fs.readFileSync(file,'utf8'),type:({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.txt':'text/plain','.xml':'application/xml'})[path.extname(file)]};}}}
visit('outputs/cloudflare-preview');
const bundled=await build({entryPoints:['cloudflare-storefront/worker.mjs'],bundle:true,write:false,format:'esm',platform:'neutral'});
const wrapper=`import worker from './storefront.mjs';import assets from './release-assets.js';export default {fetch(request,env){const previous=env.ASSETS;return worker.fetch(request,{...env,ASSETS:{fetch:async input=>{const file=assets[new URL(input.url).pathname];return file?new Response(file.body,{headers:{'Content-Type':file.type}}):previous.fetch(input);}}});}};`;
const modules=[{name:'index.js',content:wrapper},{name:'storefront.mjs',content:bundled.outputFiles[0].text},{name:'release-assets.js',content:'export default '+JSON.stringify(files)+';'}];
fs.writeFileSync(path.join(output,'storefront-modules.json'),JSON.stringify(modules));fs.writeFileSync(path.join(output,'storefront-modules.gz.b64'),gzipSync(JSON.stringify(modules)).toString('base64'));
console.log({assets:Object.keys(files).length,modules:modules.length,transportBytes:fs.statSync(path.join(output,'storefront-modules.gz.b64')).size});
