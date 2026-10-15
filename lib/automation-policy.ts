import {z} from 'zod';
export const ruleIds=['payments','inventory','shipping','expiry','customers','checkout','circle','restock','support','summary','drops','aftercare'] as const;
export type RuleId=typeof ruleIds[number];
const integer=(min:number,max:number,value:number)=>z.number().int().min(min).max(max).default(value);
export const configSchema=z.object({
 intervalMinutes:integer(5,1440,5),delayHours:integer(1,720,2),reviewDays:integer(1,90,7),
 lowStockThreshold:integer(0,100,3),vipSpendKobo:integer(100,100000000000,100000000),vipOrders:integer(1,1000,5),inactiveDays:integer(1,3650,90),
 supportHours:integer(1,168,24),summaryHour:integer(0,23,18),timezone:z.enum(['Africa/Lagos','UTC','America/New_York']).default('Africa/Lagos'),
 shippingMode:z.enum(['cheapest','fastest']).default('cheapest'),providers:z.array(z.enum(['shipbubble','terminal'])).min(1).max(2).default(['shipbubble']).transform(()=>['shipbubble'] as ('shipbubble'|'terminal')[]),
 maxExtraKobo:integer(0,10000000,0)
}).strict();
export type AutomationConfig=z.infer<typeof configSchema>;
export const definitions:Record<RuleId,{title:string;description:string;fields:(keyof AutomationConfig)[]}>={
 payments:{title:'Payments and receipts',description:'Reconcile provider payments, allocate stock once and recover customer and owner receipts.',fields:[]},
 inventory:{title:'Inventory alerts',description:'Alert the owner to low stock by size and colour. Checkout reservations continue to prevent overselling.',fields:['lowStockThreshold']},
 shipping:{title:'Packed-order shipping',description:'Book paid, packed orders using connected providers, wallet checks and your rate rule. Uncertain bookings require review.',fields:['shippingMode','maxExtraKobo']},
 expiry:{title:'Unpaid order cleanup',description:'Verify due payments before expiring unpaid orders. Provider failures leave the order for review.',fields:[]},
 customers:{title:'Customer profiles and tags',description:'Bring customer records together and calculate first-time, repeat, VIP and inactive groups.',fields:['vipSpendKobo','vipOrders','inactiveDays']},
 checkout:{title:'Checkout follow-up',description:'One reminder for customers who explicitly requested checkout reminders. Suppress after a purchase or unsubscribe.',fields:['delayHours']},
 circle:{title:'Circle membership',description:'Reconcile pending membership payments and notify members about renewal, expiry and failed invoices. Benefits remain app-only.',fields:[]},
 restock:{title:'Back-in-stock alerts',description:'Notify confirmed subscribers when their exact size and colour is available.',fields:[]},
 support:{title:'Support assignment and escalation',description:'Assign unassigned enquiries to active support staff and escalate enquiries needing a staff response.',fields:['supportHours']},
 summary:{title:'Daily business summary',description:'Summarise sales, packing, low stock, refunds and automation failures for the owner.',fields:['summaryHour','timezone']},
 drops:{title:'Scheduled drops',description:'Publish approved scheduled products and process release announcements. Existing app early-access rules are preserved.',fields:[]},
 aftercare:{title:'Delivery follow-up',description:'Send garment-care guidance after delivery and a later review invitation to customers who requested these emails.',fields:['delayHours','reviewDays']}
};
export const ruleUpdateSchema=z.object({id:z.enum(ruleIds),enabled:z.boolean(),version:z.number().int().nonnegative(),config:configSchema}).strict();
export function customerTags(paidOrders:number,netKobo:number,lastPaid:string|null,c:AutomationConfig,now=Date.now()){
 const tags=paidOrders===1?['First-time buyer']:paidOrders>1?['Repeat buyer']:['Prospect'];
 if(paidOrders>=c.vipOrders||netKobo>=c.vipSpendKobo)tags.push('VIP');
 if(lastPaid&&now-Date.parse(lastPaid.endsWith('Z')?lastPaid:lastPaid.replace(' ','T')+'Z')>=c.inactiveDays*86400000)tags.push('Inactive');
 return tags;
}
export function nextPickup(now=new Date()){const d=new Date(now);d.setUTCDate(d.getUTCDate()+1);while(d.getUTCDay()===0||d.getUTCDay()===6)d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
