'use client';
import {useEffect,useState,useRef,type CSSProperties} from 'react';
import StoreImage from './store-image';
import {heroSchema,type HeroSettings} from '@/lib/storefront-design';

type CampaignMedia={url:string;mobileImage?:string;type:'image'|'video';alt:string};
const campaign:CampaignMedia[] = [
 {url:'/images/vanta-technical-campaign-2026.webp',mobileImage:'/images/vanta-technical-campaign-mobile-2026.webp',type:'image' as const,alt:'Vanta Noir black technical sets, worn by two campaign models'},
 {url:'/images/vanta-carousel-varsity-2026.webp',mobileImage:'/images/vanta-carousel-varsity-mobile-2026.webp',type:'image' as const,alt:'Vanta Noir black and ivory varsity jacket with loose indigo jeans'},
 {url:'/images/vanta-carousel-burgundy-2026.webp',mobileImage:'/images/vanta-carousel-burgundy-mobile-2026.webp',type:'image' as const,alt:'Vanta Noir burgundy Stealth hoodie and jogger sets'},
 {url:'/images/vanta-carousel-olive-2026.webp',mobileImage:'/images/vanta-carousel-olive-mobile-2026.webp',type:'image' as const,alt:'Vanta Noir olive split-hem tank and cargo shorts'},
];

export function CampaignHero({value}:{value?:HeroSettings}){
 const hero=heroSchema.parse(value??{});
 const approvedCampaign=!hero.playlist.length&&['/images/vanta-hero.png','/images/vanta-hero-960.webp','/images/vanta-stealth-campaign-2026.webp','/images/vanta-technical-campaign-2026.webp'].includes(hero.image);
 const media:CampaignMedia[]=approvedCampaign?campaign:hero.playlist.length?hero.playlist:[{url:hero.image,mobileImage:hero.mobileImage,type:'image' as const,alt:hero.alt}];
 const [index,setIndex]=useState(0),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(false),[paused,setPaused]=useState(false),[focused,setFocused]=useState(false),[hovered,setHovered]=useState(false),[pageVisible,setPageVisible]=useState(true);
 const root=useRef<HTMLElement>(null),ready=useRef(new Set<number>()),touch=useRef<{x:number;y:number}|null>(null);
 const identity=JSON.stringify(media),running=!reduced&&visible&&pageVisible&&!paused&&!focused&&!hovered;
 const advance=(direction:number)=>setIndex(current=>{
  for(let n=1;n<media.length;n++){const next=(current+direction*n+media.length)%media.length;if(ready.current.has(next))return next;}
  return current;
 });
 useEffect(()=>{setIndex(0);ready.current.clear();root.current?.querySelectorAll<HTMLImageElement>('.vn-hero-frame img').forEach((img,i)=>{if(img.complete&&img.naturalWidth)ready.current.add(i);});},[identity]);
 useEffect(()=>{
  const m=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(m.matches),visibility=()=>setPageVisible(!document.hidden);
  update();visibility();m.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);
  const observer=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{threshold:.1});if(root.current)observer.observe(root.current);
  return()=>{observer.disconnect();m.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{if(!running||media.length<2)return;const timer=setInterval(()=>advance(1),hero.intervalSeconds*1000);return()=>clearInterval(timer);},[running,index,identity,hero.intervalSeconds]);
 useEffect(()=>{root.current?.querySelectorAll('video').forEach(video=>{if(running&&video.dataset.active==='true')void video.play().catch(()=>{});else video.pause();});},[index,running,identity]);
 return <section ref={root} className="dn-hero vn-responsive-hero" aria-label="Current campaign" aria-roledescription={media.length>1?'carousel':undefined} tabIndex={media.length>1?0:undefined}
  data-campaign={approvedCampaign?'stealth-2026':undefined} data-artwork={!hero.showText} data-fit={approvedCampaign?'cover':hero.fit} data-running={running} data-slide={index}
  style={{'--hero-desktop':`${hero.desktopHeight}svh`,'--hero-mobile':`${hero.mobileHeight}svh`,'--hero-dwell':`${hero.intervalSeconds+1.2}s`} as CSSProperties}
  onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}
  onPointerEnter={e=>{if(e.pointerType==='mouse')setHovered(true);}} onPointerLeave={()=>setHovered(false)}
  onTouchStart={e=>{const t=e.touches[0];touch.current={x:t.clientX,y:t.clientY};}}
  onTouchEnd={e=>{const start=touch.current;touch.current=null;if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){setPaused(true);advance(dx<0?1:-1);}}}
  onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setPaused(true);advance(e.key==='ArrowRight'?1:-1);}}}>
  {media.map((m,i)=><div key={m.url+i} className="vn-hero-frame" aria-hidden={i!==index} data-active={i===index} data-mobile-framing={approvedCampaign&&i>0?'campaign':undefined} style={{opacity:i===index?1:0}}>
   {m.type==='video'?<video src={m.url} poster={hero.image} muted playsInline loop preload="metadata" data-active={i===index} aria-label={m.alt} onLoadedData={()=>ready.current.add(i)} onError={()=>ready.current.delete(i)} style={{objectPosition:hero.focus,objectFit:hero.fit}}/>:
    <picture>{'mobileImage' in m&&m.mobileImage&&<source media="(max-width: 700px)" srcSet={m.mobileImage}/>}<StoreImage src={m.url} alt={i===index?m.alt:''} priority={i===0} loading="eager" sizes="100vw" onLoad={e=>{const img=e.currentTarget;void img.decode().then(()=>ready.current.add(i)).catch(()=>ready.current.delete(i));}} onError={()=>ready.current.delete(i)} style={{objectPosition:hero.focus,objectFit:hero.fit}}/></picture>}
  </div>)}
  {hero.showText&&<div className="dn-hero-content">{hero.kicker&&<span className="dn-hero-kicker">{hero.kicker}</span>}{hero.title&&<h1 style={{whiteSpace:'pre-line'}}>{hero.title}</h1>}{hero.body&&<p>{hero.body}</p>}<a className="dn-lime" href={hero.buttonLink}>{hero.buttonText}</a></div>}
  {!hero.showText&&<a className="dn-hero-art-link" href={hero.buttonLink} aria-label={hero.buttonText}/>}
  {media.length>1&&<><button type="button" className="vn-hero-motion" aria-label={paused?'Play campaign motion':'Pause campaign motion'} aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?'Play motion':'Pause motion'}</button><span className="sr-only" aria-live={paused?'polite':'off'}>Campaign {index+1} of {media.length}. {media[index]?.alt}. Use left and right arrow keys or swipe to browse.</span></>}
 </section>;
}
