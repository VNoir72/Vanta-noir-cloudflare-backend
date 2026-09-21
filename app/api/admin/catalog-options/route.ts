import {adminAuthStateFromRequest} from '@/lib/admin-auth';
import {saveCatalogOption} from '@/lib/catalog-options-db';
import {optionSchema} from '@/lib/catalog-options';
export async function POST(request:Request){const auth=await adminAuthStateFromRequest(request);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});const p=optionSchema.safeParse(await request.json().catch(()=>null));if(!p.success)return Response.json({error:p.error.issues[0].message},{status:400});return Response.json(await saveCatalogOption(p.data));}
