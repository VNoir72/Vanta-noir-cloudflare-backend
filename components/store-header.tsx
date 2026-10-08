"use client";
import {useEffect,useRef,useState} from 'react';
import {Heart,Search,ShoppingBag,X} from 'lucide-react';
import '@/app/storefront-refresh.css';
export function StoreHeader({dark=false,query,onQuery,onSearch,savedCount=0,bagCount=0,onSaved,onBag}:{dark?:boolean;query:string;onQuery:(value:string)=>void;onSearch:()=>void;savedCount?:number;bagCount?:number;onSaved:()=>void;onBag:()=>void}){
 const [headerScrolled,setHeaderScrolled]=useState(false),[searchExpanded,setSearchExpanded]=useState(false);
 const header=useRef<HTMLElement>(null);
 const searchInput=useRef<HTMLInputElement>(null),searchToggle=useRef<HTMLButtonElement>(null);
 // Stay on the campaign while it is behind the navigation. Switch to the
 // light glass material at its actual edge, including after resize or search.
 useEffect(()=>{
   let frame=0;
   const hero=document.querySelector<HTMLElement>('.vn-responsive-hero');
   const update=()=>{frame=0;setHeaderScrolled(dark ? !hero||hero.getBoundingClientRect().bottom<=(header.current?.offsetHeight||64)+8 : window.scrollY>8);};
   const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
   const observer=new ResizeObserver(schedule);
   if(hero)observer.observe(hero);
   if(header.current)observer.observe(header.current);
   window.addEventListener('scroll',schedule,{passive:true});
   window.addEventListener('resize',schedule);
   update();
   return()=>{observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
 },[dark]);
 useEffect(()=>{if(!searchExpanded)return;const frame=requestAnimationFrame(()=>searchInput.current?.focus({preventScroll:true}));return()=>cancelAnimationFrame(frame);},[searchExpanded]);
 function closeInlineSearch(){setSearchExpanded(false);requestAnimationFrame(()=>searchToggle.current?.focus({preventScroll:true}));}
 return (<header ref={header} className="vn-store-header" data-search-open={searchExpanded} data-scrolled={headerScrolled} data-hidden="false"><div className="vn-store-nav dn-wrap">
      <a href="/" className="vn-responsive-logo" aria-label="Vanta Noir home"><img src={dark&&!headerScrolled?'/images/vanta-spire-on-dark.svg':'/images/vanta-spire-light.svg'} alt="Vanta Noir — Presence. Power. Precision."/></a>
      <div className="vn-nav-middle">
        <nav aria-label="Main navigation" inert={searchExpanded}><a href="/">Home</a><a href="/about">About</a><a href="/contact">Contact</a></nav>
        <form id="vn-inline-search" className="vn-inline-search" role="search" data-open={searchExpanded} inert={!searchExpanded} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();closeInlineSearch();}}} onSubmit={event=>{event.preventDefault();onSearch();}}>
          <button type="submit" aria-label="Submit search"><Search size={16}/></button><input ref={searchInput} aria-label="Search the collection" placeholder="Search" value={query} maxLength={120} onChange={e=>onQuery(e.target.value)}/><button type="button" aria-label="Close search" onClick={closeInlineSearch}><X size={16}/></button>
        </form>
      </div>
      <div className="vn-nav-utilities"><button ref={searchToggle} className="vn-header-search-toggle" aria-label="Search" aria-expanded={searchExpanded} aria-controls="vn-inline-search" onClick={()=>setSearchExpanded(v=>!v)}><Search size={21}/></button><button aria-label={`Saved items${savedCount?`, ${savedCount}`:""}`} onClick={onSaved}><Heart size={21}/></button><button aria-label={`Bag ${bagCount}`} onClick={onBag}><ShoppingBag size={21}/>{bagCount>0&&<small>{bagCount}</small>}</button></div>
    </div></header>);
}
