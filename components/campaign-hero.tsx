'use client';
import {useEffect,useState,useRef,type CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,Pause,Play} from 'lucide-react';
import {FeaturedGarment} from './featured-garment';
import StoreImage from './store-image';
import {RibbonBackground} from './ribbon-background';
import {heroSchema,type HeroSettings} from '@/lib/storefront-design';
import {type CatalogProduct,formatNaira} from '@/lib/catalog-runtime';
import {garmentName} from '@/lib/product-names';
import {heroSlides} from '@/mobile/src/hero-policy';
export function CampaignHero({value,products=[],formatPrice=formatNaira}:{value?:HeroSettings;products?:CatalogProduct[];formatPrice?:(kobo:number)=>string}){
 const hero=heroSchema.parse(value??{});
 const available=hero.productOrder.length?hero.productOrder.flatMap(id=>products.find(p=>p.id===id)?[products.find(p=>p.id===id)!]:[]):products;
 const slides=heroSlides(hero,available,{url:hero.image,type:'image',alt:hero.alt,link:hero.buttonLink});
 const [index,setIndex]=useState(0),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(false),[paused,setPaused]=useState(false),[foreground,setForeground]=useState(true);
 const root=useRef<HTMLElement>(null),touch=useRef<{x:number;y:number}|null>(null);
 const identity=JSON.stringify(slides.map(s=>s.product?.id||s.media?.url)),count=slides.length;
 const current=Math.min(index,Math.max(0,count-1)),product=slides[current]?.product,media=slides[current]?.media;
 const theme=current%3,moving=!reduced&&visible&&foreground;
 const video=media?.type==='video';
 const animated=!!product||!!media&&media.type==='image'&&/vanta-brand-hero|vanta-burgundy-set-campaign/.test(media.url);
 const next=()=>setIndex(i=>(i+1)%Math.max(1,count));
 function move(delta:number){setIndex(i=>(i+delta+count)%Math.max(1,count));}
 useEffect(()=>{setIndex(0);},[identity]);
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(m.matches);update();m.addEventListener('change',update);const o=new IntersectionObserver(([e])=>setVisible(e.isIntersecting));if(root.current)o.observe(root.current);const page=()=>setForeground(!document.hidden);document.addEventListener('visibilitychange',page);return()=>{o.disconnect();m.removeEventListener('change',update);document.removeEventListener('visibilitychange',page);};},[]);
 useEffect(()=>{if(!moving||paused||video||count<2)return;const t=setInterval(()=>setIndex(i=>(i+1)%count),hero.intervalSeconds*1000);return()=>clearInterval(t);},[moving,paused,video,count,hero.intervalSeconds,current]);
 useEffect(()=>{const v=root.current?.querySelector('video');if(v){if(moving&&!paused)void v.play().catch(()=>{});else v.pause();}},[moving,paused,current,identity]);
 if(!count)return null;
 return <section ref={root} className="dn-hero vn-responsive-hero vn-featured-hero vn-ribbon-hero" aria-label="Campaign and featured pieces" aria-roledescription="carousel" data-theme={theme} data-video={video} data-moving={moving} data-featured={Boolean(product)} tabIndex={0}
 onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}}}
 onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchEnd={e=>{const t=touch.current;touch.current=null;if(t){const dx=e.changedTouches[0].clientX-t.x,dy=e.changedTouches[0].clientY-t.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);}}}
 style={{'--hero-desktop':`${hero.desktopHeight}svh`,'--hero-mobile':`${hero.mobileHeight}svh`} as CSSProperties}>
 {animated?<><RibbonBackground theme={theme} moving={moving}/><div className="vn-ribbon-product"><div className="vn-ribbon-copy"><h2>{product?garmentName(product.name):hero.title}</h2><p>{product?formatPrice(product.priceKobo):hero.body}</p><a className="dn-lime" href={product?`/products/${product.slug}`:hero.buttonLink}>{product?'Explore the piece':hero.buttonText}<ArrowRight size={16}/></a></div><a className="vn-ribbon-garment" href={product?`/products/${product.slug}`:hero.buttonLink}><FeaturedGarment src={product?.colorways[0]?.imageUrl||product?.imageUrl||'/images/vanta-burgundy-set-cutout.png'} alt={product?garmentName(product.name):'Vanta Noir burgundy set'}/></a></div></>:video?<video key={media.url} src={media.url} muted playsInline controls preload="metadata" loop={count===1} onEnded={()=>{if(count>1&&!paused)next();}} aria-label={media.alt} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<><a href={media?.link||hero.buttonLink} aria-label={hero.buttonText} data-artwork={!hero.showText} style={{display:"block",width:"100%",height:"100%"}}><picture>{hero.mobileImage&&media?.url===hero.image&&<source media="(max-width: 767px)" srcSet={hero.mobileImage}/>}<StoreImage src={media!.url} alt={media!.alt} priority sizes="100vw" style={{width:'100%',height:'100%',objectFit:hero.fit}}/></picture></a>{hero.showText&&<div className="dn-hero-content"><h2>{hero.title}</h2><p>{hero.body}</p><a className="dn-lime" href={media?.link||hero.buttonLink}>{hero.buttonText}</a></div>}</>}
 {!video&&<div className="vn-ribbon-pagination"><button onClick={()=>move(-1)} aria-label="Previous featured slide"><ArrowLeft size={17}/></button><div>{slides.map((s,i)=><button key={s.product?.id||s.media?.url||i} onClick={()=>setIndex(i)} aria-label={`Hero slide ${i+1}`} aria-current={i===current?'true':undefined}><i/></button>)}</div><button onClick={()=>move(1)} aria-label="Next featured slide"><ArrowRight size={17}/></button><button onClick={()=>setPaused(p=>!p)} aria-label={paused?'Resume carousel':'Pause carousel'}>{paused?<Play size={14}/>:<Pause size={14}/>}</button></div>}
 </section>;
}
