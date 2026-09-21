"use client";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import StoreImage from "./store-image";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import type { CatalogColorway, CatalogProduct } from "@/lib/catalog";
export function ProductGallery({product,color,mainImage}:{product:CatalogProduct;color:CatalogColorway;mainImage:string}){
  const [index,setIndex]=useState(0),[zoom,setZoom]=useState(false);
  const images=[{imageUrl:mainImage,imageAlt:color.imageAlt},...(product.images??[]).filter(i=>(!i.color||i.color===color.name)&&i.imageUrl!==color.imageUrl&&i.imageUrl!==mainImage)];
  const active=images[index]??images[0];
  const viewName=(image:typeof active,i:number)=>{
    const view=(image.imageUrl.match(/-(front|back|side)\.[a-z]+(?:\?|$)/i)?.[1] ?? image.imageAlt.match(/\b(front|back|side) view\b/i)?.[1])?.toLowerCase();
    return view ? view[0].toUpperCase()+view.slice(1) : `Image ${i+1}`;
  };
  return <div className="dn-gallery"><button className="dn-detail-photo" onClick={()=>setZoom(true)} aria-label={`Enlarge ${product.name} — ${viewName(active,index)}`}><StoreImage src={active.imageUrl} alt={active.imageAlt} sizes="(max-width:700px) 100vw, 50vw" priority/><span className="dn-zoom-hint"><Maximize2 size={16}/>View closer</span></button>{images.length>1&&<div className="dn-thumbnails" aria-label="Product views">{images.map((img,i)=><button key={img.imageUrl} onClick={()=>setIndex(i)} aria-label={`View ${viewName(img,i)}`} aria-pressed={index===i}><StoreImage src={img.imageUrl} alt={img.imageAlt} sizes="80px"/><span>{viewName(img,i)}</span></button>)}</div>}
  <Dialog open={zoom} onOpenChange={setZoom}><DialogContent className="dn-image-dialog"><DialogTitle className="sr-only">{product.name}</DialogTitle><DialogDescription className="sr-only">{color.name} product image</DialogDescription><StoreImage src={active.imageUrl} alt={active.imageAlt} sizes="90vw"/></DialogContent></Dialog></div>;
}
