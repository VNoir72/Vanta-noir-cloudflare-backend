import { z } from "zod";
import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import { getDbBinding, configuredShippingFeeKobo } from "@/lib/runtime-env";
import { isPaystackConfigured } from "@/lib/paystack";
import { checkoutSetupIssues, commerceSettingsSchema } from "@/lib/commerce-config";
import { getCommerceSettings, saveCommerceSettings, returnUpdateSchema, updateReturn, runCommerceMaintenance, emailReady } from "@/lib/commerce-db";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 const db=getDbBinding(); const page=Math.max(1,Math.min(10000,Math.floor(Number(new URL(request.url).searchParams.get("page"))||1)));const offset=(page-1)*50;
 const [settings,reviews,returns,emails,subscribers,stock]=await Promise.all([
   getCommerceSettings(),
   db.prepare("SELECT r.id,r.display_name AS displayName,r.rating,r.fit,r.body,r.status,r.created_at AS createdAt,p.name AS productName FROM product_reviews r JOIN products p ON p.id=r.product_id ORDER BY CASE WHEN r.status='pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 51 OFFSET ?").bind(offset).all(),
   db.prepare("SELECT r.id,r.version,r.kind,r.reason,r.items_json AS itemsJson,r.status,r.notes,r.refund_kobo AS refundKobo,r.refund_reference AS refundReference,r.refund_status AS refundStatus,r.restocked,r.created_at AS createdAt,o.reference,o.email FROM return_requests r JOIN orders o ON o.id=r.order_id ORDER BY r.created_at DESC LIMIT 51 OFFSET ?").bind(offset).all(),
   db.prepare("SELECT id,recipient,subject,status,attempts,last_error AS lastError,created_at AS createdAt,sent_at AS sentAt FROM email_outbox ORDER BY created_at DESC LIMIT 51 OFFSET ?").bind(offset).all(),
   db.prepare("SELECT id,email,kind,variant_id AS variantId,status,created_at AS createdAt FROM subscribers ORDER BY created_at DESC LIMIT 51 OFFSET ?").bind(offset).all(),
   db.prepare("SELECT a.*,v.sku FROM stock_adjustments a LEFT JOIN product_variants v ON v.id=a.variant_id ORDER BY a.id DESC LIMIT 51 OFFSET ?").bind(offset).all(),
 ]);
 return Response.json({settings,emailConfigured:emailReady(),paymentsConfigured:isPaystackConfigured(),setupIssues:checkoutSetupIssues(settings,isPaystackConfigured(),configuredShippingFeeKobo()),page,hasMore:[reviews,returns,emails,subscribers,stock].some(r=>r.results.length>50),reviews:reviews.results.slice(0,50),returns:returns.results.slice(0,50),emails:emails.results.slice(0,50),subscribers:subscribers.results.slice(0,50),stock:stock.results.slice(0,50)});
}
export async function POST(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 const body=await request.json().catch(()=>null) as {action?:string;settings?:unknown;data?:unknown}|null;
 try{
  if(body?.action==="settings"){
    const settings=commerceSettingsSchema.parse(body.settings);
    const issues=checkoutSetupIssues(settings,isPaystackConfigured(),configuredShippingFeeKobo());
    if(settings.acceptingOrders&&issues.length)return Response.json({error:`Complete store setup first: ${issues.join("; ")}.`},{status:400});
    return Response.json({settings:await saveCommerceSettings(settings)});
  }
  if(body?.action==="process-emails")return Response.json(await runCommerceMaintenance());
  if(body?.action==="return"){await updateReturn(returnUpdateSchema.parse(body.data),auth.email);return Response.json({ok:true});}
  if(body?.action==="review"){const input=z.object({id:z.string().max(100),status:z.enum(["published","rejected","pending"])}).parse(body.data);const result=await getDbBinding().prepare("UPDATE product_reviews SET status=? WHERE id=?").bind(input.status,input.id).run();return Response.json({ok:Boolean(result.meta.changes)});}
  return Response.json({error:"Unknown action."},{status:400});
 }catch(e){const message=e instanceof z.ZodError ? e.issues[0]?.message : e instanceof Error ? e.message : "Could not save changes.";return Response.json({error:/^(Return|Move|Refund|Record|Only|This request|Each delivery|Choose a|Invalid|Expected)/.test(message||"")?message:"Could not save changes. Check the fields and try again."},{status:400});}
}
