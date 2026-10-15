import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Protect the token boundary responsible for white text on pearl pages.
test('saved accent changes button ink, never the shared page-text token',async()=>{
 const source=await readFile('components/store-header.tsx','utf8');
 assert.match(source,/setProperty\('--vn-brand-on-accent',accentInk/);
 assert.doesNotMatch(source,/setProperty\('--vn-brand-ink'/);
 for(const file of ['app/storefront.css','app/storefront-organization.css']){
  const css=await readFile(file,'utf8');
  for(const rule of css.split('}').filter(r=>r.includes('background:var(--vn-brand-lime'))){assert.doesNotMatch(rule,/color:var\(--vn-brand-ink/);}
 }
});
test('floating ribbon SVG receives the saved website accent token',async()=>{
 const source=await readFile('components/ribbon-background.tsx','utf8');assert.match(source,/ribbonSvg\(theme,moving,id,'var\(--vn-brand-lime/);
});
