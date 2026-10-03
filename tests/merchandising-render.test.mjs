import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

await mkdir('work',{recursive:true});
await build({entryPoints:['components/homepage-merchandising.tsx','components/customer-signup.tsx','components/campaign-hero.tsx'],outdir:'work/merch-render',bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'}});
const {HomepageMerchandising}=await import(pathToFileURL(resolve('work/merch-render/homepage-merchandising.js')));
const {CustomerSignup}=await import(pathToFileURL(resolve('work/merch-render/customer-signup.js')));
const {CampaignHero}=await import(pathToFileURL(resolve('work/merch-render/campaign-hero.js')));
const ready={id:'ready',name:'New <script>not-code</script>',slug:'new-shirt',imageUrl:'/images/test.webp',imageAlt:'A shirt',priceKobo:3000000,featured:true,details:{availability:'in_stock',priceStatus:'approved',releaseDate:new Date().toISOString().slice(0,10)},colorways:[{imageUrl:'/images/test.webp',stock:{M:2,L:1}}]};
const preview={...ready,id:'preview',slug:'preview-shirt',details:{...ready.details,availability:'preview',priceStatus:'proposed'}};
test('homepage features selected products without a New Arrivals shelf',()=>{
 const html=renderToStaticMarkup(createElement(HomepageMerchandising,{products:[ready,preview],emailEnabled:true,data:{stockBadgesEnabled:true,sales:[{productId:'ready',units30:9,orders30:4,units7:5,orders7:3}]}}));
 for(const id of ['featured-pieces','best-sellers'])assert.ok(html.includes(`id="${id}"`));
 assert.ok(html.includes('href="/products/new-shirt"'));
 assert.ok(!html.includes('Selling fast')); assert.ok(html.includes('Low stock · 3 left across sizes'));assert.ok(html.includes('Price at launch'));
 assert.ok(!html.includes('id="new-arrivals"'));assert.ok(!html.includes('id="coming-soon"'));
 assert.ok(html.includes('aria-roledescription="carousel"'));assert.ok(html.includes('Featured Drop'));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Homepage sections must not duplicate DOM IDs');
 assert.ok(!html.includes('<script>not-code</script>'));assert.ok(html.includes('&lt;script&gt;'));
});
test('no-sales and disabled-email render does not fabricate popularity or offer unavailable signup',()=>{
 const html=renderToStaticMarkup(createElement(HomepageMerchandising,{products:[preview],emailEnabled:false,data:{sales:[],stockBadgesEnabled:false}}));
 assert.ok(!html.includes('id="best-sellers"'));assert.ok(!html.includes('Selling fast'));assert.ok(!html.includes('Low stock'));assert.ok(!html.includes('Notify me'));assert.ok(html.includes('Featured Drop'));assert.ok(!html.includes('id="new-arrivals"'));
});
test('release signup is product-specific and requires email and explicit consent',()=>{
 const html=renderToStaticMarkup(createElement(CustomerSignup,{productId:'preview'}));
 assert.ok(html.includes('Email me when this piece launches'));
 assert.match(html,/type="email"[^>]*required=""/);assert.match(html,/type="checkbox" required=""/);
 assert.ok(html.includes('release of this piece only'));assert.ok(html.includes('href="/privacy-policy"'));
});

test('campaign hero removes edit caption and supports mobile artwork, escaped copy and linked artwork-only mode',()=>{
 const html=renderToStaticMarkup(createElement(CampaignHero,{}));
 assert.ok(html.includes('Your next'));assert.ok(!html.includes('EDIT / 001'));
 const value={image:'/images/test.webp',mobileImage:'/images/mobile.webp',alt:'Campaign',title:'<script>text</script>',body:'New collection',kicker:'New',buttonText:'Shop campaign',buttonLink:'/?collection=Noir',showText:true,focus:'right'};
 const custom=renderToStaticMarkup(createElement(CampaignHero,{value}));
 assert.ok(custom.includes('media="(max-width: 700px)"'));assert.ok(custom.includes('srcSet="/images/mobile.webp"'));assert.ok(custom.includes('&lt;script&gt;'));assert.ok(custom.includes('href="/?collection=Noir"'));
 const artwork=renderToStaticMarkup(createElement(CampaignHero,{value:{...value,showText:false}}));
 assert.ok(!artwork.includes('<h1'));assert.ok(artwork.includes('aria-label="Shop campaign"'));assert.ok(artwork.includes('data-artwork="true"'));
});
