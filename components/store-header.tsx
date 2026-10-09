"use client";
import {useState} from 'react';
import {Heart,Menu,Search,ShoppingBag} from 'lucide-react';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import '@/app/storefront-refresh.css';
import '@/app/storefront-approved.css';
const links=[['Home','/'],['About','/about'],['Contact','/contact'],['Privacy Policy','/privacy-policy']] as const;
export function StoreHeader({query,onQuery,onSearch,savedCount=0,bagCount=0,onSaved,onBag}:{dark?:boolean;query:string;onQuery:(value:string)=>void;onSearch:()=>void;savedCount?:number;bagCount?:number;onSaved:()=>void;onBag:()=>void}){
 const [menuOpen,setMenuOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false);
 return <><header className="vn-liquid-header" data-search-open={searchOpen}>
 <div className="vn-liquid-top"><a className="vn-liquid-logo" href="/" aria-label="Vanta Noir home"><img src="/images/vanta-spire-light.svg" alt="Vanta Noir — Presence. Power. Precision."/></a>
 <form className="vn-liquid-search" role="search" onSubmit={e=>{e.preventDefault();onSearch();}}><Search size={18}/><input aria-label="Search the collection" placeholder="Search products, sets, or keywords…" value={query} maxLength={120} onChange={e=>onQuery(e.target.value)}/><button type="submit" aria-label="Submit search">Go</button></form>
 <div className="vn-liquid-actions"><button onClick={onSaved} aria-label={`Saved items${savedCount?`, ${savedCount}`:''}`}><Heart size={21}/><span>Saved</span></button><button className="vn-mobile-search" onClick={()=>setSearchOpen(v=>!v)} aria-label="Search" aria-expanded={searchOpen}><Search size={21}/></button><button onClick={onBag} aria-label={`Bag ${bagCount}`}><ShoppingBag size={21}/><span>Bag</span>{bagCount>0&&<small>{bagCount}</small>}</button><button onClick={()=>setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}><Menu size={23}/></button></div></div>
 <nav className="vn-liquid-links" aria-label="Main navigation">{links.map(([name,href])=><a key={href} href={href}>{name}</a>)}</nav></header>
 <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetContent side="top" className="vn-liquid-menu" overlayClassName="vn-liquid-overlay"><SheetTitle>Explore Vanta Noir</SheetTitle><SheetDescription>Presence. Power. Precision.</SheetDescription><nav aria-label="Menu navigation">{links.map(([name,href])=><a key={href} href={href} onClick={()=>setMenuOpen(false)}>{name}</a>)}</nav></SheetContent></Sheet></>;
}
