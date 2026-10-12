import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {growthConfig,saveGrowth,growthReadiness,audienceReport} from '@/lib/growth';
import {createCirclePlan,validateCirclePlan,circleReport} from '@/lib/circle';
import {growthSchema} from '@/lib/growth-policy';
import {isAdminEmail} from '@/lib/runtime-env';
export async function GET(request:Request){const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status});if(!isAdminEmail(a.email))return Response.json({error:'Owner access required.'},{status:403});try{return Response.json({config:await growthConfig(),readiness:growthReadiness(),audience:await audienceReport(),circle:await circleReport()},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Growth controls could not load.'},{status:503});}}
async function mutate(request:Request){const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status});if(!isAdminEmail(a.email))return Response.json({error:'Owner access required.'},{status:403});try{const raw=await request.text();if(raw.length>20000)throw Error('Settings are too large.');const c=growthSchema.parse(JSON.parse(raw));if(request.method==='POST')return Response.json(await createCirclePlan(c.circle));if(c.circle.enabled)await validateCirclePlan(c.circle);return Response.json({config:await saveGrowth(c,a.email)});}catch(e){return Response.json({error:e instanceof Error?e.message:'Could not save.'},{status:409});}}
export const PATCH=mutate;export const POST=mutate;
