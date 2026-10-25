import type {PreorderPromise} from '@/lib/order-fulfilment';
export function PreorderNotice({items}:{items?:PreorderPromise[]}){
 if(!items?.length)return null;
 return <section className="vn-preorder-notice" aria-label="Preorder dispatch"><strong>Preorder items</strong>{items.map(item=><p key={item.productId}><b>{item.productName}</b><br/>{item.dispatchNote||'Contact customer care for your dispatch schedule.'}</p>)}<small>Courier transit time starts after dispatch.</small></section>;
}
