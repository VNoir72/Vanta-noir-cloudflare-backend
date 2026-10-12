export type HeroMode='mixed'|'products'|'campaigns'|'videos';
export type HeroMedia={url:string;type:'image'|'video';alt:string;link?:string;startsAt?:string;endsAt?:string};
export type HeroSlot={kind:'product'|'media'|'hidden';productIndex?:number;url?:string};
export function heroSlides<P>(hero:{slots?:HeroSlot[];contentMode?:HeroMode;productsFirst?:boolean;fourthSlideEnabled?:boolean;playlist?:HeroMedia[]},products:P[],fallback:HeroMedia){
 const max=hero.fourthSlideEnabled?4:3;
 const now=Date.now();
 const media=(hero.playlist?.length?hero.playlist:[fallback]).filter(m=>(!m.startsAt||Date.parse(m.startsAt)<=now)&&(!m.endsAt||Date.parse(m.endsAt)>now));
 if(hero.contentMode==='videos')return media.filter(m=>m.type==='video').slice(0,max).map(media=>({media,product:undefined as P|undefined}));
 if(hero.slots?.length)return hero.slots.slice(0,max).flatMap<{product:P|undefined;media:HeroMedia|undefined}>(s=>s.kind==='product'&&products[s.productIndex||0]?[{product:products[s.productIndex||0],media:undefined}]:s.kind==='media'&&media.find(m=>m.url===s.url)?[{product:undefined,media:media.find(m=>m.url===s.url)}]:[]);
 const p=hero.contentMode==='campaigns'?[]:products.map(product=>({product,media:undefined as HeroMedia|undefined}));
 const m=hero.contentMode==='products'&&p.length?[]:media.map(media=>({media,product:undefined as P|undefined}));
 return (hero.productsFirst?[...p,...m]:[...m,...p]).slice(0,max);
}

export function heroProductImage(product:{id:string;imageUrl?:string;colorways?:{imageUrl?:string}[]},cutouts?:Record<string,string>){return cutouts?.[product.id]||product.imageUrl||product.colorways?.[0]?.imageUrl||'/images/vanta-burgundy-set-cutout.png';}
