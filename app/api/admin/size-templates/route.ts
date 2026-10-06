import {z} from 'zod';
import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {rateLimit} from '@/lib/commerce-db';
import {getDbBinding} from '@/lib/runtime-env';
import {sizeGuideSchema} from '@/lib/sizing';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const schema=z.object({name:z.string().trim().min(1).max(80),guide:sizeGuideSchema}).strict();
async function auth(r:Request){const a=await adminAuthStateFromRequest(r);if(!a.ok)return Response.json({error:a.error},{status:a.status,headers});if(a.role!=='owner')return Response.json({error:'Owner access required.'},{status:403,headers});}
export async function GET(r:Request){const denied=await auth(r);if(denied)return denied;try{const data=await getDbBinding().prepare("SELECT key,value FROM store_meta WHERE key LIKE 'size-template:%' ORDER BY key DESC LIMIT 100").all<{key:string;value:string}>();return Response.json({templates:data.results.map(row=>({id:row.key,...schema.parse(JSON.parse(row.value))}))},{headers});}catch{return Response.json({error:'Saved charts could not load. Please retry.'},{status:503,headers});}}
export async function POST(r:Request){const denied=await auth(r);if(denied)return denied;if(r.headers.get('origin')!==new URL(r.url).origin)return Response.json({error:'Open the owner product editor to save a chart.'},{status:403,headers});if(!await rateLimit(r,'size-templates',30,3600))return Response.json({error:'Please wait before saving more charts.'},{status:429,headers});try{const text=await r.text();if(text.length>30000)return Response.json({error:'Chart is too large.'},{status:413,headers});const value=schema.parse(JSON.parse(text));if(!value.guide.sections.length)throw Error('Empty chart');value.guide.status='reference';const id='size-template:'+Date.now()+':'+crypto.randomUUID();await getDbBinding().prepare('INSERT INTO store_meta(key,value) VALUES(?,?)').bind(id,JSON.stringify(value)).run();return Response.json({template:{id,...value}},{status:201,headers});}catch{return Response.json({error:'Could not save this chart. Check the name and measurements, then retry.'},{status:400,headers});}}
