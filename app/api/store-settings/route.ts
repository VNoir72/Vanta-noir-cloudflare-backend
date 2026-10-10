import { getCommerceSettings, emailReady } from "@/lib/commerce-db";
import { publicCommerceSettings } from "@/lib/commerce-config";
import {shipbubbleCheckoutEnabled,internationalCourierEnabled} from '@/lib/runtime-env';
export const dynamic="force-dynamic";
export async function GET(){const settings=await getCommerceSettings();return Response.json({...publicCommerceSettings(settings,shipbubbleCheckoutEnabled()),internationalCourierEnabled:internationalCourierEnabled(settings),...(shipbubbleCheckoutEnabled()?{shippingZones:[]}:{}),emailEnabled:emailReady()},{headers:{"Cache-Control":"no-store"}});}
