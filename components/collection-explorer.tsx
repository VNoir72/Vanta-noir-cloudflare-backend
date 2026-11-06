"use client";
import {useMemo,useState} from 'react';
import type {CatalogProduct} from '@/lib/catalog-runtime';
import {collectionName,garmentName} from '@/lib/product-names';
import {approvedLooks,displayCutout} from '@/lib/product-pairings';
import {FloatingCatalogue} from './floating-catalogue';
import StoreImage from './store-image';
export function CollectionExplorer({products,mode,onCollection}:{products:CatalogProduct[];mode:'collections'|'looks';onCollection:(name:string)=>void}){
 const [lookId,setLookId]=useState('');
 const groups=useMemo(()=>{if(mode==='looks')return approvedLooks(products);const map=new Map<string,CatalogProduct[]>();for(const p of products){const name=collectionName(p.details?.collection||'');if(name)map.set(name,[...(map.get(name)||[]),p]);}return [...map].map(([name,products])=>({id:name,name,products}));},[mode,products]);
 const current=groups.find(g=>g.id===lookId);const members=(p:CatalogProduct)=>({name:garmentName(p.name),image:p.colorways[0]?.imageUrl||p.imageUrl,cutout:displayCutout(p,p.colorways[0]?.name||p.color)});
 if(!groups.length)return <p>{mode==='looks'?'Approved outfits will appear here when they are published.':'Collections will appear here when assigned to products.'}</p>;
 return <><FloatingCatalogue label={mode==='looks'?'Complete looks':'Collections'} pieces={groups.map(g=>({id:g.id,name:g.name,image:members(g.products[0]).image,members:g.products.map(members),href:'#collection',subtitle:mode==='looks'?'Wear it together':`${g.products.length} pieces`}))} onChoose={id=>mode==='collections'?onCollection(id):setLookId(id)}/>{mode==='looks'&&current&&<section aria-label={current.name}><h2>{current.name}</h2><p>Choose each piece to select its colour and size. Items are sold individually unless the product states otherwise.</p><div className="vn-look-members">{current.products.map(p=><a key={p.id} href={`/products/${p.slug}`}><StoreImage src={members(p).cutout||members(p).image} preserveOriginal={Boolean(members(p).cutout)} alt="" sizes="60px"/><span>{garmentName(p.name)} · View piece</span></a>)}</div></section>}</>;
}
