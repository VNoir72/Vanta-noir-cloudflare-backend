import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {build} from 'esbuild';
const output=await build({entryPoints:['lib/studio-photo.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {studioPhoto}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
test('compact studio index preserves every verified mapping and leaves new references unchanged',async()=>{
 const mapping=JSON.parse(await readFile('lib/product-photo-assets.json','utf8'));
 for(const [source,target] of Object.entries(mapping))assert.equal(studioPhoto(source),target,source);
 for(const source of ['/images/catalogue/new-reference.webp','https://media.example/new.webp','/images/logo.png'])assert.equal(studioPhoto(source),source);
});
