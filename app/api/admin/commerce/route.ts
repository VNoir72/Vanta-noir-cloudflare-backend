import {applyFieldChanges} from '@/lib/admin-field-patch';
import {SETTINGS_SECTIONS,type SettingsSection} from "@/lib/settings-sections";
import { z } from "zod";
import { adminAuthStateFromRequest } from "@/lib/admin-auth";
import { getDbBinding, configuredShippingFeeKobo, shipbubbleCheckoutEnabled } from "@/lib/runtime-env";
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
 return Response.json({settings,emailConfigured:emailReady(),paymentsConfigured:isPaystackConfigured(),setupIssues:checkoutSetupIssues(settings,isPaystackConfigured(),configuredShippingFeeKobo(),shipbubbleCheckoutEnabled()),page,hasMore:[reviews,returns,emails,subscribers,stock].some(r=>r.results.length>50),reviews:reviews.results.slice(0,50),returns:returns.results.slice(0,50),emails:emails.results.slice(0,50),subscribers:subscribers.results.slice(0,50),stock:stock.results.slice(0,50)});
}
export async function POST(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 const body=await request.json().catch(()=>null) as {action?:string;settings?:unknown;data?:unknown}|null;
 try{
  if(body?.action==='settings-fields'){
    const input=z.object({section:z.enum(Object.keys(SETTINGS_SECTIONS) as [SettingsSection,...SettingsSection[]]),changes:z.array(z.object({path:z.array(z.string().min(1)).min(1).max(8),before:z.unknown(),value:z.unknown()})).min(1).max(20)}).parse(body.settings);
    const allowed:readonly string[]=SETTINGS_SECTIONS[input.section];
    if(input.changes.some(change=>!allowed.includes(change.path[0])))return Response.json({error:'Invalid section fields.'},{status:400});
    // Read/compare/write retries preserve concurrent changes to unrelated fields.
    const db=getDbBinding();
    for(let attempt=0;attempt<3;attempt++){
      const row=await db.prepare("SELECT value FROM store_meta WHERE key='commerce_settings'").first<{value:string}>();
      const current=row?commerceSettingsSchema.parse(JSON.parse(row.value)):await getCommerceSettings();
      const settings=commerceSettingsSchema.parse(applyFieldChanges(current,input.changes.map(c=>({path:c.path,before:c.before,value:c.value})),true));
      const issues=checkoutSetupIssues(settings,isPaystackConfigured(),configuredShippingFeeKobo(),shipbubbleCheckoutEnabled());
      if(settings.acceptingOrders&&issues.length)return Response.json({error:`Complete store setup first: ${issues.join('; ')}.`},{status:400});
      const saved=row?await db.prepare("UPDATE store_meta SET value=? WHERE key='commerce_settings' AND value=?").bind(JSON.stringify(settings),row.value).run():await db.prepare("INSERT OR IGNORE INTO store_meta(key,value) VALUES('commerce_settings',?)").bind(JSON.stringify(settings)).run();
      if(saved.meta.changes)return Response.json({settings});
    }
    return Response.json({error:'Settings changed during saving. Please retry.'},{status:409});
  }
  if(body?.action==="settings"||body?.action==='settings-section'){
    let raw=body.settings;
    if(body.action==='settings-section'){
      const input=z.object({section:z.enum(Object.keys(SETTINGS_SECTIONS) as [SettingsSection,...SettingsSection[]]),values:z.record(z.unknown())}).parse(raw);
      const allowed:readonly string[]=SETTINGS_SECTIONS[input.section];
      if(Object.keys(input.values).some(key=>!allowed.includes(key)))return Response.json({error:'Invalid section fields.'},{status:400});
      raw={...await getCommerceSettings(),...input.values};
    }
    const settings=commerceSettingsSchema.parse(raw);
    const issues=checkoutSetupIssues(settings,isPaystackConfigured(),configuredShippingFeeKobo(),shipbubbleCheckoutEnabled());
    if(settings.acceptingOrders&&issues.length)return Response.json({error:`Complete store setup first: ${issues.join("; ")}.`},{status:400});
    return Response.json({settings:await saveCommerceSettings(settings)});
  }
  if(body?.action==="process-emails")return Response.json(await runCommerceMaintenance());
  if(body?.action==="return"){await updateReturn(returnUpdateSchema.parse(body.data),auth.email);return Response.json({ok:true});}
  if(body?.action==="review"){const input=z.object({id:z.string().max(100),status:z.enum(["published","rejected","pending"])}).parse(body.data);const result=await getDbBinding().prepare("UPDATE product_reviews SET status=? WHERE id=?").bind(input.status,input.id).run();return Response.json({ok:Boolean(result.meta.changes)});}
  return Response.json({error:"Unknown action."},{status:400});
 }catch(e){const message=e instanceof z.ZodError ? e.issues[0]?.message : e instanceof Error ? e.message : "Could not save changes.";return Response.json({error:/^(This field|Return|Move|Refund|Record|Only|This request|Each |Choose a|Use a|Add international|Invalid|Expected)/.test(message||"")?message:"Could not save changes. Check the fields and try again."},{status:400});}
}
