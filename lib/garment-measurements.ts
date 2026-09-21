import targets from '@/data/garment-measurements.json';
import type { GarmentSizeGuide, SizeSection } from './sizing';
export type GarmentTarget = {name:string;status:string;revision:string;notes:string;accessory:Record<string,number>|null;blocks:Array<{code:string;name:string;fit:string;kind:string;adjustments:string[];rows:Array<{label:string;values:number[]}>}>};
export function garmentTarget(id:string):GarmentTarget|null{return (targets as Record<string,GarmentTarget>)[id]??null;}
export function developmentSizeGuide(id:string):GarmentSizeGuide|null{
 const target=garmentTarget(id);if(!target?.blocks.length)return null;
 const keys:Record<string,string>={'T1':'chest','T2':'length','T3':'shoulder','T4':'sleeve','B1':'waist','B2':'waistStretched','B3':'hip','B9':'inseam'};
 const sections=target.blocks.map(block=>({kind:block.kind,title:`${block.code} ${block.name}`.slice(0,60),rows:['S','M','L','XL','XXL'].map((size,i)=>Object.fromEntries([['size',size],...block.rows.filter(row=>keys[row.label.split(' ')[0]]).map(row=>[keys[row.label.split(' ')[0]],row.values[i]])]))})) as SizeSection[];
 return {status:'reference',notes:`${target.revision}. ${target.notes}`,sections};
}
