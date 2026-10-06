import {POST as customerSupport} from '../app/api/support/route';
import * as support from '../app/api/admin/support/route';
import * as sales from '../app/api/admin/sales/route';
import {GET as media} from '../app/api/media/[...key]/route';
import * as ga4Route from '../app/api/admin/ga4/route';
import {GET as ga4Callback} from '../app/api/admin/ga4/callback/route';
import * as ga4Oauth from '../lib/ga4-oauth';
import * as emailDelivery from "../lib/email-delivery";
import * as emailDeliveryRoute from "../app/api/admin/email-delivery/route";
import {POST as emailWebhook} from "../app/api/email/webhook/route";
import * as checkoutPayments from "../lib/checkout-payment";
import * as paymentUpdates from "../lib/payment-events";
import {GET as paymentUpdatesRoute} from "../app/api/admin/payment-updates/route";
import {accessKeys,evaluateAccess} from '../lib/access-evaluation';
import * as approvals from '../app/api/admin/approvals/route';
import * as inventory from '../app/api/admin/inventory/route';
import * as reconciliation from '../lib/payment-reconciliation';
import {POST as paymentWebhook} from '../app/api/payments/webhook/route';
import * as rewards from '../lib/rewards-db';
import {POST as rewardQuote} from '../app/api/rewards/quote/route';
import * as receipts from "../lib/receipt-access";
import {GET as verify} from "../app/api/payments/verify/route";
import {GET as publicSettings} from "../app/api/store-settings/route";
import {POST as upload} from "../app/api/admin/uploads/route";
import { env } from "cloudflare:workers";
import * as operations from "../lib/operations";
import * as opsRoute from "../app/api/admin/operations/route";
import {POST as courier} from "../app/api/courier/webhook/route";
import {POST as promotionQuote} from "../app/api/promotions/quote/route";
import * as commerce from "../lib/commerce-db";
import * as merchandising from '../lib/merchandising-db';
import * as releases from '../app/api/admin/releases/route';
import {GET as catalogRoute} from '../app/api/catalog/route';
import * as store from "../lib/store-db";
import * as reviews from "../app/api/reviews/route";
import * as subscriptions from "../app/api/subscriptions/route";
import * as returns from "../app/api/returns/route";
import * as admin from "../app/api/admin/commerce/route";
import * as orders from "../app/api/admin/orders/route";
import * as products from "../app/api/admin/products/route";
import { POST as checkout } from "../app/api/checkout/route";
import { checkApiRequest, secureResponse } from "../lib/http-policy";
const routes: Record<string, Record<string, (request: Request) => Promise<Response>>> = {
  '/api/support':{POST:customerSupport},
  '/api/admin/support':{GET:support.GET,POST:support.POST},
  '/api/admin/sales':{GET:sales.GET,POST:sales.POST},
  '/api/admin/ga4':{GET:ga4Route.GET,POST:ga4Route.POST},
  '/api/admin/ga4/callback':{GET:ga4Callback},
  '/api/admin/email-delivery':{GET:emailDeliveryRoute.GET,POST:emailDeliveryRoute.POST},
 '/api/email/webhook':{POST:emailWebhook},
 '/api/admin/payment-updates':{GET:paymentUpdatesRoute},
 '/api/access/keys':{GET:accessKeys},
 '/api/access/evaluate':{POST:evaluateAccess},
 '/api/admin/approvals':{GET:approvals.GET,POST:approvals.POST},
 '/api/admin/inventory':{GET:inventory.GET,PATCH:inventory.PATCH},
 '/api/payments/webhook':{POST:paymentWebhook},
 '/api/rewards/quote':{POST:rewardQuote},
  '/api/admin/releases':{GET:releases.GET,POST:releases.POST},
  '/api/payments/verify':{GET:verify},
  '/api/store-settings':{GET:publicSettings},
  '/api/admin/uploads':{POST:upload},
  '/api/catalog':{GET:catalogRoute},
  "/api/admin/operations": {GET:opsRoute.GET,POST:opsRoute.POST},
  "/api/courier/webhook": {POST:courier},
  "/api/promotions/quote": {POST:promotionQuote},
  "/api/reviews": { GET: reviews.GET, POST: reviews.POST },
  "/api/subscriptions": { POST: subscriptions.POST },
  "/api/returns": { POST: returns.POST },
  "/api/admin/commerce": { GET: admin.GET, POST: admin.POST },
  "/api/admin/orders": { GET: orders.GET, PATCH: orders.PATCH },
  "/api/admin/products": { GET: products.GET, POST: products.POST, PATCH: products.PATCH, DELETE: products.DELETE },
  "/api/checkout": { POST: checkout },
};
export default {async fetch(request:Request){try{const settings={ALLOWED_ORIGINS:"https://vantanoir.store"};const denied=checkApiRequest(request,settings);if(denied)return denied;if(new URL(request.url).pathname.startsWith('/api/media/'))return media(request,{params:Promise.resolve({key:new URL(request.url).pathname.slice(11).split('/')})});const route=routes[new URL(request.url).pathname]?.[request.method];if(route)return secureResponse(await route(request),request,settings);const {action,args}=await request.json() as {action:string;args:unknown[]};if(action==="sql")return Response.json(await env.DB.prepare(String(args[0])).bind(...args.slice(1)).all());const fn=({...ga4Oauth,...emailDelivery,...checkoutPayments,...paymentUpdates,...reconciliation,...rewards,...store,...commerce,...operations,...merchandising,...receipts} as unknown as Record<string,(...args:unknown[])=>Promise<unknown>>)[action];return Response.json(await fn(...args)??null);}catch(e){return Response.json({error:e instanceof Error?e.message:"Error"},{status:400});}}};
