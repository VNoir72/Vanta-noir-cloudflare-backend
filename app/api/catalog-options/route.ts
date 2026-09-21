import {getCatalogOptions} from '@/lib/catalog-options-db';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(await getCatalogOptions(),{headers:{'Cache-Control':'no-store'}});}
