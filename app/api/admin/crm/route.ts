import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {crmCustomers, crmProfile, crmSave} from '@/lib/crm';

export async function GET(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({error: auth.error}, {status: auth.status});
  if (auth.role !== 'owner') return Response.json({error: 'Owner access required.'}, {status: 403});
  // No CRM read happens until the signed Access identity and server role pass.
  try {
    const params = new URL(request.url).searchParams;
    const result = params.has('email')
      ? await crmProfile(params.get('email')!)
      : await crmCustomers(params.get('q') || '', Math.max(1, Math.min(10000, Math.floor(Number(params.get('page')) || 1))), params.get('tag') || '');
    return Response.json(result, {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return Response.json({error: 'Customer records unavailable.'}, {status: 400});
  }
}

export async function POST(request: Request) {
  const auth = await adminAuthStateFromRequest(request);
  if (!auth.ok) return Response.json({error: auth.error}, {status: auth.status});
  if (auth.role !== 'owner') return Response.json({error: 'Owner access required.'}, {status: 403});
  // Authorize before reading input or mutating customer records.
  try {
    const text = await request.text();
    if (text.length > 15000) return Response.json({error: 'Profile is too large.'}, {status: 413});
    return Response.json(await crmSave(JSON.parse(text), auth.email), {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return Response.json({error: 'Could not save customer. Check the fields and refresh before retrying.'}, {status: 409});
  }
}
