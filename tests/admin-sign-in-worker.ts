import {GET,POST} from '../app/api/admin/sign-in-security/route';
import {POST as register} from '../app/api/admin/sign-in-device/route';
import {adminAuthStateFromRequest} from '../lib/admin-auth';
import {cleanupAdminSignIns} from '../lib/admin-sign-in';
import {processEmailOutbox} from '../lib/commerce-db';
export default {async fetch(r:Request){const p=new URL(r.url).pathname;if(p==='/api/admin/sign-in-security')return r.method==='GET'?GET(r):POST(r);if(p==='/api/admin/sign-in-device')return register(r);const a=await adminAuthStateFromRequest(r);if(!a.ok)return Response.json(a,{status:a.status});if(p==='/api/admin/send')return Response.json(await processEmailOutbox(100));if(p==='/api/admin/cleanup'){await cleanupAdminSignIns();return Response.json({ok:true});}return Response.json(a);}};

