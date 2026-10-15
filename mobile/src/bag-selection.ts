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

/** Refresh catalogue details without silently deleting a customer's saved pieces. */
export function refreshBagDetails(cart:CartItem[],products:Product[]):CartItem[] {
 return cart.map(item=>{
  for(const product of products) for(const color of product.colorways){
   const size=Object.keys(color.variantIds||{}).find(size=>color.variantIds?.[size]===item.variantId);
   if(size)return {...item,productId:product.id,name:product.name,color:color.name,size,imageUrl:color.imageUrl,priceKobo:product.priceKobo};
  }
  return item;
 });
}
export function isBagRefreshNotice(message:string){return /(?:refresh|update) your bag/i.test(message);}
