import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function load(path){const b=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
const {catalogStyles}=await load('lib/catalog-styles.ts');
const {productGallery}=await load('lib/garment-gallery.ts');
const {productLink}=await load('lib/catalog-browsing.ts');
const {saveBrowsePosition,readBrowsePosition}=await load('lib/browse-history.ts');
test('similar designs retain their own URL, measurements and artwork',()=>{
 const products=['a','b'].map(id=>({id,slug:id,name:'Graphic tee',category:'T-shirts',details:{collection:'Street',audience:'men',sizeGuide:{id}},colorways:[{name:id,slug:id}],images:[{imageUrl:id}]}));
 const result=catalogStyles(products,[{reviewed:true,product_ids:['a','b'],recommended_name:'Combined',audience:'men',collection:'Street'}]);
 assert.equal(result.length,2);assert.equal(result[1],products[1]);assert.equal(result[1].details.sizeGuide.id,'b');
});
test('four main views precede separately displayed details, with no cross-colour photos',()=>{
 const image=(view,color='Black')=>({imageUrl:`/${view}.webp`,imageAlt:`Back Detail Hoodie — ${color}; ${view.includes('close')?'detail close-up 1':view+' view'}`,color});
 const images=[image('close'),image('right'),image('front'),image('left'),image('back'),image('white','White')];
 const g=productGallery({images},'Black','/front.webp','Main image');
 assert.deepEqual(g.primary.map(i=>i.imageUrl),['/front.webp','/back.webp','/left.webp','/right.webp']);
 assert.deepEqual(g.details.map(i=>i.imageUrl),['/close.webp']);
});
test('return state retains scroll, expanded count and selected swatches without dropping router state',()=>{
 const history={state:{router:'existing'},replaceState(s){this.state=s;}};
 const position={visibleCount:108,scrollY:5192,cardColors:{a:'bone'}};
 saveBrowsePosition(history,position);assert.equal(history.state.router,'existing');assert.deepEqual(readBrowsePosition(history.state),position);
 assert.equal(readBrowsePosition({vnBrowse:{scrollY:NaN,visibleCount:99}}),undefined);
});
test('detail links retain price range and style filters',()=>{
 const u=new URL(productLink('tee','black',{audience:'All',category:'All',collection:'Street',query:'',minPrice:30000,maxPrice:90000,drop:'Graphic Tee',inStock:true}),'https://example.test');
 assert.equal(u.searchParams.get('minPrice'),'30000');assert.equal(u.searchParams.get('maxPrice'),'90000');assert.equal(u.searchParams.get('drop'),'Graphic Tee');assert.equal(u.searchParams.get('inStock'),'1');
});
