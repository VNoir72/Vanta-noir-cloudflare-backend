import { env } from "cloudflare:workers";
import * as operations from "../lib/operations";
import * as opsRoute from "../app/api/admin/operations/route";
import {POST as courier} from "../app/api/courier/webhook/route";
import {POST as promotionQuote} from "../app/api/promotions/quote/route";
import * as commerce from "../lib/commerce-db";
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
export default {async fetch(request:Request){try{const settings={ALLOWED_ORIGINS:"https://vantanoir.store"};const denied=checkApiRequest(request,settings);if(denied)return denied;const route=routes[new URL(request.url).pathname]?.[request.method];if(route)return secureResponse(await route(request),request,settings);const {action,args}=await request.json() as {action:string;args:unknown[]};if(action==="sql")return Response.json(await env.DB.prepare(String(args[0])).bind(...args.slice(1)).all());const fn=({...store,...commerce,...operations} as unknown as Record<string,(...args:unknown[])=>Promise<unknown>>)[action];return Response.json(await fn(...args)??null);}catch(e){return Response.json({error:e instanceof Error?e.message:"Error"},{status:400});}}};
