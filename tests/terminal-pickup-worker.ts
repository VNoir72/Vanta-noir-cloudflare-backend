import {getPickupDetails,savePickupDetails} from '../lib/terminal-pickup';
import {GET,PUT} from '../app/api/admin/terminal-pickup/route';
export default {async fetch(r:Request){if(new URL(r.url).pathname.startsWith('/api/'))return r.method==='PUT'?PUT(r):GET(r);try{return Response.json(r.method==='GET'?await getPickupDetails():await (async()=>{const b:any=await r.json();return savePickupDetails(b.details,b.revision);})());}catch{return Response.json({error:'Invalid or conflicting save'},{status:400});}}};
