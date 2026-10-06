"use client";
import '@/app/merchandising.css';
import {FeaturedDrop} from './featured-drop';
import type {CatalogProduct} from '@/lib/catalog';
import {formatNaira} from '@/lib/catalog';
import {homepageSections,type MerchandisingData} from '@/lib/merchandising';
export function HomepageMerchandising({products,data,formatPrice=formatNaira}:{products:CatalogProduct[];data:MerchandisingData;emailEnabled:boolean;formatPrice?:(kobo:number)=>string}){return <div className="vn-home-merch dn-wrap"><FeaturedDrop products={homepageSections(products,data).featured} formatPrice={formatPrice}/></div>;}
