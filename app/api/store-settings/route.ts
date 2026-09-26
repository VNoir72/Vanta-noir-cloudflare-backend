import { getCommerceSettings, emailReady } from "@/lib/commerce-db";
import { publicCommerceSettings } from "@/lib/commerce-config";
export const dynamic="force-dynamic";
export async function GET(){return Response.json({...publicCommerceSettings(await getCommerceSettings()),emailEnabled:emailReady()},{headers:{"Cache-Control":"no-store"}});}
