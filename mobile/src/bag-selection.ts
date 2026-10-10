import {CartItem,Product} from './types';
export function variantStock(item:CartItem, products:Product[]) {
  for (const p of products) for (const c of p.colorways) {
    const size=Object.keys(c.variantIds||{}).find(s=>c.variantIds?.[s]===item.variantId);
    if(size) return p.details?.availability==='preview'||p.details?.priceStatus==='proposed'?0:c.stock[size]||0;
  }
  return 0;
}
export function bagPartition(cart:CartItem[], selected:string[]) {
  const ids=new Set(selected);
  return {checkout:cart.filter(i=>ids.has(i.variantId)),remaining:cart.filter(i=>!ids.has(i.variantId))};
}
