import {z} from 'zod';
// Planning assumptions, not measured garment specifications or courier promises.
export const parcelDimensions=z.object({lengthCm:z.number().positive().max(200),widthCm:z.number().positive().max(200),heightCm:z.number().positive().max(200)});
export const itemParcelSchema=parcelDimensions.extend({weightGrams:z.number().int().positive().max(50000),measured:z.boolean()});
export const packagingSchema=parcelDimensions.extend({id:z.string().regex(/^[a-z0-9-]{1,40}$/),name:z.string().trim().min(1).max(80),tareGrams:z.number().int().min(1).max(10000),maxWeightGrams:z.number().int().positive().max(50000),measured:z.boolean()});
export type ItemParcel=z.infer<typeof itemParcelSchema>;
export type Packaging=z.infer<typeof packagingSchema>;
export const initialPackaging:Packaging[]=[
 {id:'small-mailer',name:'Small clothing mailer — estimate',lengthCm:30,widthCm:25,heightCm:6,tareGrams:40,maxWeightGrams:1500,measured:false},
 {id:'large-mailer',name:'Large clothing mailer — estimate',lengthCm:40,widthCm:35,heightCm:12,tareGrams:70,maxWeightGrams:4000,measured:false},
 {id:'clothing-box',name:'Clothing box — estimate',lengthCm:50,widthCm:40,heightCm:25,tareGrams:500,maxWeightGrams:10000,measured:false},
];
export function estimateItem(name:string,category:string,details:any,size:string):{parcel:ItemParcel|null;basis:string}{
 const text=`${name} ${details?.garmentType||''} ${details?.contents||''}`.toLowerCase();
 let grams=0,dims=[0,0,0],kind='';
 const rules:Array<[RegExp,number,number[],string]>=[
 [/\bset\b|\btracksuit|two.piece|\s\+\s/,1400,[35,28,10],'matching set'],
 [/dress/,450,[30,25,4],'dress'],
 [/puffer|coat|leather/,1300,[40,32,15],'heavy outerwear'],
 [/hoodie|sweater|sweatshirt|pullover|quarter.zip/,800,[32,27,7],'hoodie or knit'],
 [/jacket|windbreaker|overshirt|bomber|blazer|shell|anorak|parka/,600,[32,27,6],'jacket'],
 [/short(?![- ]sleeve)|skort/,350,[28,23,4],'shorts'],
 [/jean|denim|cargo|jogger|trouser|sweatpant|\bpant|bottom|carpenter/,650,[32,25,5],'trousers'],
 [/legging/,250,[28,23,3],'leggings'],[/skirt/,450,[30,25,4],'skirt'],
 [/tank|singlet|crop top|bralette|sports bra/,180,[25,20,2],'light top'],
 [/tee|t-shirt|tshirt|jersey|polo|shirt|\btop\b|bodysuit|corset/,280,[28,23,3],'top'],
 [/sock|boxer|underwear|brief/,100,[20,15,3],'essential'],
 [/cap|hat|beanie/,180,[25,22,12],'headwear'],
 [/backpack|\bbag\b|duffel/,650,[35,28,10],'bag'],
 [/belt/,250,[20,20,5],'belt'],[/scarf|glove/,180,[25,20,3],'soft accessory'],
 [/vest/,400,[30,25,5],'vest']];
 const rule=rules.find(([re])=>re.test(text));if(rule){[,grams,dims,kind]=rule;}
 const existing=Number(details?.shippingWeightGrams);if(Number.isFinite(existing)&&existing>0&&existing<=50000){grams=existing;kind='existing catalogue weight (unverified)';}
 if(!grams||!rule)return {parcel:null,basis:'No reliable product-type estimate. Enter the physical sample measurements.'};
 const sizeFactor:Record<string,number>={XS:.88,S:.94,M:.98,L:1,XL:1.08,XXL:1.16,'2XL':1.16};const factor=sizeFactor[size.toUpperCase()]??1;
 // Catalogue weights have no size/provenance metadata, so never treat them as measured.
 const heavy=!existing&&/heavyweight|fleece/.test(`${details?.fabric||''} ${details?.fabricWeight||''}`.toLowerCase())?1.15:1;
 return {parcel:{weightGrams:Math.ceil(grams*factor*heavy/10)*10,lengthCm:dims[0],widthCm:dims[1],heightCm:Math.ceil(dims[2]*Math.max(1,factor)),measured:false},basis:`Estimated from ${kind}${heavy>1?' and heavyweight fabric':''}; size ${size}. Weigh a sample to replace this assumption.`};
}
const edges=(v:{lengthCm:number;widthCm:number;heightCm:number})=>[v.lengthCm,v.widthCm,v.heightCm].sort((a,b)=>b-a);
export function prepareParcel(items:Array<{name:string;quantity:number;parcel:ItemParcel|null}>,packages:Packaging[]){
 if(!items.length||items.some(i=>!Number.isInteger(i.quantity)||i.quantity<1||!i.parcel))return {suggestion:null,reason:'At least one item has no parcel measurements. Fill its shipping profile first.'};
 const weight=items.reduce((n,i)=>n+i.parcel!.weightGrams*i.quantity,0);
 const volume=items.reduce((n,i)=>n+i.parcel!.lengthCm*i.parcel!.widthCm*i.parcel!.heightCm*i.quantity,0);
 const fits=packages.filter(p=>weight+p.tareGrams<=p.maxWeightGrams&&weight+p.tareGrams<=50000&&volume<=p.lengthCm*p.widthCm*p.heightCm*.7&&items.every(i=>edges(i.parcel!).every((v,j)=>v<=edges(p)[j]))).sort((a,b)=>a.lengthCm*a.widthCm*a.heightCm-b.lengthCm*b.widthCm*b.heightCm);
 const p=fits[0];if(!p)return {suggestion:null,reason:'No preset fits the estimated contents. Check packing or split the order into separate parcels; do not book as one automatically.'};
 return {suggestion:{weightKg:(weight+p.tareGrams)/1000,lengthCm:p.lengthCm,widthCm:p.widthCm,heightCm:p.heightCm,packagingId:p.id,packagingName:p.name,estimated:!p.measured||items.some(i=>!i.parcel!.measured),requiresPackingCheck:true},reason:'Packing is a volume-based estimate, not a guaranteed fit. Confirm the actual whole parcel before a paid booking.'};
}
