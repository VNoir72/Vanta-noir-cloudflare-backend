const fs=require('fs'),path=require('path'),sharp=require('sharp'),crypto=require('crypto');
const root=__dirname,out=path.join(root,'r10-assets');
const masterPath=path.join(root,'master-r10/extracted/VANTA_NOIR_Master_Vector_Geometry_2026/03_Emblems/Gold_Source_Outline.svg');
const master=fs.readFileSync(masterPath,'utf8');
const paths=[...master.matchAll(/<path[^>]*d="([^"]+)"[^>]*\/>/g)].map(m=>m[1]);
if(!paths.length)throw Error('No master paths');
const points=paths.flatMap(d=>[...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m=>[+m[1],+m[2]]));
const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1]));
const w=Math.max(...points.map(p=>p[0]))-minX,h=Math.max(...points.map(p=>p[1]))-minY;
const shape=fill=>paths.map(d=>`<path fill="${fill}" fill-rule="evenodd" d="${d}"/>`).join('');
const defs='<defs><linearGradient id="gold" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#fff1cc"/><stop offset=".22" stop-color="#c6aa7d"/><stop offset=".47" stop-color="#f0d7a3"/><stop offset=".7" stop-color="#9c7d49"/><stop offset="1" stop-color="#d9bc88"/></linearGradient></defs>';
function emblem(x,y,width,{fill='#f6f4ed',squeeze=1,skew=0,metal=false}={}){
 const scale=width/w;
 const g=`<g transform="translate(${x} ${y}) matrix(${squeeze} ${skew} 0 1 0 0) scale(${scale}) translate(${-minX} ${-minY})">${shape(fill)}</g>`;
 if(!metal)return g;
 const shadow=`<g transform="translate(${x+2} ${y+4}) matrix(${squeeze} ${skew} 0 1 0 0) scale(${scale}) translate(${-minX} ${-minY})">${shape('#6e593a')}</g>`;
 return shadow+g;
}
async function compose(name,source,overlay){
 const p=path.join(root,'generated_images',source),m=await sharp(p).metadata();
 const base=await sharp(p).png().toBuffer();
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}" viewBox="0 0 ${m.width} ${m.height}">${defs}<image width="${m.width}" height="${m.height}" href="data:image/png;base64,${base.toString('base64')}"/>${overlay}</svg>`;
 fs.writeFileSync(path.join(out,name+'.svg'),svg);
 await sharp(Buffer.from(svg)).resize({width:1100,withoutEnlargement:true}).webp({quality:94}).toFile(path.join(out,name+'.webp'));
}
(async()=>{
 await compose('vn-pdf-p05-3-r5-c5-jet-black-front-r10','exec-f568bace-8338-4c84-9cdc-079d27866996.png',emblem(676,438,130));
 await compose('vn-pdf-p05-3-r5-c5-jet-black-left-r10','exec-c588ae6b-cc7f-4113-b115-d7fe238fbb64.png',emblem(140,540,100,{squeeze:.17,skew:-.12}));
 await compose('vn-vd-p04-2-25-black-front-r10','exec-327dea05-73b6-4634-a83d-c294c587e20b.png',emblem(354,672,380,{fill:'url(#gold)',metal:true}));
 await compose('vn-vd-p04-2-25-black-left-r10','exec-f665fe08-01dc-4d43-b343-140f64b95059.png',emblem(178,620,355,{fill:'url(#gold)',squeeze:.66,skew:.24,metal:true}));
 await compose('vn-vd-p04-2-25-black-right-r10','exec-ee5245ac-755d-42ff-ac36-40a3d23a8212.png',emblem(696,676,355,{fill:'url(#gold)',squeeze:.48,skew:-.28,metal:true}));
 await sharp(path.join(root,'generated_images/exec-f55ab8e9-3c3d-4ee9-84c5-595c92a4a44d.png')).resize({width:1100,withoutEnlargement:true}).webp({quality:94}).toFile(path.join(out,'vn-vd-p04-2-25-black-back-r10.webp'));
 for(const [name,width,fill] of [['vest-emblem-80mm',80,'#FFFFFF'],['belt-emblem-62mm',62,'#C6AA7D']]){
  fs.writeFileSync(path.join(out,name+'.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${width*h/w}mm" viewBox="${minX} ${minY} ${w} ${h}"><title>Vanta Noir R10 exact supplied master contour</title>${shape(fill)}</svg>`);
 }
 fs.writeFileSync(path.join(out,'master-geometry-verification.json'),JSON.stringify({source:masterPath.split('/').pop(),sourceSha256:crypto.createHash('sha256').update(master).digest('hex'),pathGeometrySha256:crypto.createHash('sha256').update(paths.join('\n')).digest('hex'),bounds:{minX,minY,width:w,height:h},belt:{widthMm:62,heightMm:62*h/w},vest:{widthMm:80,heightMm:80*h/w},method:'Original path strings retained exactly; colour and placement transforms only. Side perspective transforms affect mockups only; 1:1 manufacturing files preserve proportions.'},null,2));
 console.log('Rendered exact-vector compositions and 1:1 masters');
})();
