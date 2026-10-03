import {readFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
const rows=JSON.parse(await readFile('data/catalogue-approved-view-updates.json','utf8'));
const mapping=JSON.parse(await readFile('lib/product-photo-assets.json','utf8'));
const sources=new Set(rows.flatMap(r=>Object.values(r.views)));
assert.equal(Object.keys(mapping).length,sources.size);
for(const source of sources){
  const target=mapping[source];
  assert.ok(target?.startsWith('/images/catalogue/studio-grey/'));
  const bytes=await readFile('public'+target);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok((await stat('public'+source)).size>0);
}
console.log(`Verified ${sources.size} studio views and preserved original files.`);
