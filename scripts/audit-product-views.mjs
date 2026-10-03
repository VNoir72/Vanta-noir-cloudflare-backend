import {readFile,writeFile,mkdir} from 'node:fs/promises';
const source=JSON.parse(await readFile(process.argv[2]||'portable/catalog-snapshot.json','utf8'));
const products=Array.isArray(source)?source:source['/api/catalog']?.products||source.products;
const rows=products.flatMap(p=>p.colorways.map(c=>{const images=(p.images||[]).filter(i=>!i.color||i.color===c.name);const views=images.map(i=>({url:i.imageUrl,view:i.imageUrl.match(/-(front|back|left|right|side)\./)?.[1]||'unclassified'}));return{productId:p.id,name:p.name,colour:c.name,views,missing:['front','back','left','right'].filter(v=>!views.some(i=>i.view===v)),requiresOrientationReview:views.some(i=>i.view==='side')};}));
await mkdir('work',{recursive:true});await writeFile('work/product-view-audit.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify({products:products.length,colourways:rows.length,needsSideReview:rows.filter(r=>r.requiresOrientationReview).length,complete:rows.filter(r=>!r.missing.length).length}));
