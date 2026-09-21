import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
const tables=['products','variants','product_images','product_media','inventory_adjustments','orders','order_items','discounts'] as const;
export async function GET(request:Request){
 const auth=await adminAuthStateFromRequest(request);
 if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});
 const url=new URL(request.url), table=url.searchParams.get('table')||'orders';
 if(!tables.includes(table as typeof tables[number]))return Response.json({error:'Unknown archive.'},{status:400});
 const page=Math.max(1,Number.parseInt(url.searchParams.get('page')||'1',10)||1);
 const name=`legacy_v01_${table}`;
 const exists=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(name).first();
 if(!exists)return Response.json({rows:[],total:0,page,hasMore:false});
 const total=await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${name}`).first<{n:number}>();
 const {results}=await env.DB.prepare(`SELECT * FROM ${name} LIMIT 50 OFFSET ?`).bind((page-1)*50).all();
 return Response.json({rows:results,total:total?.n||0,page,hasMore:page*50<(total?.n||0)});
}
