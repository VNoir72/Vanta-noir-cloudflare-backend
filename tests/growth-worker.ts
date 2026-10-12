import * as growth from '../lib/growth';
import * as circle from '../lib/circle';
import * as phone from '../lib/phone-verification';
import {customerApp} from '../lib/customer-app';
const actions={...growth,...circle,...phone};
export default {async fetch(request:Request){if(new URL(request.url).pathname.startsWith('/api/customer'))return customerApp(request);try{const {action,args}=await request.json() as {action:keyof typeof actions;args:unknown[]};let result;if(action==='recordPresence')result=await growth.recordPresence(new Request('https://test',{headers:{authorization:'Bearer fixture'}}),args[0] as string,args[1]);else if(action==='phoneSend')result=await phone.phoneSend(new Request('https://test'),args[0] as string);else result=await (actions[action] as (...a:unknown[])=>Promise<unknown>)(...args);return Response.json(result??null);}catch(e){return Response.json({error:e instanceof Error?e.message:'Failed'},{status:400});}}};
