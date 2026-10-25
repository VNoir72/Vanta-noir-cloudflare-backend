import type {CartItem,Product,PreorderPromise} from './types';
export function isPreorder(product:Product){return product.details?.availability==='preorder'||product.details?.orderMode==='preorder';}
/** Match authoritative variants, including grouped colourways; never trust saved bag labels. */
export function cartPreorders(products:Product[],cart:Pick<CartItem,'variantId'>[]):PreorderPromise[]{
 const variants=new Set(cart.map(item=>item.variantId));
 return products.filter(product=>isPreorder(product)&&product.colorways.some(color=>Object.values(color.variantIds||{}).some(id=>variants.has(id))))
  .map(product=>({productId:product.id,productName:product.name,dispatchNote:product.details?.dispatchNote||''}));
}
export function savedPreorders(value:unknown):PreorderPromise[]{
 if(!Array.isArray(value))return [];
 return value.filter((item):item is PreorderPromise=>Boolean(item&&typeof item.productId==='string'&&typeof item.productName==='string'&&typeof item.dispatchNote==='string'));
}
