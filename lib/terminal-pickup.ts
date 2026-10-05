import {z} from 'zod';
import {NIGERIA_STATES} from './commerce-config';
import {getDbBinding} from './runtime-env';
const key='terminal_business_pickup';
const clean=z.string().trim().refine(v=>!/[\u0000-\u001f\u007f]/.test(v),'Remove control characters.');
export const pickupDetailsSchema=z.object({
 line1:clean.pipe(z.string().min(5).max(200)),line2:clean.pipe(z.string().max(200)),
 city:clean.pipe(z.string().min(2).max(100)),state:z.string().refine(v=>NIGERIA_STATES.includes(v),'Choose a Nigerian state.'),country:z.literal('NG'),
 first_name:clean.pipe(z.string().min(1).max(100)),last_name:clean.pipe(z.string().min(1).max(100)),
 phone:z.string().trim().transform(v=>v.replace(/[\s()-]/g,'')).transform(v=>/^0\d{10}$/.test(v)?'+234'+v.slice(1):/^234\d{10}$/.test(v)?'+'+v:v).refine(v=>/^\+234[789]\d{9}$/.test(v),'Enter a valid Nigerian mobile number.'),
 email:z.string().trim().email().max(254),zip:z.string().trim().regex(/^\d{6}$/,'Enter a six-digit postcode.'),
});
export type PickupDetails=z.infer<typeof pickupDetailsSchema>;
export type PickupRecord={revision:string;updatedAt:string;details:PickupDetails};
export class PickupConflict extends Error{}
export async function getPickupDetails(){const row=await getDbBinding().prepare('SELECT value FROM store_meta WHERE key=?').bind(key).first<{value:string}>();return row?JSON.parse(row.value) as PickupRecord:null;}
export async function savePickupDetails(input:unknown,revision:unknown){
 const details=pickupDetailsSchema.parse(input);const expected=z.string().uuid().nullable().parse(revision);const record:PickupRecord={revision:crypto.randomUUID(),updatedAt:new Date().toISOString(),details};const db=getDbBinding();
 const result=expected===null?await db.prepare('INSERT OR IGNORE INTO store_meta(key,value) VALUES(?,?)').bind(key,JSON.stringify(record)).run():await db.prepare("UPDATE store_meta SET value=? WHERE key=? AND json_extract(value,'$.revision')=?").bind(JSON.stringify(record),key,expected).run();
 if(!result.meta.changes)throw new PickupConflict('Pickup details changed in another tab. Copy your edits, then reload the saved details before saving again.');
 return record;
}
