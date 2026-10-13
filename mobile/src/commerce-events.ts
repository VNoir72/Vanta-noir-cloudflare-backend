import type {CartItem, Order} from './types';

export type ShoppingEvent = 'view_item' | 'add_to_cart' | 'begin_checkout' | 'add_payment_info';
export function shoppingPayload(items: Pick<CartItem, 'productId'|'name'|'priceKobo'|'quantity'>[]) {
  return {currency:'NGN', value:items.reduce((sum,item)=>sum+item.priceKobo*item.quantity,0)/100,
    items:items.map(item=>({item_id:item.productId,item_name:item.name,price:item.priceKobo/100,quantity:item.quantity}))};
}
export function purchasePayload(order:Order) {
  if(order.paymentStatus!=='paid'||!order.reference||!order.items?.length)return null;
  const merchandise=order.items.reduce((sum,item)=>sum+item.unitPriceKobo*item.quantity,0);
  return {transaction_id:order.reference,currency:'NGN',value:Math.max(0,merchandise-(order.discountKobo||0))/100,
    shipping:(order.shippingKobo||0)/100,
    items:order.items.map(item=>({item_id:item.variantId,item_name:item.productName,item_variant:item.color+' / '+item.size,price:item.unitPriceKobo/100,quantity:item.quantity}))};
}
