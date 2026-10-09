import { getCommerceSettings, emailReady } from "@/lib/commerce-db";
import { publicCommerceSettings } from "@/lib/commerce-config";
import {shipbubbleCheckoutEnabled} from '@/lib/runtime-env';
export const dynamic="force-dynamic";
export async function GET(){return Response.json({...publicCommerceSettings(await getCommerceSettings(),shipbubbleCheckoutEnabled()),...(shipbubbleCheckoutEnabled()?{shippingZones:[]}:{}),emailEnabled:emailReady()},{headers:{"Cache-Control":"no-store"}});}
