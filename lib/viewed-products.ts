import {readStorage,writeStorage} from './browser-store';
export type ViewedProduct={id:string;name:string;slug:string;imageUrl:string};
export function viewedProducts():ViewedProduct[]{try{const v=JSON.parse(readStorage('vn-viewed-products')||'[]');return Array.isArray(v)?v.filter(p=>typeof p.id==='string'&&typeof p.name==='string'&&typeof p.slug==='string').slice(0,40):[];}catch{return [];}}
export function rememberViewed(product:ViewedProduct){writeStorage('vn-viewed-products',JSON.stringify([product,...viewedProducts().filter(p=>p.id!==product.id)].slice(0,40)));}
