import assert from "node:assert/strict";
import {readFile,readdir,stat} from "node:fs/promises";
import {resolve} from "node:path";
const root=resolve(process.argv[2]||"outputs/namecheap");
const files=(await readdir(root,{recursive:true})).filter(f=>f.endsWith(".html"));
let checked=0;
for(const file of files){
  const html=await readFile(resolve(root,file),"utf8");
  assert.doesNotMatch(html,/href="\/about"/,`${file} must not link to the retired About page`);
  assert.match(html,/<h1\b/,`${file} must have a page heading`);
  assert.equal((html.match(/class="vn-liquid-header"/g)||[]).length,1,`${file} must use the single current header`);
  assert.doesNotMatch(html, /class="(?:dn-header|vn-store-header)(?: |")/, `${file} contains a retired header`);
  assert.match(html,/aria-label="Open search"/,`${file} needs the inline search control`);
  assert.match(html,/aria-label="Close search"/,`${file} needs the search close control`);
  assert.doesNotMatch(html,/maximum-scale=1|user-scalable=no/,`${file} must preserve accessibility zoom`);

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
for(const product of catalog){const html=await readFile(resolve(root,`products/${product.slug}.html`),"utf8");assert.doesNotMatch(html,/dn-product-specs/,`${product.slug} must wait for the live catalogue`);assert.ok(!html.includes(product.name),`${product.slug} must not embed a product name`);assert.match(html,/"products":\[\]/);}
console.log(`Verified privacy-safe product shells on ${catalog.length} product pages.`);

const home=await readFile(resolve(root,"index.html"),"utf8");
assert.doesNotMatch(home,/THE VANTA NOIR EDIT\s*\/\s*001/);
assert.match(home,/aria-label="Open menu"/);
assert.match(home,/aria-label="Main navigation"/); // Direct links on tablets/desktop; hamburger on phones.
assert.doesNotMatch(home,/href="\/about"/);
assert.doesNotMatch(home,/class="dn-categories"|class="dn-announcement"/); // Category discovery lives below the hero; no duplicate header strip.
// The hero is intentionally selected after URL/audience hydration; inspect its shipped bundle too.
const entry=home.match(/<script type="module" src="([^"]+)"/)[1];
const javascript=await readFile(resolve(root,entry.slice(1)),"utf8");
assert.match(javascript,/Current campaign/);
assert.doesNotMatch(javascript,/THE VANTA NOIR EDIT\s*\/\s*001|dn-hero-index/);
const security=await readFile(resolve(root,".htaccess"),"utf8");
for(const header of ['X-Frame-Options','Content-Security-Policy','Permissions-Policy','Strict-Transport-Security'])assert.ok(security.includes(header));
assert.ok(security.includes('Require all denied'));
console.log('Campaign markup and static-host security rules passed.');

// Prevent a pre-studio bundle from passing release validation with new photos beside it.
const studioPhotos=JSON.parse(await readFile("lib/product-photo-assets.json","utf8"));
for(const image of new Set(Object.values(studioPhotos))){
  assert.ok(javascript.includes(image),`Application bundle does not map studio image: ${image}`);
  assert.ok((await stat(resolve(root,"."+image))).isFile(),`Missing studio image: ${image}`);
}
console.log(`Verified studio mapping and delivery files for ${Object.keys(studioPhotos).length} photographs.`);

// Keep seed snapshots out of the startup payload and preserve deferred modules.
assert.ok(Buffer.byteLength(javascript) < 2_000_000, "Startup JavaScript exceeded the 2 MB uncompressed budget");
assert.match(home, /rel="preload" as="image"[^>]+media="\(max-width: 767px\)"/);
assert.match(home, /rel="preload" as="image"[^>]+media="\(min-width: 768px\)"/);
for (const chunk of [...javascript.matchAll(/catalog-images-[A-Za-z0-9_-]+\.js/g)]) {
  assert.ok((await stat(resolve(root,"assets",chunk[0]))).isFile(), "Missing deferred catalogue module");
}
console.log(`Startup JavaScript budget passed: ${Buffer.byteLength(javascript)} bytes.`);
