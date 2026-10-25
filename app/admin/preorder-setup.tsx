import type { ProductDetails } from '@/lib/product-details';
export function productOrderMode(details?:Pick<ProductDetails,'orderMode'|'availability'>){return details?.orderMode??(details?.availability==='preorder'?'preorder':'in_stock');}
export function PreorderSetup({value,onChange}:{value:ProductDetails;onChange:(value:ProductDetails)=>void}){
 const mode=productOrderMode(value);
 return <section className="vn-preorder-setup" aria-label="Product selling format"><h4>Selling format</h4>
 <label>Fulfilment mode<select value={mode} onChange={e=>{const orderMode=e.target.value as 'in_stock'|'preorder';onChange({...value,orderMode,availability:value.availability==='preview'?'preview':orderMode});}}><option value="in_stock">Ready stock</option><option value="preorder">Preorder — made after the order</option></select></label>
 {mode==='preorder'&&<><p>Upload your product images, set the price and sizes, and enter the maximum preorder units you can fulfil for each size and colour. These units are an order limit, not physical stock.</p><label>Preorder dispatch promise<input value={value.dispatchNote} maxLength={240} placeholder="State the confirmed production and dispatch timeframe" onChange={e=>onChange({...value,dispatchNote:e.target.value})}/></label><small>Customers see this timing before ordering. Save as a draft while preparing; use Launch review to approve and open preorders. Saving does not put the product on sale.</small></>}
 </section>;
}
