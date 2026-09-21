import { getCommerceSettings, emailReady } from "@/lib/commerce-db";
export const dynamic="force-dynamic";
export async function GET(){return Response.json({...await getCommerceSettings(),emailEnabled:emailReady()},{headers:{"Cache-Control":"no-store"}});}
