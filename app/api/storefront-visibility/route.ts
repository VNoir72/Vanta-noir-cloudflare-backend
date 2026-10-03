import { getDbBinding } from '@/lib/runtime-env';
import { storefrontVisibility } from '@/lib/storefront-visibility';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return storefrontVisibility(request, getDbBinding());
}
