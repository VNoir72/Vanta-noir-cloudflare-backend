"use client";
import {useMemo,useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import type {CatalogProduct} from '@/lib/catalog-runtime';
import {collectionName,garmentName} from '@/lib/product-names';
import {approvedLooks,displayCutout} from '@/lib/product-pairings';
import {categoryFor} from '@/lib/shop-categories';
import {FloatingCatalogue} from './floating-catalogue';
import GarmentVisual from './garment-visual';

// Collection covers show real members of that collection, with varied silhouettes.
function coverPieces(products:CatalogProduct[]){
 const accessory=(p:CatalogProduct)=>categoryFor(p)?.section==='Accessories';
 const garments=products.filter(p=>!accessory(p));
 const first=garments[0]??products[0];
 const second=garments.find(p=>p.id!==first.id&&(categoryFor(p)?.section!==categoryFor(first)?.section))??garments.find(p=>p.id!==first.id);
 const extra=products.find(accessory);
 return [first,second,extra].filter((p):p is CatalogProduct=>Boolean(p)).filter((p,i,list)=>list.findIndex(x=>x.id===p.id)===i).slice(0,3);
}
export function CollectionExplorer({products,mode,onCollection}:{products:CatalogProduct[];mode:'collections'|'looks';onCollection:(name:string)=>void}){
 const [lookId,setLookId]=useState('');
 const groups=useMemo(()=>{
  if(mode==='looks')return approvedLooks(products);
  const map=new Map<string,CatalogProduct[]>();
  for(const p of products){const name=collectionName(p.details?.collection||'');if(name)map.set(name,[...(map.get(name)||[]),p]);}
  return [...map].map(([name,products])=>({id:name,name,products}));
 },[mode,products]);
 const current=groups.find(g=>g.id===lookId);
 const member=(p:CatalogProduct)=>({name:garmentName(p.name),image:p.colorways[0]?.imageUrl||p.imageUrl,cutout:displayCutout(p,p.colorways[0]?.name||p.color),accessory:categoryFor(p)?.section==='Accessories'});
 if(!groups.length)return <section className="vn-look-empty"><h2>{mode==='looks'?'The next look is taking shape.':'Collections are on their way.'}</h2><p>{mode==='looks'?'Explore our pieces while we prepare the next styled edit.':'Explore every piece in the shop.'}</p><a className="dn-primary" href="/">Explore the shop →</a></section>;
 if(mode==='looks'&&current)return <section className="vn-look-detail"><button onClick={()=>setLookId('')}><ArrowLeft size={15}/>All looks</button><h2>{current.name}</h2><div className="vn-look-composition"><div className="vn-look-display">{current.products.slice(0,3).map((p,i)=><a key={p.id} href={`/products/${p.slug}`}><b>{i+1}</b><GarmentVisual src={member(p).cutout||member(p).image} alt={garmentName(p.name)} sizes="30vw"/></a>)}</div><div className="vn-look-members">{current.products.map((p,i)=><a key={p.id} href={`/products/${p.slug}`}><GarmentVisual src={member(p).cutout||member(p).image} alt="" sizes="80px"/><span><strong>{i+1}. {garmentName(p.name)}</strong><u>View piece →</u></span></a>)}</div></div></section>;
 return <FloatingCatalogue label={mode==='looks'?'Complete looks':'Collections'} persistenceKey={`vn-${mode}`} pieces={groups.map(g=>({id:g.id,name:g.name,image:member(g.products[0]).image,members:(mode==='looks'?g.products:coverPieces(g.products)).map(member),href:'#collection',subtitle:mode==='looks'?'Wear it together':`${g.products.length} pieces`}))} onChoose={id=>mode==='collections'?onCollection(id):setLookId(id)}/>;
}
