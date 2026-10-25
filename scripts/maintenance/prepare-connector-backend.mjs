import fs from 'node:fs';import path from 'node:path';import {gzipSync} from 'node:zlib';
const output=process.argv[2];if(!output)throw Error('Provide a release output directory');
fs.mkdirSync(output,{recursive:true});const modules=[],assets={};
function visit(directory,each){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file,each);else each(file);}}
visit('dist/server',file=>{if(file.endsWith('.js')){const name=path.relative('dist/server',file);modules.push({name:name==='index.js'?'backend.js':name,content:fs.readFileSync(file,'utf8')});}});
visit('dist/client/_next',file=>{if(/\.(?:js|css)$/.test(file)){const name='/'+path.relative('dist/client',file);assets[name]={body:fs.readFileSync(file,'utf8'),type:file.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8'};}});
// Generated immutable text assets travel with this exact Worker version. Existing
// binary assets stay in the ASSETS binding; scheduled jobs retain the original env.
modules.push({name:'release-assets.js',content:'export default '+JSON.stringify(assets)+';'});
modules.push({name:'index.js',content:`import worker from './backend.js';import assets from './release-assets.js';export * from './backend.js';export default {async fetch(request,env,ctx){const file=assets[new URL(request.url).pathname];if(file&&['GET','HEAD'].includes(request.method))return new Response(request.method==='HEAD'?null:file.body,{headers:{'Content-Type':file.type,'Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'}});const previous=env.ASSETS;return worker.fetch(request,{...env,ASSETS:{fetch:async input=>{const item=assets[new URL(input.url).pathname];return item?new Response(input.method==='HEAD'?null:item.body,{headers:{'Content-Type':item.type,'X-Content-Type-Options':'nosniff'}}):previous.fetch(input);}}},ctx);},scheduled(controller,env,ctx){return worker.scheduled(controller,env,ctx);}};`});
fs.writeFileSync(path.join(output,'backend-modules.json'),JSON.stringify(modules));
fs.writeFileSync(path.join(output,'backend-modules.gz.b64'),gzipSync(JSON.stringify(modules)).toString('base64'));
console.log({modules:modules.length,generatedAssets:Object.keys(assets).length,transportBytes:fs.statSync(path.join(output,'backend-modules.gz.b64')).size});
