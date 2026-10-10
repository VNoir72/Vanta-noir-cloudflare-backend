import {saveRewardCampaign,drawRewardWinners} from '@/lib/rewards-db';
import {getDbBinding} from '@/lib/runtime-env';
import {z} from 'zod';
import {permits,operationsData,adjustStock,bulkPrices,importProducts,savePromotion,saveStaff,deleteStaff,allocateExchange,exchangeTracking,orderAction,audit} from '@/lib/operations';
import {updateReturn,returnUpdateSchema} from '@/lib/commerce-db';
import {updateOrderTracking} from '@/lib/store-db';
import type {StaffRole} from './operations-permissions';
export const actionResource:Record<string,string>={stock:'inventory',prices:'bulk',import:'bulk',promotion:'promotions',reward:'promotions','reward-draw':'promotions',staff:'staff','staff-delete':'staff',exchange:'returns','exchange-tracking':'returns',return:'returns',order:'orders',tracking:'orders'};
export async function executeOperation(action:string,data:unknown,actor:string,role:StaffRole){
if(!actionResource[action]||!permits(role,actionResource[action]))throw new Error('Access denied.');
let result:unknown={ok:true};
 if(action==='stock')await adjustStock(data,actor);
 if(action==='prices')result=await bulkPrices(data,actor);
 if(action==='import')result=await importProducts(data,actor);
 if(action==='reward')result=await saveRewardCampaign(data,actor);
 if(action==='reward-draw')result=await drawRewardWinners(data,actor);
 if(action==='promotion')await savePromotion(data,actor);
 if(action==='staff')await saveStaff(data,actor);
 if(action==='staff-delete')await deleteStaff(data,actor);
 if(action==='exchange')await allocateExchange(data,actor);
 if(action==='exchange-tracking')await exchangeTracking(data,actor);
 if(action==='order')await orderAction(data,actor,role);
 if(action==='return'){const parsed=returnUpdateSchema.parse(data);if(role!=='owner'){const current=await getDbBinding().prepare('SELECT refund_kobo,refund_status,refund_reference FROM return_requests WHERE id=?').bind(parsed.id).first<{refund_kobo:number;refund_status:string;refund_reference:string}>();if(!current||parsed.refundKobo!==current.refund_kobo||parsed.refundStatus!==current.refund_status||parsed.refundReference!==current.refund_reference)throw new Error('Only the owner can change refunds.');}await updateReturn(parsed,actor);await audit(actor,'return update',parsed.id,parsed.status);}
 if(action==='tracking'){const v=z.object({reference:z.string().min(3),carrier:z.string().trim().max(100).optional(),trackingNumber:z.string().trim().max(160).optional(),trackingUrl:z.string().max(1000).refine(s=>!s||(/^https:\/\//.test(s)&&!new URL(s).username&&!new URL(s).password)).optional(),deliveryEstimate:z.string().max(160).optional(),expected:z.record(z.string()).optional()}).parse(data);await updateOrderTracking(v.reference,v,v.expected);await audit(actor,'tracking',v.reference);}

return result;
}
