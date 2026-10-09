"use client";
import '@/app/storefront.css';
import {useEffect,useRef,useState} from 'react';
import {Heart,Menu,Search,ShoppingBag,X} from 'lucide-react';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
const links=[['Home','/'],['Contact','/contact'],['Privacy Policy','/privacy-policy']] as const;
export function StoreHeader({query,onQuery,onSearch,savedCount=0,bagCount=0,onSaved,onBag}:{dark?:boolean;query:string;onQuery:(value:string)=>void;onSearch:()=>void;savedCount?:number;bagCount?:number;onSaved:()=>void;onBag:()=>void}){
 const [menuOpen,setMenuOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false);
 const inputRef=useRef<HTMLInputElement>(null),toggleRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const media=matchMedia('(min-width: 768px) and (min-height: 501px), (min-width: 768px) and (pointer: fine)');const closeOnWide=()=>{if(media.matches)setMenuOpen(false);};media.addEventListener('change',closeOnWide);return()=>media.removeEventListener('change',closeOnWide);},[]);
 const closeSearch=()=>{setSearchOpen(false);requestAnimationFrame(()=>toggleRef.current?.focus({preventScroll:true}));};
 const openSearch=()=>{setSearchOpen(true);requestAnimationFrame(()=>inputRef.current?.focus({preventScroll:true}));};
 return <><header className="vn-liquid-header" data-search-open={searchOpen}>
 <div className="vn-liquid-top"><a className="vn-liquid-logo" href="/" aria-label="Vanta Noir home"><img className="vn-logo-full" src="/images/vanta-spire-light.svg" alt="Vanta Noir — Presence. Power. Precision."/><img className="vn-logo-emblem" src="/images/vanta-emblem.svg" alt="" aria-hidden="true"/></a>
 <nav className="vn-liquid-desktop-nav" aria-label="Main navigation">{links.map(([name,href])=><a key={href} href={href}>{name}</a>)}</nav>
 <div className="vn-liquid-search-slot" inert={!searchOpen} aria-hidden={!searchOpen}><form id="vn-header-search" className="vn-liquid-search" role="search" onSubmit={e=>{e.preventDefault();inputRef.current?.blur();onSearch();}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();closeSearch();}}}><input tabIndex={searchOpen?0:-1} ref={inputRef} type="search" aria-label="Search the collection" placeholder="Search…" value={query} maxLength={120} onChange={e=>onQuery(e.target.value)}/><button type="submit" aria-label="Submit search"><Search size={18}/></button><button type="button" aria-label="Close search" onClick={closeSearch}><X size={20}/></button></form></div>
 <div className="vn-liquid-actions"><button ref={toggleRef} type="button" className="vn-liquid-search-toggle" hidden={searchOpen} onClick={openSearch} aria-label="Open search" aria-controls="vn-header-search" aria-expanded={searchOpen}><Search size={21}/></button><button type="button" onClick={onSaved} aria-label={`Saved items${savedCount?`, ${savedCount}`:''}`}><Heart size={21}/><span>Saved</span></button><button type="button" onClick={onBag} aria-label={`Bag ${bagCount}`}><ShoppingBag size={21}/><span>Bag</span>{bagCount>0&&<small>{bagCount}</small>}</button><button className="vn-liquid-menu-toggle" type="button" onClick={()=>setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}><Menu size={23}/></button></div></div>
 </header>
 <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetContent side="top" className="vn-liquid-menu" overlayClassName="vn-liquid-overlay"><SheetTitle>Explore Vanta Noir</SheetTitle><SheetDescription>Presence. Power. Precision.</SheetDescription><nav aria-label="Menu navigation">{links.map(([name,href])=><a key={href} href={href} onClick={()=>setMenuOpen(false)}>{name}</a>)}</nav></SheetContent></Sheet></>;
}
