import {Order} from './types';
export type OrderGroup='All'|'To pay'|'Processing'|'To ship'|'Shipped'|'Completed'|'Expired'|'Returns';
export function hasPaidReceipt(order:Order){return order.paymentStatus==='paid';}
export function inOrderGroup(order:Order,group:OrderGroup){
 if(group==='All')return true;
 if(group==='Returns')return ['returned','return_requested','refunded','partially_refunded'].includes(order.status)||['refunded','partially_refunded'].includes(order.paymentStatus);
 if(group==='Expired')return ['expired','cancelled'].includes(order.status)&&order.paymentStatus!=='paid';
 if(group==='To pay')return ['pending','unpaid','failed','abandoned'].includes(order.paymentStatus)&&!['expired','cancelled','refunded','partially_refunded','returned'].includes(order.status);
 if(group==='Processing')return order.paymentStatus==='paid'&&['paid','processing','preparing'].includes(order.status);
 if(group==='To ship')return order.paymentStatus==='paid'&&['ready_to_ship','packed','preparing_to_ship'].includes(order.status);
 if(group==='Shipped')return ['shipped','in_transit','out_for_delivery'].includes(order.status);
 if(group==='Completed')return ['delivered','completed'].includes(order.status);
 return false;
}

/** Do not imply delivery progress for cancelled, unpaid or review-held orders. */
export function fulfilmentStep(order:Order):number|null{
 if(order.paymentStatus!=='paid')return null;
 if(['delivered','completed'].includes(order.status))return 3;
 if(['shipped','in_transit','out_for_delivery'].includes(order.status))return 2;
 if(['ready_to_ship','packed','preparing_to_ship'].includes(order.status))return 1;
 if(['paid','processing','preparing'].includes(order.status))return 0;
 return null;
}
