"use client";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import StoreImage from "./store-image";
import { SlidingGarmentViews, garmentViews } from "./sliding-garment-views";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import type { CatalogColorway, CatalogProduct } from "@/lib/catalog";
export function ProductGallery({product,color,mainImage}:{product:CatalogProduct;color:CatalogColorway;mainImage:string}){
  const [index,setIndex]=useState(0),[zoom,setZoom]=useState(false);
  const images=garmentViews(product,color.name,mainImage,color.imageAlt);
  const active=images[index]??images[0];
  const viewName=(image:typeof active,i:number)=>{
    const view=(image.imageAlt.match(/\b(front|back|left|right|side) view\b/i)?.[1] ?? image.imageUrl.match(/-(front|back|left|right|side)(?:-r\d+)?\.[a-z]+(?:\?|$)/i)?.[1])?.toLowerCase();
    return view ? view[0].toUpperCase()+view.slice(1) : `Image ${i+1}`;
  };
  return <div className="dn-gallery"><button className="dn-detail-photo" onClick={()=>setZoom(true)} aria-label={`Enlarge ${product.name} — ${viewName(active,index)}`}><SlidingGarmentViews images={images} sizes="(max-width:700px) 100vw, 50vw" priority suspended={zoom} onViewChange={setIndex}/><span className="dn-zoom-hint"><Maximize2 size={16}/>View closer</span></button>
  <Dialog open={zoom} onOpenChange={setZoom}><DialogContent className="dn-image-dialog"><DialogTitle className="sr-only">{product.name}</DialogTitle><DialogDescription className="sr-only">{color.name} product image</DialogDescription><StoreImage key={active.imageUrl} src={active.imageUrl} alt={active.imageAlt} sizes="90vw"/></DialogContent></Dialog></div>;
}
