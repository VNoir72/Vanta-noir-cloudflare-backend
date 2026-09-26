import type { CatalogProduct } from './catalog';

export type SalesSignal = { productId: string; units30: number; orders30: number; units7: number; orders7: number };
export type MerchandisingData = { sales: SalesSignal[]; stockBadgesEnabled: boolean };
export const EMPTY_MERCHANDISING: MerchandisingData = {sales: [], stockBadgesEnabled: false};
export function isPreview(product: CatalogProduct) {
  return product.details?.availability === 'preview' || product.details?.priceStatus === 'proposed';
}
export function availableUnits(product: CatalogProduct) {
  return product.colorways.reduce((sum,c)=>sum+Object.entries(c.stock).reduce((n,[size,stock])=>n+(size==='Size pending'?0:Math.max(0,Math.floor(stock))),0),0);
}
export function isNewArrival(product: CatalogProduct, now=Date.now()) {
  const date=product.details?.releaseDate;
  if(!date || isPreview(product))return false;
  const released=Date.parse(date+'T00:00:00Z');
  return Number.isFinite(released) && released<=now && now-released<30*86400000;
}
export function homepageSections(products: CatalogProduct[], data: MerchandisingData, now=Date.now()) {
  const signals=new Map(data.sales.map(row=>[row.productId,row]));
  const bestSellers=products.filter(p=>{
    const s=signals.get(p.id);return !isPreview(p) && s && s.units30>=3 && s.orders30>=2;
  }).sort((a,b)=>(signals.get(b.id)?.units30??0)-(signals.get(a.id)?.units30??0)||a.id.localeCompare(b.id)).slice(0,8);
  return {
    newArrivals:products.filter(p=>isNewArrival(p,now)).sort((a,b)=>(b.details?.releaseDate??'').localeCompare(a.details?.releaseDate??'')||a.id.localeCompare(b.id)).slice(0,8),
    featured:products.filter(p=>p.featured).slice(0,8),
    comingSoon:products.filter(isPreview).sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured))||a.id.localeCompare(b.id)).slice(0,8),
    bestSellers,
  };
}
export function sellingFast(product: CatalogProduct, data: MerchandisingData) {
  const s=data.sales.find(row=>row.productId===product.id), available=availableUnits(product);
  return data.stockBadgesEnabled && !isPreview(product) && product.details?.availability!=='preorder' && available>0 && Boolean(s&&s.units7>=5&&s.orders7>=3&&s.units7>=available);
}
export function lowStockMessage(product: CatalogProduct, size: string, stock: number, enabled: boolean) {
  return enabled && !isPreview(product) && product.details?.availability!=='preorder' && size && size!=='Size pending' && stock>0 && stock<=3
    ? `Only ${stock} left in ${size} for this colour` : '';
}
export function homepageStockBadge(product:CatalogProduct,data:MerchandisingData) {
  const total=availableUnits(product);
  return data.stockBadgesEnabled&&!isPreview(product)&&product.details?.availability!=='preorder'&&total>0&&total<=3
    ? `Low stock · ${total} left across sizes` : '';
}
