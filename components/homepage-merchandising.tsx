"use client";
import '@/app/merchandising.css';
import { useState } from 'react';
import {FeaturedDrop} from './featured-drop';
import { ArrowRight, Bell } from 'lucide-react';
import StoreImage from './store-image';
import { CustomerSignup } from './customer-signup';
import { formatNaira, type CatalogProduct } from '@/lib/catalog';
import { homepageSections, homepageStockBadge, confirmedSoldOut, isNewArrival, isPreview, sellingFast, type MerchandisingData } from '@/lib/merchandising';

export function HomepageMerchandising({products,data,emailEnabled,formatPrice=formatNaira}:{products:CatalogProduct[];data:MerchandisingData;emailEnabled:boolean;formatPrice?:(kobo:number)=>string}) {
  const sections=homepageSections(products,data);
  const [notify,setNotify]=useState<string|null>(null);
  function cards(items:CatalogProduct[], label:string) {
    return <div className="vn-drop-grid">{items.map(p=>{const formId=`release-form-${label.toLowerCase().replaceAll(' ','-')}-${p.id}`;return <article className="vn-drop-card" key={p.id}>
      <a className="vn-drop-photo" href={`/products/${p.slug}`}><StoreImage src={p.colorways[0]?.imageUrl||p.imageUrl} alt={p.imageAlt||p.name} sizes="(max-width:640px) 45vw, (max-width:1000px) 30vw, 23vw"/>{confirmedSoldOut(p)&&<span>Sold out</span>}</a>
      <a href={`/products/${p.slug}`}><h3>{p.name.replace(/^\d{1,3}[ .—-]+/,'')}</h3></a>
      <p>{p.details?.priceStatus==='proposed'?'Price at launch':formatPrice(p.priceKobo)}</p>
      {homepageStockBadge(p,data)&&<p className="vn-stock-note">{homepageStockBadge(p,data)}</p>}
      {isPreview(p)&&emailEnabled&&<><button className="vn-drop-notify" aria-expanded={notify===formId} aria-controls={formId} onClick={()=>setNotify(notify===formId?null:formId)}><Bell size={15}/>Notify me</button><div id={formId} hidden={notify!==formId}>{notify===formId&&<CustomerSignup key={p.id} productId={p.id}/>}</div></>}
    </article>;})}</div>;
  }
  return <div className="vn-home-merch dn-wrap">
    <FeaturedDrop products={sections.featured} formatPrice={formatPrice}/>
    {sections.bestSellers.length>0&&<section id="best-sellers" aria-labelledby="best-sellers-title"><div className="dn-section-intro"><div><span className="dn-eyebrow">CHOSEN BY OUR CUSTOMERS</span><h2 id="best-sellers-title">Best Sellers</h2><p>Popular purchases, with extra weight for the last seven days.</p></div></div>{cards(sections.bestSellers,'Best seller')}</section>}

  </div>;
}
