"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, ZoomIn } from "lucide-react";
import Image from "@/components/store-image";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SizeGuide } from "@/components/size-guide";
import { CustomerSignup } from "@/components/customer-signup";
import { ProductReviews } from "@/components/product-reviews";
import { formatNaira, type CatalogProduct } from "@/lib/catalog";
import { catalogVariantId } from "@/lib/cart";
import { productDetails } from "@/lib/product-details";
import { readStorage, writeStorage } from "@/lib/browser-store";
import { trackProducts } from "@/lib/analytics";
import type { CheckoutSettings } from "@/lib/api-client";

export function ProductDetail({ product, products, selectedSize, selectedColor, onSize, onColor, onAdd, saved, onSave, checkout }: {
  product: CatalogProduct; products: CatalogProduct[]; selectedSize: string; selectedColor: string;
  onSize: (size: string) => void; onColor: (color: string) => void; onAdd: () => void;
  saved: boolean; onSave: () => void; checkout: CheckoutSettings | null;
}) {
  const details = productDetails(product.details);
  const colorway = product.colorways.find(item => item.name === selectedColor) ?? product.colorways[0];
  const [imageIndex, setImageIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => { setImageIndex(0); }, [selectedColor, product.id]);
  useEffect(() => {
    const recordView=()=>trackProducts("view_item", [product]);
    recordView();
    window.addEventListener("vanta-analytics-ready",recordView);
    try { const ids = JSON.parse(readStorage("vanta-noir-recent") ?? "[]"); const clean = Array.isArray(ids) ? ids.filter(id => typeof id === "string" && id !== product.id).slice(0, 7) : []; setRecentIds(clean); writeStorage("vanta-noir-recent", JSON.stringify([product.id, ...clean])); } catch { /* Optional browsing history. */ }
    return()=>window.removeEventListener("vanta-analytics-ready",recordView);
  }, [product.id]);
  const images = useMemo(() => {
    const matching = (product.images ?? []).filter(image => !image.color || image.color.toLowerCase() === colorway?.name.toLowerCase());
    return matching.length ? matching : colorway ? [{ imageUrl: colorway.imageUrl, imageAlt: colorway.imageAlt, color: colorway.name }] : [];
  }, [product, colorway]);
  if (!colorway) return <p className="vn-section">This piece is currently unavailable.</p>;
  const currentImage = images[imageIndex] ?? images[0];
  const available = colorway.stock[selectedSize] ?? 0;
  const sizes = Object.keys(colorway.stock).sort((a,b) => ["XS","S","M","L","XL","XXL"].indexOf(a) - ["XS","S","M","L","XL","XXL"].indexOf(b));
  const related = products.filter(p => p.id !== product.id).sort((a,b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0,3);
  return <div className="vn-product-page" id="top">
    <nav className="vn-product-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/#collection">Collection</Link><span>/</span><span>{product.name}</span></nav>
    <section className="vn-product-layout">
      <div className="vn-product-gallery">
        <Dialog><DialogTrigger asChild><button className="vn-gallery-main" aria-label={`Enlarge ${product.name} image`}><Image src={currentImage.imageUrl} alt={currentImage.imageAlt} fill priority sizes="(min-width: 900px) 60vw, 100vw" /><span><ZoomIn size={18} /> Enlarge</span></button></DialogTrigger>
          <DialogContent className="vn-commerce-dialog vn-image-dialog"><DialogTitle className="sr-only">{product.name}</DialogTitle><DialogDescription className="sr-only">{currentImage.imageAlt}</DialogDescription><Image src={currentImage.imageUrl} alt={currentImage.imageAlt} className="vn-zoom-image" sizes="100vw" /></DialogContent>
        </Dialog>
        {images.length > 1 && <div className="vn-gallery-thumbs" aria-label="Product images">{images.map((image,i) => <button key={`${image.imageUrl}-${i}`} aria-label={`View image ${i+1}`} aria-pressed={imageIndex === i} onClick={() => setImageIndex(i)}><Image src={image.imageUrl} alt={image.imageAlt} sizes="100px" /></button>)}</div>}
      </div>
      <div className="vn-product-summary">
        <p className="vn-eyebrow">{details.collection || product.category} · {details.audience}</p>
        <h1>{product.name}</h1><p className="vn-product-price">{formatNaira(product.priceKobo)}</p>
        <p className="vn-product-description">{product.description}</p>
        {details.fit && <p>{details.fit}</p>}
        <div className="vn-product-choice"><p>Colour · {colorway.name}</p><div className="flex flex-wrap gap-3">{product.colorways.map(color => <button key={color.name} title={color.name} aria-label={`Choose ${color.name}`} aria-pressed={color.name === colorway.name} className="vn-colour-option" onClick={() => onColor(color.name)}><span style={{ background: color.hex }} /></button>)}</div></div>
        <div className="vn-product-choice"><div className="flex justify-between gap-3"><p>Size{selectedSize ? ` · ${selectedSize}` : " · Select your size"}</p><SizeGuide product={product} /></div><div className="vn-detail-sizes" role="group" aria-label="Select your size">{sizes.map(size => <button key={size} aria-pressed={selectedSize === size} onClick={() => onSize(size)} className={colorway.stock[size] <= 0 ? "is-sold-out" : ""}>{size}<span className="sr-only">{colorway.stock[size] <= 0 ? " — sold out" : ""}</span></button>)}</div></div>
        <div className="vn-detail-actions"><button className="vn-buy-button" onClick={onAdd} disabled={Boolean(selectedSize) && !available}><ShoppingBag size={18} />{!selectedSize ? "Choose a size" : !available ? "Sold out" : details.availability === "preorder" ? "Preorder · Add to bag" : "Add to bag"}</button><button className="vn-save-button" onClick={onSave} aria-pressed={saved} aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}><Heart size={20} fill={saved ? "currentColor" : "none"} /></button></div>
        {selectedSize && !available && <CustomerSignup variantId={catalogVariantId(product, selectedSize, colorway)} />}
        {(details.dispatchNote || checkout?.dispatchNote) && <p className="vn-detail-note">{details.dispatchNote || checkout?.dispatchNote}</p>}
        {details.modelSizing && <p className="vn-detail-note">{details.modelSizing}</p>}
        <div className="vn-product-disclosures">
          {(details.fabric || details.fabricWeight || details.features || details.contents) && <details open className="vn-product-disclosure"><summary>Details &amp; materials</summary>{[details.fabric,details.fabricWeight,details.features,details.contents].filter(Boolean).map((text,i) => <p key={i} className="whitespace-pre-line">{text}</p>)}</details>}
          {details.care && <details className="vn-product-disclosure"><summary>Care</summary><p className="whitespace-pre-line">{details.care}</p></details>}
          <details className="vn-product-disclosure"><summary>Delivery &amp; returns</summary><p>{checkout?.deliveryNote || "Delivery fees are calculated for your Nigerian delivery address in your bag."}</p><p>Read the current returns and exchange policy before ordering. Customer care will confirm eligibility and instructions before you send anything back.</p><Link className="vn-text-link" href="/shipping-returns">Read the full policy</Link></details>
        </div>
      </div>
    </section>
    <ProductReviews productId={product.id} />
    <ProductRail title="Wear it your way" products={related} />
    <ProductRail title="Recently viewed" products={recentIds.map(id => products.find(p=>p.id===id)).filter((p): p is CatalogProduct => Boolean(p))} />
  </div>;
}

export function ProductRail({ title, products }: { title: string; products: CatalogProduct[] }) {
  if (!products.length) return null;
  return <section className="vn-product-rail"><h2>{title}</h2><div>{products.map(product => <Link key={product.id} href={`/products/${product.slug}`} onClick={() => trackProducts("select_item", [product])}><div className="vn-related-image"><Image src={product.imageUrl} alt={product.imageAlt} fill sizes="(min-width: 768px) 30vw, 70vw" /></div><h3>{product.name}</h3><p>{formatNaira(product.priceKobo)}</p></Link>)}</div></section>;
}
