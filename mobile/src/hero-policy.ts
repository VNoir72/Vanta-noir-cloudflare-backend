export type HeroMode='mixed'|'products'|'campaigns'|'videos';
export type HeroMedia={url:string;type:'image'|'video';alt:string;link?:string;startsAt?:string;endsAt?:string};
export type HeroSlot={kind:'product'|'media'|'hidden'|'campaign'|'background';enabled?:boolean;background?:number;presentation?:'floating'|'full';productIndex?:number;url?:string};
export function heroSlides<P>(hero:{firstSlideOnly?:boolean;slots?:HeroSlot[];contentMode?:HeroMode;productsFirst?:boolean;fourthSlideEnabled?:boolean;playlist?:HeroMedia[]},products:P[],fallback:HeroMedia){
 type Slide={product:P|undefined;media:HeroMedia|undefined;background:number;presentation?:'floating'|'full';backgroundOnly?:boolean};
 const max=hero.fourthSlideEnabled?4:3,now=Date.now();
 const media=(hero.playlist?.length?hero.playlist:[fallback]).filter(m=>(!m.startsAt||Date.parse(m.startsAt)<=now)&&(!m.endsAt||Date.parse(m.endsAt)>now));
 let slides:Slide[];
 if(hero.slots?.length)slides=hero.slots.slice(0,4).flatMap<Slide>((s,i)=>{
  if(s.enabled===false||s.kind==='hidden')return [];
  const base={background:s.background??i%3,presentation:s.presentation};
  if(s.kind==='background')return [{...base,product:undefined,media:undefined,backgroundOnly:true}];
  if(s.kind==='campaign')return [{...base,product:undefined,media:fallback,presentation:'floating'}];
  if(s.kind==='product'&&products[s.productIndex||0])return [{...base,product:products[s.productIndex||0],media:undefined}];
  const selected=media.find(m=>m.url===s.url);return s.kind==='media'&&selected?[{...base,product:undefined,media:selected}]:[];
 });
 else {
  const p=hero.contentMode==='campaigns'||hero.contentMode==='videos'?[]:products.map(product=>({product,media:undefined as HeroMedia|undefined}));
  const m=hero.contentMode==='products'&&p.length?[]:media.filter(m=>hero.contentMode!=='videos'||m.type==='video').map(media=>({media,product:undefined as P|undefined}));
  slides=(hero.productsFirst?[...p,...m]:[...m,...p]).slice(0,max).map((s,i)=>({...s,background:i%3}));
 }
 return hero.firstSlideOnly===false?slides:slides.slice(0,1);
}

export function heroProductImage(product:{id:string;imageUrl?:string;colorways?:{imageUrl?:string}[]},cutouts?:Record<string,string>){return cutouts?.[product.id]||product.imageUrl||product.colorways?.[0]?.imageUrl||'/images/vanta-burgundy-set-cutout.png';}
