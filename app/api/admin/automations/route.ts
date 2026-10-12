import {z} from 'zod';
import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {automationOverview,previewAutomation,runAutomation,saveDrop} from '@/lib/automations';
import {saveAutomation} from '@/lib/automation-state';
import {ruleIds} from '@/lib/automation-policy';
export async function GET(request:Request){const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status});if(a.role!=='owner')return Response.json({error:'Owner access required.'},{status:403});try{return Response.json(await automationOverview(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Automation records could not load.'},{status:503});}}
export async function POST(request:Request){const a=await adminAuthStateFromRequest(request);if(!a.ok)return Response.json({error:a.error},{status:a.status});if(a.role!=='owner')return Response.json({error:'Owner access required.'},{status:403});try{const raw=await request.text();if(raw.length>20000)throw Error('Request is too large.');const v=z.object({action:z.enum(['save','preview','run','retry','drop']),data:z.unknown()}).strict().parse(JSON.parse(raw));let result;
 if(v.action==='save')result=await saveAutomation(v.data,a.email);else if(v.action==='drop')result=await saveDrop(v.data,a.email);else {const d=z.object({id:z.enum(ruleIds),runId:z.string().uuid().optional()}).strict().parse(v.data);if(v.action==='retry'&&!d.runId)throw Error('Choose a failed run.');result=v.action==='preview'?await previewAutomation(d.id):await runAutomation(d.id,a.email,v.action==='retry'?d.runId:undefined);}return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Could not update automation.'},{status:409});}}
