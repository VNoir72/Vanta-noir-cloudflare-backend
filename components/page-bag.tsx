'use client';
import {useEffect,useMemo,useState} from 'react';
import {BagDrawer} from './bag-drawer';
import {apiUrl} from '@/lib/api-client';
import {type CatalogProduct} from '@/lib/catalog-runtime';
import {CART_STORAGE_KEY,cartInventory,reconcileCart,restoreCart,type CartItem} from '@/lib/cart';
import {readStorage,writeStorage} from '@/lib/browser-store';
import {useDisplayCurrency} from '@/lib/display-currency';
import {trackCommerce} from '@/lib/analytics';
export function openPageBag(){window.dispatchEvent(new Event('vn-open-bag'));}
function savedCart(){try{return restoreCart(JSON.parse(readStorage(CART_STORAGE_KEY)||'[]'));}catch{return [];}}
export function PageBag({open,onOpenChange}:{open:boolean;onOpenChange:(value:boolean)=>void}){
 const [cart,setCart]=useState<CartItem[]>([]),[products,setProducts]=useState<CatalogProduct[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const displayCurrency=useDisplayCurrency(),inventory=useMemo(()=>cartInventory(products),[products]);
 useEffect(()=>{const sync=()=>setCart(savedCart());sync();window.addEventListener('vn-storage-changed',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('vn-storage-changed',sync);window.removeEventListener('storage',sync);};},[]);
 useEffect(()=>{if(!open)return;const controller=new AbortController();setLoaded(false);setError(false);setCart(savedCart());
 fetch(apiUrl('/api/catalog'),{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<{products:CatalogProduct[]}>;}).then(data=>{if(controller.signal.aborted)return;if(!Array.isArray(data.products))throw Error();const next=reconcileCart(savedCart(),data.products);setProducts(data.products);setCart(next);writeStorage(CART_STORAGE_KEY,JSON.stringify(next));setLoaded(true);trackCommerce('view_cart',next);}).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();
 },[open,retry]);
 function update(next:CartItem[]){setCart(next);writeStorage(CART_STORAGE_KEY,JSON.stringify(next));}
 return <BagDrawer bagOpen={open} setBagOpen={onOpenChange} cart={cart} catalogLoaded={loaded} catalogError={error} inventory={inventory} displayCurrency={displayCurrency} onRetry={()=>setRetry(n=>n+1)} onQuantity={(id,delta)=>{if(!loaded||error)return;update(cart.flatMap(item=>{if(item.variantId!==id)return [item];const quantity=Math.min(inventory.get(id)?.available??0,item.quantity+delta);return quantity>0?[{...item,quantity}]:[];}));}} onRemove={item=>{trackCommerce('remove_from_cart',[item]);update(cart.filter(i=>i.variantId!==item.variantId));}} onExplore={()=>onOpenChange(false)}/>;
}
