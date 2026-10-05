export const bulkSourceStatus={processing:'paid',shipped:'processing',delivered:'shipped'} as const;
export function bulkOrderProblem(order:{status:string;paymentStatus:string;carrier?:string;trackingNumber?:string},target:keyof typeof bulkSourceStatus){
 if(order.paymentStatus!=='paid')return 'Payment is not confirmed.';
 if(order.status!==bulkSourceStatus[target])return 'The order changed. Refresh the review.';
 if(target!=='processing'&&(!order.carrier?.trim()||!order.trackingNumber?.trim()))return 'This order cannot be shipped or delivered without saved courier and tracking details.';
 return null;
}
