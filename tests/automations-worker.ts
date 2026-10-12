import * as certification from '../lib/launch-certification';
import * as automations from '../lib/automations';
import * as state from '../lib/automation-state';
import * as crm from '../lib/crm';
import * as commerce from '../lib/commerce-db';
import {GET as getRules,POST as postRules} from '../app/api/admin/automations/route';
import {GET as getCrm} from '../app/api/admin/crm/route';
const methods={...certification,...automations,...state,...crm,...commerce};
export default {async fetch(request:Request){const path=new URL(request.url).pathname;if(path==='/api/admin/automations')return request.method==='GET'?getRules(request):postRules(request);if(path==='/api/admin/crm')return getCrm(request);try{const {action,args}=await request.json() as {action:keyof typeof methods;args:unknown[]};const fn=methods[action] as (...args:unknown[])=>Promise<unknown>;return Response.json(await fn(...args)??{});}catch(e){return Response.json({error:e instanceof Error?e.message:'Failed'},{status:400});}}};
