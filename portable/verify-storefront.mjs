import assert from "node:assert/strict";
import {readFile,readdir,stat} from "node:fs/promises";
import {resolve} from "node:path";
const root=resolve(process.argv[2]||"outputs/namecheap");
const files=(await readdir(root,{recursive:true})).filter(f=>f.endsWith(".html"));
let checked=0;
for(const file of files){
  const html=await readFile(resolve(root,file),"utf8");
  assert.match(html,/<h1\b/,`${file} must have a page heading`);
  assert.match(html,/<meta name="description"/,`${file} needs a description`);
  const references=[...html.matchAll(/(?:src|href|content)="([^"<>]+)"/g)].map(m=>m[1]);
  for(const raw of references){
    if(!raw.startsWith("/")&&!raw.startsWith("https://vantanoir.store/"))continue;
    const url=new URL(raw,"https://vantanoir.store");if(url.pathname.startsWith("/api/")||url.pathname==="/admin")continue;
    const pathname=decodeURIComponent(url.pathname);let path=resolve(root,"."+pathname);
    if(pathname==="/")path=resolve(root,"index.html");
    else if(!/\.[a-z0-9]+$/i.test(pathname))path+=".html";
    assert.ok(path.startsWith(root+"/"),"References stay inside the export");
    assert.ok((await stat(path).catch(()=>null))?.isFile(),`${file} references a missing file: ${raw}`);checked++;
  }
  for(const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)){
    const value=JSON.parse(m[1]);if(value["@type"]!=="Product")continue;
    for(const image of value.image){const url=new URL(image);if(url.origin==="https://vantanoir.store")assert.ok((await stat(resolve(root,"."+url.pathname))).isFile());}
  }
  if(file==="checkout.html"||file==="checkout/complete.html")assert.match(html,/noindex,nofollow/);
}
assert.match(await readFile(resolve(root,".htaccess"),"utf8"),/\|checkout\|checkout\/complete/);
assert.match(await readFile(resolve(root,"store-config.js"),"utf8"),/https:\/\/api\.vantanoir\.store/);
assert.ok(!files.some(f=>f.startsWith("qa-")),"Temporary QA files must not be exported");
console.log(`Verified ${files.length} rendered pages and ${checked} local links/assets, including social images, product schema and checkout routes.`);

const catalog=JSON.parse(await readFile("portable/catalog-snapshot.json","utf8"));
for(const product of catalog){const html=await readFile(resolve(root,`products/${product.slug}.html`),"utf8");assert.match(html,/dn-product-specs/,`${product.slug} needs its specifications`);}
console.log(`Verified product specifications on ${catalog.length} product pages.`);
