import {runtimeEnv,getDbBinding} from './runtime-env';
import {firebaseSessionValid} from './firebase-customer';
import {receiptDigest} from './receipt-access';
const tokenPattern=/^[a-f0-9-]{73}$/;
export async function appSession(request: Request) {
  if(runtimeEnv().CUSTOMER_APP_ENABLED!=='true')return null;
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token || !tokenPattern.test(token)) return null;
  const db=getDbBinding();
  const session=await db
    .prepare(
      `SELECT c.id,c.email,c.name,c.addresses_json,c.favourites_json,s.created_at AS authenticatedAt
 FROM app_sessions s JOIN app_customers c ON c.id=s.customer_id WHERE s.digest=? AND s.expires_at>?`,
    )
    .bind(await receiptDigest(token), Date.now())
    .first<{
      id: string;
      email: string;
      name: string;
      addresses_json: string;
      favourites_json: string;
      authenticatedAt: number;
    }>();
  if(!session)return null;
  const binding=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('firebase-customer:'+session.id).first<{value:string}>();
  const proof=await db.prepare('SELECT value FROM store_meta WHERE key=?').bind('firebase-session:'+await receiptDigest(token)).first<{value:string}>();
  if(!binding||proof?.value!==binding.value){await db.prepare('DELETE FROM app_sessions WHERE digest=?').bind(await receiptDigest(token)).run();return null;}
  let valid=false;
  try { valid=!!binding && await firebaseSessionValid(binding.value,session.email,session.authenticatedAt); }
  catch { return null; } // Provider outage never authorizes a session or deletes it.
  if(!valid){await db.prepare('DELETE FROM app_sessions WHERE digest=?').bind(await receiptDigest(token)).run();return null;}
  return session;
}
