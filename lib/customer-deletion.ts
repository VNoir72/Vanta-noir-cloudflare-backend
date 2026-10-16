import {getDbBinding} from './runtime-env';
import {deleteFirebaseCustomer} from './firebase-customer';

// Idempotent provider deletion is retried from a durable record. Never store a session or email here.
export async function completeIdentityDeletion(uid:string):Promise<boolean> {
 const db=getDbBinding(),key='identity-deletion:'+uid;
 if(!await db.prepare('SELECT key FROM store_meta WHERE key=?').bind(key).first())return true;
 try {
  await deleteFirebaseCustomer(uid);
  await db.prepare('DELETE FROM store_meta WHERE key=?').bind(key).run();
  return true;
 } catch { return false; }
}
export async function retryIdentityDeletions() {
 const rows=await getDbBinding().prepare("SELECT value FROM store_meta WHERE key LIKE 'identity-deletion:%' ORDER BY json_extract(value,'$.createdAt') LIMIT 10").all<{value:string}>();
 let pending=0;
 for(const row of rows.results){const {uid}=JSON.parse(row.value);if(typeof uid==='string'&&!await completeIdentityDeletion(uid))pending++;}
 if(pending)console.warn('Account identity cleanup pending',pending);
}
