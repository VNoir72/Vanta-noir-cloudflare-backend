'use client';
import {useEffect,useState,useRef,type CSSProperties} from 'react';
import StoreImage from './store-image';
import {heroSchema,type HeroSettings} from '@/lib/storefront-design';
export function CampaignHero({value}:{value?:HeroSettings}){
 const hero=heroSchema.parse(value??{});
 const media=hero.playlist.length?hero.playlist:[{url:hero.image,type:'image' as const,alt:hero.alt}];
 const [index,setIndex]=useState(0),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(false);const root=useRef<HTMLElement>(null);
 const identity=JSON.stringify(media);
 useEffect(()=>{setIndex(0);},[identity]);
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(m.matches);update();m.addEventListener('change',update);const o=new IntersectionObserver(([e])=>setVisible(e.isIntersecting));if(root.current)o.observe(root.current);return()=>{o.disconnect();m.removeEventListener('change',update);};},[]);
 useEffect(()=>{if(reduced||!visible||media.length<2)return;const t=setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%media.length);},hero.intervalSeconds*1000);return()=>clearInterval(t);},[reduced,visible,media.length,hero.intervalSeconds]);
 useEffect(()=>{const update=()=>root.current?.querySelectorAll('video').forEach((video,i)=>{if(!reduced&&visible&&!document.hidden&&video.dataset.active==='true')void video.play().catch(()=>{});else video.pause();});update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[index,reduced,visible,identity]);
 return <section ref={root} className="dn-hero vn-responsive-hero" aria-label="Current campaign" data-campaign={hero.image.includes('vanta-brand-hero')?'brand-2026':undefined} data-artwork={!hero.showText} data-fit={hero.fit} style={{'--hero-desktop':`${hero.desktopHeight}svh`,'--hero-mobile':`${hero.mobileHeight}svh`} as CSSProperties}>
 {media.map((m,i)=><div key={m.url+i} className="vn-hero-frame" aria-hidden={i!==index} style={{opacity:i===index?1:0}}>{m.type==='video'?<video src={m.url} poster={hero.image} muted playsInline loop preload="metadata" data-active={i===index} aria-label={m.alt} style={{objectPosition:hero.focus,objectFit:hero.fit}}/>:<picture>{!hero.playlist.length&&hero.mobileImage&&<source media="(max-width: 767px)" srcSet={hero.mobileImage}/>}<StoreImage src={m.url} alt={i===index?m.alt:''} priority={i===0} sizes="100vw" style={{objectPosition:hero.focus,objectFit:hero.fit}}/></picture>}</div>)}
 {hero.showText&&<div className="dn-hero-content">{hero.kicker&&<span className="dn-hero-kicker">{hero.kicker}</span>}{hero.title&&<h1 style={{whiteSpace:'pre-line'}}>{hero.title}</h1>}{hero.body&&<p>{hero.body}</p>}<a className="dn-lime" href={hero.buttonLink}>{hero.buttonText}</a></div>}
 {!hero.showText&&<a className="dn-hero-art-link" href={hero.buttonLink} aria-label={hero.buttonText}/>}
 </section>;
}
