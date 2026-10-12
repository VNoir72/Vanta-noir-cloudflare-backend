import {z} from 'zod';
const id=z.string().trim().min(1).max(160);
export const dropSchema=z.object({productId:id,title:z.string().trim().min(2).max(100),mode:z.enum(['early','app']),startsAt:z.string().datetime(),publicAt:z.string().datetime().nullable(),paused:z.boolean().default(false),website:z.enum(['hidden','teaser']).default('teaser'),vipEmails:z.array(z.string().trim().toLowerCase().email()).max(100).default([]),perCustomer:z.number().int().min(1).max(100).default(2),allocation:z.number().int().min(0).max(100000).default(0)}).superRefine((v,c)=>{if(v.mode==='early'&&(!v.publicAt||v.publicAt<=v.startsAt))c.addIssue({code:'custom',message:'Public release must follow app access.'});});
export const offerRuleSchema=z.object({kind:z.enum(['promotion','reward']),code:id.transform(v=>v.toUpperCase()),channel:z.enum(['app','web','both']).default('app'),circleOnly:z.boolean().optional(),firstPurchase:z.boolean().default(false),perCustomer:z.number().int().min(1).max(100).default(1),maxDiscountKobo:z.number().int().positive().nullable().default(null)});
export const appControlsSchema=z.object({version:z.number().int().min(0).default(0),enabled:z.boolean().default(false),calendar:z.boolean().default(true),restocks:z.boolean().default(true),announcement:z.string().trim().max(240).default(''),downloadUrl:z.union([z.literal(''),z.string().url().refine(s=>{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;})]).default(''),drops:z.array(dropSchema).max(100).default([]),offers:z.array(offerRuleSchema).max(100).default([])}).superRefine((v,c)=>{if(new Set(v.drops.map(d=>d.productId)).size!==v.drops.length)c.addIssue({code:'custom',message:'Each product can have only one access rule.'});if(new Set(v.offers.map(o=>o.kind+':'+o.code)).size!==v.offers.length)c.addIssue({code:'custom',message:'Each offer can have only one rule.'});});
export type AppControls=z.infer<typeof appControlsSchema>;
export type AppAccess={verifiedApp:boolean;email:string;customerId:string};
export const publicAccess:AppAccess={verifiedApp:false,email:'',customerId:''};
export function dropAccess(d:AppControls['drops'][number],a:AppAccess,now=Date.now()){
 if(d.paused)return false;
 if(d.mode==='early'&&d.publicAt&&now>=Date.parse(d.publicAt))return true;
 return now>=Date.parse(d.startsAt)&&a.verifiedApp&&!!a.customerId&&(!d.vipEmails.length||d.vipEmails.includes(a.email));
}
export function offerAccess(o:AppControls['offers'][number],a:AppAccess){return (!o.circleOnly||a.verifiedApp&&!!a.customerId)&&(o.channel==='both'||(o.channel==='app'?a.verifiedApp&&!!a.customerId:!a.verifiedApp));}
