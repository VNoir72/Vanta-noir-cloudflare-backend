export type DeliveryProgress={status:'pending'|'confirmed'|'picked_up'|'in_transit'|'completed'|'cancelled';carrier:string;observedAt:string;events:{message:string;location:string;at:string|null}[];timeline:{status:string;at:string}[]};
export type ProgressOrder={status:string;paymentStatus:string;deliveryProgress?:DeliveryProgress|null};
export const deliveryLabels=['Processing','Preparing to ship','Shipped','Delivered'];
export function deliveryStep(order:ProgressOrder):number|null{
 if(order.paymentStatus!=='paid'||['cancelled','refunded','partially_refunded','returned','paid_stock_review'].includes(order.status))return null;
 if(['delivered','completed'].includes(order.status)||order.deliveryProgress?.status==='completed')return 3;
 if(['shipped','in_transit','out_for_delivery'].includes(order.status)||['picked_up','in_transit'].includes(order.deliveryProgress?.status||''))return 2;
 if(['ready_to_ship','packed','preparing_to_ship'].includes(order.status)||['pending','confirmed'].includes(order.deliveryProgress?.status||''))return 1;
 return ['paid','processing','preparing'].includes(order.status)?0:null;
}
export function deliveryMessage(order:ProgressOrder){
 if(order.paymentStatus!=='paid')return 'Delivery starts after payment is confirmed.';
 if(['cancelled','refunded','partially_refunded','returned','paid_stock_review'].includes(order.status))return 'Contact customer care for the current fulfilment arrangements.';
 if(['delivered','completed'].includes(order.status))return 'Your parcel has been delivered.';
 switch(order.deliveryProgress?.status){
  case 'pending':return 'Shipment booked. Awaiting courier confirmation.';
  case 'confirmed':return 'Courier confirmed. Awaiting pickup.';
  case 'picked_up':return 'The courier has collected your parcel.';
  case 'in_transit':return 'Your parcel is on the way.';
  case 'completed':return 'Your parcel has been delivered.';
  case 'cancelled':return 'The courier reported a cancelled shipment. Contact customer care for delivery arrangements.';
  default:return 'Updates appear here automatically as your order progresses.';
 }
}
