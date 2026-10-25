import {adminPasswordEndpoint,cleanupAdminPasswordSessions} from '../lib/admin-password-session';
import {adminAuthStateFromRequest} from '../lib/admin-auth';
import {adminLoginPage} from '../lib/admin-login-page';
export default {async fetch(request:Request) {
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/admin-auth/'))return adminPasswordEndpoint(request);
 if(path==='/admin-login'||path==='/admin-logout')return adminLoginPage(path==='/admin-logout');
 if(path==='/test/cleanup'){await cleanupAdminPasswordSessions();return Response.json({ok:true});}
 const auth=await adminAuthStateFromRequest(request);return Response.json(auth,{status:auth.ok?200:auth.status});
}};
