import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const load=async path=>{const r=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));};
const luminance=hex=>{const c=hex.slice(1).match(/../g).map(v=>{const n=parseInt(v,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
test('website and app choose legible matching text across presets and custom accents',async()=>{
 const web=await load('lib/brand-accent.ts'),app=await load('mobile/src/brand-accent.ts');
 const samples=['#650d24','#bba064','#c8ff65','#00ff66','#245cff'];
 for(let r=0;r<=255;r+=17)for(let g=0;g<=255;g+=17)for(let b=0;b<=255;b+=17)samples.push('#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''));
 for(const color of samples){const ink=web.accentInk(color);assert.equal(app.accentInk(color),ink);const a=luminance(color),b=luminance(ink);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,color);}
});
