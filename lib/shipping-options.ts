/** Compare only explicit transit estimates in the same time unit. Working days
 * and calendar days are deliberately kept separate: weekends cannot be guessed. */
export function transitEstimate(value:string):{min:number;max:number;basis:'calendar'|'working'}|null {
 const text=value.toLowerCase().trim().replace(/[–—]/g,'-');
 const m=text.match(/^(?:within\s+|in\s+|estimated\s+)?(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?)\s*)?(?:(working|business|calendar)\s+)?(hours?|hrs?|days?|weeks?)\s*(?:delivery)?$/);
 if(!m)return null;
 const factor=/^(hour|hr)/.test(m[4])?1:/^week/.test(m[4])?168:24;
 const min=Number(m[1])*factor,max=Number(m[2]||m[1])*factor;
 return min>0&&max>=min?{min,max,basis:m[3]==='working'||m[3]==='business'?'working':'calendar'}:null;
}
export function deliveryChoices<T extends {amountKobo:number;delivery:string}>(rates:readonly T[]):{label:'Standard'|'Express';rate:T}[] {
 const sorted=[...rates].sort((a,b)=>a.amountKobo-b.amountKobo),standard=sorted[0];
 if(!standard)return [];
 const estimates=sorted.map(rate=>({rate,eta:transitEstimate(rate.delivery)}));
 const base=estimates[0].eta;
 // Unknown or incomparable ETAs must never earn a claim of faster shipping.
 if(!base||estimates.some(({eta})=>!eta||eta.basis!==base.basis))return [{label:'Standard',rate:standard}];
 const fastest=[...estimates].sort((a,b)=>a.eta!.max-b.eta!.max||a.eta!.min-b.eta!.min||a.rate.amountKobo-b.rate.amountKobo)[0];
 if(fastest.rate===standard||fastest.eta!.max>=base.min)return [{label:'Standard',rate:standard}];
 return [{label:'Express',rate:fastest.rate},{label:'Standard',rate:standard}];
}
