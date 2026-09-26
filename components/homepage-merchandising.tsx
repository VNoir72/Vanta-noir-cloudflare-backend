"use client";
import '@/app/merchandising.css';
import { useState } from 'react';
import { ArrowRight, Bell } from 'lucide-react';
import StoreImage from './store-image';
import { CustomerSignup } from './customer-signup';
import { formatNaira, type CatalogProduct } from '@/lib/catalog';
import { homepageSections, homepageStockBadge, isNewArrival, isPreview, sellingFast, type MerchandisingData } from '@/lib/merchandising';

export function HomepageMerchandising({products,data,emailEnabled}:{products:CatalogProduct[];data:MerchandisingData;emailEnabled:boolean}) {
  const sections=homepageSections(products,data);
  const [notify,setNotify]=useState<string|null>(null);
  function cards(items:CatalogProduct[], label:string) {
    return <div className="vn-drop-grid">{items.map(p=>{const formId=`release-form-${label.toLowerCase().replaceAll(' ','-')}-${p.id}`;return <article className="vn-drop-card" key={p.id}>
      <a className="vn-drop-photo" href={`/products/${p.slug}`}><StoreImage src={p.colorways[0]?.imageUrl||p.imageUrl} alt={p.imageAlt||p.name} sizes="(max-width:640px) 45vw, (max-width:1000px) 30vw, 23vw"/><span>{isPreview(p)?'Coming soon':sellingFast(p,data)?'Selling fast':isNewArrival(p)?'New':label}</span></a>
      <a href={`/products/${p.slug}`}><h3>{p.name.replace(/^\d+\s+/,'')}</h3></a>
      <p>{p.details?.priceStatus==='proposed'?'Price at launch':formatNaira(p.priceKobo)}</p>
      {homepageStockBadge(p,data)&&<p className="vn-stock-note">{homepageStockBadge(p,data)}</p>}
      {isPreview(p)&&emailEnabled&&<><button className="vn-drop-notify" aria-expanded={notify===formId} aria-controls={formId} onClick={()=>setNotify(notify===formId?null:formId)}><Bell size={15}/>Notify me</button><div id={formId} hidden={notify!==formId}>{notify===formId&&<CustomerSignup key={p.id} productId={p.id}/>}</div></>}
    </article>;})}</div>;
  }
  return <div className="vn-home-merch dn-wrap">
    <nav className="vn-drop-nav" aria-label="Discover the latest"><a href="#new-arrivals">New Arrivals</a>{sections.featured.length>0&&<a href="#featured-pieces">Featured Pieces</a>}{sections.comingSoon.length>0&&<a href="#coming-soon">Coming Soon</a>}{sections.bestSellers.length>0&&<a href="#best-sellers">Best Sellers</a>}</nav>
    <section id="new-arrivals" aria-labelledby="new-arrivals-title"><div className="dn-section-intro"><div><span className="dn-eyebrow">THE LATEST DROP</span><h2 id="new-arrivals-title">New Arrivals</h2><p>Fresh releases. A new expression of Vanta Noir.</p></div><a href="#collection">Explore everything <ArrowRight size={16}/></a></div>{sections.newArrivals.length?cards(sections.newArrivals,'New'):<div className="vn-drop-empty"><h3>Our next drop is on its way.</h3><p>Explore the collection and get to know what’s coming.</p>{emailEnabled&&<CustomerSignup/>}</div>}</section>
    {sections.featured.length>0&&<section id="featured-pieces" aria-labelledby="featured-pieces-title"><div className="dn-section-intro"><div><span className="dn-eyebrow">THE VANTA NOIR EDIT</span><h2 id="featured-pieces-title">Featured Pieces</h2><p>Selected by Vanta Noir. Made to stand out.</p></div></div>{cards(sections.featured,'Featured')}</section>}
    {sections.bestSellers.length>0&&<section id="best-sellers" aria-labelledby="best-sellers-title"><div className="dn-section-intro"><div><span className="dn-eyebrow">CHOSEN BY OUR CUSTOMERS</span><h2 id="best-sellers-title">Best Sellers</h2><p>Most purchased in the last 30 days, excluding recorded refunded quantities.</p></div></div>{cards(sections.bestSellers,'Best seller')}</section>}
    {sections.comingSoon.length>0&&<section id="coming-soon" aria-labelledby="coming-soon-title"><div className="dn-section-intro"><div><span className="dn-eyebrow">A FIRST LOOK</span><h2 id="coming-soon-title">Coming Soon</h2><p>Preview the next possibilities.{emailEnabled?' Choose a piece to hear when it launches.':''}</p></div></div>{cards(sections.comingSoon,'Coming soon')}</section>}
  </div>;
}
