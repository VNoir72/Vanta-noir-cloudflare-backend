"use client";
import { useState, useEffect } from "react";
import { Maximize2 } from "lucide-react";
import StoreImage from "./store-image";
import { SlidingGarmentViews } from "./sliding-garment-views";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import type { CatalogColorway, CatalogProduct } from "@/lib/catalog";
import {productGallery,garmentView} from '@/lib/garment-gallery';
export function ProductGallery({product,color,mainImage}:{product:CatalogProduct;color:CatalogColorway;mainImage:string}){
  const [index,setIndex]=useState(0),[zoom,setZoom]=useState(false);
  const [selection,setSelection]=useState<{index:number;revision:number}>();
  const {primary:images,details}=productGallery(product,color.name,mainImage,color.imageAlt);
  useEffect(()=>{setIndex(0);setSelection(undefined);},[product.id,color.slug]);
  const active=images[index]??images[0];
  if(!images.length)return null;
  const viewName=(image:typeof active,i:number)=>{
    const view=garmentView(image);
    return view==='reference' ? `Image ${i+1}` : view[0].toUpperCase()+view.slice(1);
  };
  return <div className="dn-gallery"><button className="dn-detail-photo" onClick={()=>setZoom(true)} aria-label={`Enlarge ${product.name} — ${viewName(active,index)}`}><SlidingGarmentViews images={images} sizes="(max-width:700px) 100vw, 50vw" priority suspended={true} selection={selection} onViewChange={setIndex}/><span className="vn-view-counter">{index+1} / {images.length}</span><span className="dn-zoom-hint"><Maximize2 size={16}/>View closer</span></button>
  <div className="dn-thumbnails" role="group" aria-label="Garment views">{images.map((image,i)=><button type="button" key={image.imageUrl} aria-label={`Show ${viewName(image,i)} view`} aria-pressed={index===i} onClick={()=>{setIndex(i);setSelection(current=>({index:i,revision:(current?.revision??0)+1}));}}><StoreImage src={image.imageUrl} alt="" sizes="(max-width:767px) 22vw, 110px"/><span>{viewName(image,i)}</span></button>)}</div>
  {details.length>0&&<section className="dn-garment-details" aria-label="Garment close-ups and extra details"><h2>Details & close-ups</h2><p>Explore the fabric, construction and artwork.</p><div className="dn-detail-images">{details.map(image=><figure key={image.imageUrl}><StoreImage src={image.imageUrl} alt={image.imageAlt} sizes="(max-width:700px) 100vw, 50vw"/><figcaption>{image.imageAlt}</figcaption></figure>)}</div></section>}
  <Dialog open={zoom} onOpenChange={setZoom}><DialogContent className="dn-image-dialog"><DialogTitle className="sr-only">{product.name}</DialogTitle><DialogDescription className="sr-only">{color.name} product image</DialogDescription><StoreImage key={active.imageUrl} src={active.imageUrl} alt={active.imageAlt} sizes="90vw"/></DialogContent></Dialog></div>;
}
