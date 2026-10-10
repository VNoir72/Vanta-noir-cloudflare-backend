'use client';
import {useEffect,useState,useRef,type CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,Pause,Play} from 'lucide-react';
import StoreImage from './store-image';
import {heroSchema,type HeroSettings} from '@/lib/storefront-design';
import {type CatalogProduct,formatNaira} from '@/lib/catalog-runtime';
import {garmentName} from '@/lib/product-names';

export function CampaignHero({value,products=[],formatPrice=formatNaira}:{value?:HeroSettings;products?:CatalogProduct[];formatPrice?:(kobo:number)=>string}){
 const hero=heroSchema.parse(value??{});
 const available=hero.productOrder.length?hero.productOrder.flatMap(id=>products.find(p=>p.id===id)?[products.find(p=>p.id===id)!]:[]):products;
 const featured=hero.contentMode==='campaigns'?[]:available;
 const media=hero.contentMode==='products'&&featured.length?[]:hero.playlist.length?hero.playlist:[{url:hero.image,type:'image' as const,alt:hero.alt,link:hero.buttonLink}];
 const slides=hero.productsFirst?[...featured.map(product=>({product,media:-1})),...media.map((_,i)=>({product:undefined,media:i}))]:[...media.map((_,i)=>({product:undefined,media:i})),...featured.map(product=>({product,media:-1}))];
 const count=slides.length;
 const [index,setIndex]=useState(0),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(false);
 const [paused,setPaused]=useState(false),[interacting,setInteracting]=useState(false);
 const root=useRef<HTMLElement>(null),touch=useRef<{x:number;y:number}|null>(null);
 const identity=JSON.stringify([media,products.map(p=>p.id)]);
 const current=Math.min(index,count-1),product=slides[current]?.product,mediaIndex=slides[current]?.media;
 const destination=media[mediaIndex]?.link||hero.buttonLink;
 function move(delta:number){setPaused(true);setIndex(i=>(i+delta+count)%count);}
 useEffect(()=>{setIndex(0);},[identity]);
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(m.matches);update();m.addEventListener('change',update);const o=new IntersectionObserver(([e])=>setVisible(e.isIntersecting));if(root.current)o.observe(root.current);return()=>{o.disconnect();m.removeEventListener('change',update);};},[]);
 useEffect(()=>{if(reduced||!visible||paused||interacting||count<2)return;const t=setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%count);},hero.intervalSeconds*1000);return()=>clearInterval(t);},[reduced,visible,paused,interacting,count,hero.intervalSeconds]);
 useEffect(()=>{const update=()=>root.current?.querySelectorAll('video').forEach(video=>{if(!reduced&&visible&&!paused&&!document.hidden&&video.dataset.active==='true')void video.play().catch(()=>{});else video.pause();});update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[current,reduced,visible,paused,identity]);
 return <section ref={root} className="dn-hero vn-responsive-hero vn-featured-hero" aria-label="Campaign and featured pieces" aria-roledescription="carousel"
 data-campaign={hero.image.includes('vanta-brand-hero')?'brand-2026':undefined} data-artwork={!hero.showText} data-fit={hero.fit} data-featured={Boolean(product)} data-controls={false} tabIndex={0} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}}}
 onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)}
 onFocusCapture={()=>setInteracting(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setInteracting(false);}}
 onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
 onTouchEnd={e=>{const start=touch.current;touch.current=null;if(!start||count<2)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);}}
 style={{'--hero-desktop':`${hero.desktopHeight}svh`,'--hero-mobile':`${hero.mobileHeight}svh`} as CSSProperties}>
 {media.map((m,i)=><div key={m.url+i} className="vn-hero-frame" aria-hidden={i!==mediaIndex} style={{opacity:i===mediaIndex?1:0}}>{m.type==='video'?<video src={m.url} poster={hero.image} muted playsInline loop preload="metadata" data-active={i===mediaIndex} aria-label={m.alt} style={{objectPosition:hero.focus,objectFit:hero.fit}}/>:<picture>{!hero.playlist.length&&hero.mobileImage&&<source media="(max-width: 767px)" srcSet={hero.mobileImage}/>}<StoreImage src={m.url} alt={i===mediaIndex?m.alt:''} priority={i===0} sizes="100vw" style={{objectPosition:hero.focus,objectFit:hero.fit}}/></picture>}</div>)}
 {product?<div className="vn-hero-featured-piece" key={product.id}>
   <div className="vn-hero-piece-copy"><span className="dn-eyebrow">THE VANTA NOIR EDIT</span><h2>{garmentName(product.name)}</h2><p>{formatPrice(product.priceKobo)}</p><a className="dn-lime" href={`/products/${product.slug}`}>Shop this piece <ArrowRight size={16}/></a></div>
   <a className="vn-hero-piece-photo" href={`/products/${product.slug}`} aria-label={`Explore ${garmentName(product.name)}`}><StoreImage src={product.colorways[0]?.imageUrl||product.imageUrl} alt={product.imageAlt||garmentName(product.name)} sizes="(max-width:700px) 90vw, 60vw"/></a>
 </div>:hero.showText?<div className="dn-hero-content">{hero.kicker&&<span className="dn-hero-kicker">{hero.kicker}</span>}{hero.title&&<h1 style={{whiteSpace:'pre-line'}}>{hero.title}</h1>}{hero.body&&<p>{hero.body}</p>}<a className="dn-lime" href={destination}>{hero.buttonText}</a></div>:<a className="dn-hero-art-link" href={destination} aria-label={hero.buttonText}/>}
 {count>1&&<div className="vn-hero-controls vn-hero-accessible-controls"><span aria-live={paused?'polite':'off'}>{String(current+1).padStart(2,'0')} / {String(count).padStart(2,'0')}</span><button type="button" onClick={()=>move(-1)} aria-label="Previous featured slide"><ArrowLeft size={18}/></button><button type="button" onClick={()=>move(1)} aria-label="Next featured slide"><ArrowRight size={18}/></button>{!reduced&&<button type="button" onClick={()=>setPaused(p=>!p)} aria-label={paused?'Play featured slideshow':'Pause featured slideshow'}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>}</div>}
 </section>;
}
