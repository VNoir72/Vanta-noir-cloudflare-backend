import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const bounds=JSON.parse(await readFile('lib/floating-asset-bounds.json','utf8'));
const manifest=JSON.parse(await readFile('data/floating-assets-manifest.json','utf8'));
const result=await build({entryPoints:['components/garment-visual.tsx'],bundle:true,write:false,platform:'node',format:'esm'});
const {default:GarmentVisual}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('every prepared garment has a valid visible frame within its unchanged source dimensions',()=>{
 assert.equal(Object.keys(bounds).length,manifest.count);
 for(const asset of manifest.assets){const hash=asset.imageUrl.split('/').at(-1).replace('.webp','');const [width,height,x,y,w,h]=bounds[hash];assert.equal(width,asset.width);assert.equal(height,asset.height);assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=width&&y+h<=height,hash);}
});
test('a prepared garment uses its visible frame and the exact transparent source',()=>{
 const asset=manifest.assets[0],hash=asset.imageUrl.split('/').at(-1).replace('.webp','');
 const html=renderToStaticMarkup(createElement(GarmentVisual,{src:asset.imageUrl,alt:'The actual garment'}));
 assert.ok(html.includes(`viewBox="${bounds[hash].slice(2).join(' ')}"`));assert.ok(html.includes(`href="${asset.imageUrl}"`));assert.match(html,/preserveAspectRatio="xMidYMid meet"/);assert.match(html,/aria-label="The actual garment"/);
});
test('new admin uploads remain usable without a prepared visible frame',()=>{
 const html=renderToStaticMarkup(createElement(GarmentVisual,{src:'/images/owner-upload.webp',alt:'New garment'}));assert.match(html,/<img/);assert.match(html,/src="\/images\/owner-upload.webp"/);assert.doesNotMatch(html,/<svg/);
});
