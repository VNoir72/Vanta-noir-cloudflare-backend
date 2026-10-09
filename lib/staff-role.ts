import {getDbBinding,isAdminEmail} from './runtime-env';
import type {StaffRole} from './operations-permissions';
export async function staffRole(email:string):Promise<StaffRole|null>{
 if(isAdminEmail(email))return 'owner';
 const row=await getDbBinding().prepare('SELECT role FROM admin_staff WHERE email=? AND active=1').bind(email.trim().toLowerCase()).first<{role:StaffRole}>();
 return row && ['sales','catalogue','fulfilment','support','analyst'].includes(row.role)?row.role:null;
}
