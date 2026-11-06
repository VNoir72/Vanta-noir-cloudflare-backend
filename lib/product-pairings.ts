import type {CatalogProduct} from './catalog-runtime';
/** Only resolve explicit owner selections against the current public catalogue. */
export function pairedProducts(product:CatalogProduct,catalogue:CatalogProduct[]){
 const ids=[...new Set(product.details?.pairedProductIds??[])].filter(id=>id!==product.id);
 const publicById=new Map(catalogue.map(p=>[p.id,p]));
 return ids.flatMap(id=>{const p=publicById.get(id);return p&&p.colorways?.length?[p]:[]});
}
export function approvedLooks(catalogue:CatalogProduct[]){
 return catalogue.filter(p=>p.details?.lookName?.trim()).flatMap(p=>{
 const members=pairedProducts(p,catalogue);return members.length?[{id:p.id,name:p.details!.lookName!,products:[p,...members]}]:[];
 });
}
export function displayCutout(product:CatalogProduct,colour:string){return product.details?.displayImages?.find(image=>image.color===colour)?.imageUrl;}
