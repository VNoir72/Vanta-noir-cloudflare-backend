"use client";
import {useEffect,useState} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import {ArrowLeft,ArrowRight,Pause,Play} from 'lucide-react';
import {SlidingGarmentViews,garmentViews} from './sliding-garment-views';
import {type CatalogProduct} from '@/lib/catalog-runtime';
import {confirmedSoldOut} from '@/lib/merchandising';
import {garmentName} from '@/lib/product-names';

export function FeaturedDrop({products,formatPrice}:{products:CatalogProduct[];formatPrice:(kobo:number)=>string}) {
  const [viewport,api]=useEmblaCarousel({align:'start',loop:false});
  const [paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
  const [reduced,setReduced]=useState(true),[visible,setVisible]=useState(false),[pageVisible,setPageVisible]=useState(true);
  const [index,setIndex]=useState(0),[count,setCount]=useState(0);
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion=()=>setReduced(preference.matches),visibility=()=>setPageVisible(!document.hidden);
    motion();visibility();preference.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
    return()=>{preference.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  useEffect(()=>{
    if(!api)return;
    const update=()=>{setIndex(api.selectedScrollSnap());setCount(api.scrollSnapList().length);};
    update();api.on('select',update).on('reInit',update);
    const interaction=()=>setPaused(true);api.on('pointerDown',interaction);
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:0.25});observer.observe(api.rootNode());
    return()=>{api.off('select',update).off('reInit',update).off('pointerDown',interaction);observer.disconnect();};
  },[api]);
  useEffect(()=>{
    if(!api||count<2||paused||hovered||focused||reduced||!visible||!pageVisible)return;
    const timer=window.setInterval(()=>api.canScrollNext()?api.scrollNext():api.scrollTo(0),5000);
    return()=>window.clearInterval(timer);
  },[api,count,paused,hovered,focused,reduced,visible,pageVisible]);
  if(!products.length)return null;
  return <section id="featured-pieces" aria-label="Featured Drop" aria-roledescription="carousel"
    onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
    onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocused(false);}}>
    <div className="dn-section-intro"><div><span className="dn-eyebrow">THE VANTA NOIR EDIT</span><h2>Featured Drop</h2></div>

    </div>
    <div className="featured-viewport" ref={viewport}><div className="featured-track">
      {products.map((p,i)=><article className="vn-drop-card featured-slide" key={p.id} aria-label={`${i+1} of ${products.length}`} aria-roledescription="slide">
        <a className="vn-drop-photo" href={`/products/${p.slug}`}><SlidingGarmentViews images={garmentViews(p,p.colorways[0]?.name||'',p.colorways[0]?.imageUrl||p.imageUrl,p.imageAlt||garmentName(p.name))} sizes="(max-width:640px) 85vw, (max-width:1000px) 50vw, 25vw"/>{confirmedSoldOut(p)&&<span>Sold out</span>}</a>
        <a href={`/products/${p.slug}`}><h3>{garmentName(p.name)}</h3></a><p>{p.details?.priceStatus==='proposed'?'Price at launch':formatPrice(p.priceKobo)}</p>
      </article>)}
    </div></div>
  </section>;
}
