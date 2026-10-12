export type HeroMode='mixed'|'products'|'campaigns'|'videos';
export type HeroMedia={url:string;type:'image'|'video';alt:string;link?:string};
export function heroSlides<P>(hero:{contentMode?:HeroMode;productsFirst?:boolean;fourthSlideEnabled?:boolean;playlist?:HeroMedia[]},products:P[],fallback:HeroMedia){
 const max=hero.fourthSlideEnabled?4:3;
 const media=hero.playlist?.length?hero.playlist:[fallback];
 if(hero.contentMode==='videos')return media.filter(m=>m.type==='video').slice(0,max).map(media=>({media,product:undefined as P|undefined}));
 const p=hero.contentMode==='campaigns'?[]:products.map(product=>({product,media:undefined as HeroMedia|undefined}));
 const m=hero.contentMode==='products'&&p.length?[]:media.map(media=>({media,product:undefined as P|undefined}));
 return (hero.productsFirst?[...p,...m]:[...m,...p]).slice(0,max);
}

export function heroProductImage(product:{id:string;imageUrl?:string;colorways?:{imageUrl?:string}[]},cutouts?:Record<string,string>){return cutouts?.[product.id]||product.imageUrl||product.colorways?.[0]?.imageUrl||'/images/vanta-burgundy-set-cutout.png';}
