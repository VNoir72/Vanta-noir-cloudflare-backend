export type ReviewItem={reference:string;productId:string;productName:string};
export type Coupon={id:string;status?:'available'|'used'|'expired';title:string;code:string;expiresAt:string;countries:string[];states:string[];shippingMinimumKobo:number|null;giftMinimumKobo:number|null};
export type Center={toReview:ReviewItem[];coupons:Coupon[]};
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null;
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(s=>typeof s==='string');
export function accountCenter(value:unknown):Center{
 if(!record(value)||!Array.isArray(value.coupons)||!Array.isArray(value.toReview))throw Error('Account extras are temporarily unavailable. Please retry.');
 if(!value.toReview.every(v=>record(v)&&['reference','productId','productName'].every(k=>typeof v[k]==='string'))||!value.coupons.every(v=>record(v)&&['id','title','code','expiresAt'].every(k=>typeof v[k]==='string')&&strings(v.countries)&&strings(v.states)&&['shippingMinimumKobo','giftMinimumKobo'].every(k=>v[k]===null||(typeof v[k]==='number'&&Number.isFinite(v[k])))&&(v.status===undefined||['available','used','expired'].includes(String(v.status)))))throw Error('Account extras are temporarily unavailable. Please retry.');
 return value as unknown as Center;
}
export function seenOrderUpdates(value:string|null):string[]{
 try{const parsed:unknown=JSON.parse(value||'[]');return strings(parsed)?parsed.slice(0,200):[];}catch{return [];}
}
