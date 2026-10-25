import {getDbBinding} from './runtime-env';
export type PreorderPromise={productId:string;productName:string;dispatchNote:string};
/** The promise at checkout; never reconstruct an old order from today's product details. */
export async function orderPreorders(reference:string):Promise<PreorderPromise[]>{
 const saved=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind('order-preorders:'+reference).first<{value:string}>();
 if(!saved)return [];
 const value:unknown=JSON.parse(saved.value);
 return Array.isArray(value)?value.filter((v):v is PreorderPromise=>v&&typeof v.productId==='string'&&typeof v.productName==='string'&&typeof v.dispatchNote==='string'):[];
}
