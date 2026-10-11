import {runtimeEnv,getDbBinding} from './runtime-env';
import {receiptDigest} from './receipt-access';
const tokenPattern=/^[a-f0-9-]{73}$/;
export async function appSession(request: Request) {
  if(runtimeEnv().CUSTOMER_APP_ENABLED!=='true')return null;
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token || !tokenPattern.test(token)) return null;
  return getDbBinding()
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
}
