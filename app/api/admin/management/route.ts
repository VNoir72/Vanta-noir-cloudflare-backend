import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {getDbBinding,runtimeEnv} from '@/lib/runtime-env';
import {getCommerceSettings} from '@/lib/commerce-db';
import {z} from 'zod';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 const db=getDbBinding(),p=new URL(request.url).searchParams,resource=p.get('resource')||'attention';
 try{
  if(resource==='attention'){
   const [orders,returns,emails,campaign,settings,approvals]=await Promise.all([
    db.prepare(`SELECT status,COUNT(*) AS count,MAX(updated_at) AS latest FROM orders WHERE payment_status='paid' AND status IN ('paid','processing','paid_stock_review') GROUP BY status`).all(),
    db.prepare("SELECT COUNT(*) AS count,MAX(updated_at) AS latest FROM return_requests WHERE status IN ('requested','approved','received')").first(),
    db.prepare("SELECT COUNT(*) AS count,MAX(created_at) AS latest FROM email_outbox WHERE status='review' OR (status='pending' AND attempts>=8)").first(),
    db.prepare("SELECT value FROM store_meta WHERE key='admin-overview-product'").first<{value:string}>(),getCommerceSettings(),db.prepare("SELECT COUNT(*) AS count,MAX(created_at) AS latest FROM admin_approvals WHERE status='pending'").first()
   ]);return Response.json({orders:orders.results,returns,emails,approvals,campaignProductId:campaign?.value||'',lowStockThreshold:settings.lowStockThreshold,checkedAt:new Date().toISOString()}, {headers});
  }
  if(resource==='search'){
   const query=(p.get('q')||'').trim().slice(0,120);if(query.length<2)return Response.json({orders:[],customers:[]},{headers});const like=`%${query.replace(/[\\%_]/g,'\\$&')}%`;
   const [orders,customers]=await Promise.all([
    db.prepare(`SELECT reference,first_name AS firstName,last_name AS lastName,status FROM orders WHERE reference LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR (first_name||' '||last_name) LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT 8`).bind(like,like,like,like).all(),
    db.prepare(`SELECT lower(email) AS email,MAX(first_name||' '||last_name) AS name,COUNT(*) AS orders FROM orders WHERE email LIKE ? ESCAPE '\\' OR (first_name||' '||last_name) LIKE ? ESCAPE '\\' GROUP BY lower(email) ORDER BY MAX(created_at) DESC LIMIT 8`).bind(like,like).all()
   ]);return Response.json({orders:orders.results,customers:customers.results},{headers});
  }
  if(resource==='customers'){
   const query=(p.get('q')||'').trim().slice(0,120),page=Math.max(1,Math.min(10000,Math.floor(Number(p.get('page'))||1))),like=`%${query.replace(/[\\%_]/g,'\\$&')}%`;
   const rows=await db.prepare(`SELECT lower(email) AS email,MAX(first_name||' '||last_name) AS name,COUNT(*) AS orders,SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN 1 ELSE 0 END) AS paidOrders,COALESCE(SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN total_kobo ELSE 0 END),0) AS paidKobo,MAX(created_at) AS lastOrder FROM orders GROUP BY lower(email) HAVING lower(email) LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' ORDER BY lastOrder DESC LIMIT 51 OFFSET ?`).bind(like,like,(page-1)*50).all();return Response.json({customers:rows.results.slice(0,50),hasMore:rows.results.length>50,page},{headers});
  }
  if(resource==='integrations'){const env=runtimeEnv();return Response.json({ga4Configured:!!(env.GA4_PROPERTY_ID&&env.GA4_SERVICE_ACCOUNT_JSON),paymentsConfigured:!!env.PAYSTACK_SECRET_KEY,emailConfigured:!!(env.RESEND_API_KEY&&env.EMAIL_FROM),courierReceiverConfigured:!!env.COURIER_WEBHOOK_SECRET},{headers});}
  return Response.json({error:'Unknown management section.'},{status:400,headers});
 }catch{return Response.json({error:'This section could not load. Please retry.'},{status:503,headers});}
}
export async function PATCH(request:Request){
 const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 const data=z.object({campaignProductId:z.string().max(160)}).safeParse(await request.json().catch(()=>null));if(!data.success)return Response.json({error:'Choose a product.'},{status:400});
 const db=getDbBinding(),id=data.data.campaignProductId;
 if(id&&!await db.prepare("SELECT id FROM products WHERE id=? AND status<>'archived'").bind(id).first())return Response.json({error:'Choose an existing, non-archived product.'},{status:400});
 await db.batch([db.prepare("INSERT INTO store_meta(key,value) VALUES('admin-overview-product',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(id),db.prepare("INSERT INTO admin_audit(actor,action,entity,detail) VALUES(?,'overview artwork','dashboard',?)").bind(auth.email,id)]);
 return Response.json({ok:true,campaignProductId:id},{headers});
}
