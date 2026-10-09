import {shippingWeightsAdmin} from '../lib/shipping-weights-admin';
import {shipbubbleWebhook} from '../lib/shipbubble-webhook';
import {shipbubbleAdmin} from '../lib/shipbubble-admin';
import {runLiveCheck} from '../lib/terminal-live';
import {runComparisonJob} from '../lib/shipping-comparison-job';
import {runDeliveryAcceptance} from '../lib/terminal-delivery-acceptance';
import {runTerminalJob} from '../lib/terminal-jobs';
import {accessKeys,evaluateAccess} from "../lib/access-evaluation";
/** Cloudflare Worker entry point for the vinext-starter template. */
import {reconcilePendingPayments} from "../lib/payment-reconciliation";
import { runCommerceMaintenance } from "../lib/commerce-db";
import handler from "vinext/server/app-router-entry";
import { checkApiRequest, secureResponse } from "../lib/http-policy";
import { POST as uploadProductImage } from "../app/api/admin/uploads/route";
import { POST as paymentWebhook } from "../app/api/payments/webhook/route";
import imageVariants from "../lib/image-assets.json";
import { storefrontRedirectUrl } from "../lib/storefront-redirect";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  AUTH_PROVIDER?: string;
  STOREFRONT_URL?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async scheduled(_event: unknown, _env: Env, ctx: ExecutionContext) { ctx.waitUntil((async()=>{ await reconcilePendingPayments().catch(()=>{}); await runCommerceMaintenance().catch(()=>{}); await runTerminalJob().catch(()=>{}); await runLiveCheck().catch(()=>{}); await runDeliveryAcceptance().catch(()=>{}); await runComparisonJob().catch(()=>{}); })()); },
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") return Response.json({ok:true,service:"vanta-noir-api",version:"0.3.4"});
    const denied = checkApiRequest(request, env);
    if (denied) return secureResponse(denied, request, env);
    if (url.pathname === "/api/shipbubble/webhook") return secureResponse(await shipbubbleWebhook(request),request,env);
    if (url.pathname === "/api/admin/shipping-weights") return secureResponse(await shippingWeightsAdmin(request),request,env);
    if (url.pathname === "/api/admin/shipbubble") return secureResponse(await shipbubbleAdmin(request),request,env);
    if (url.pathname === "/api/access/keys" && request.method === "GET") return secureResponse(await accessKeys(),request,env);
    if (url.pathname === "/api/access/evaluate" && request.method === "POST") return secureResponse(await evaluateAccess(request),request,env);
    // Keep previously shared original image URLs usable after moving the large
    // design originals out of the deployment's public directory.
    const variants = (imageVariants as Record<string, Array<{src: string}>>)[url.pathname];
    if ((request.method === "GET" || request.method === "HEAD") && variants?.length) {
      return secureResponse(Response.redirect(new URL(variants[variants.length - 1].src, url).href, 302), request, env);
    }
    if (env.AUTH_PROVIDER === "cloudflare-access" && url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain" } });
    }
    if (env.AUTH_PROVIDER === "cloudflare-access" && env.STOREFRONT_URL
      && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/admin")
      && !url.pathname.startsWith("/assets/") && !url.pathname.startsWith("/_")) {
      return secureResponse(Response.redirect(storefrontRedirectUrl(url, env.STOREFRONT_URL), 302), request, env);
    }

    try {
      // Generated browser chunks are not application routes. Sites may pass
      // these requests through the Worker, so serve them from the asset binding.
      if ((request.method === "GET" || request.method === "HEAD")
        && url.pathname.startsWith("/assets/") && env.ASSETS) {
        return secureResponse(await env.ASSETS.fetch(request), request, env);
      }
      if (url.pathname === "/api/paystack/webhook" && request.method === "POST") { const response=await paymentWebhook(request); if(response.ok) ctx.waitUntil(runCommerceMaintenance().catch(()=>{})); return secureResponse(response,request,env); }
      // Multipart image uploads are API requests, so they must use the upload
      // route's size limit instead of the framework's Server Action form limit.
      if (url.pathname === "/api/admin/uploads" && request.method === "POST") {
        return secureResponse(await uploadProductImage(request), request, env);
      }
      const response=await handler.fetch(request,env,ctx);
      if(response.ok && url.pathname!=="/api/admin/chat" && url.pathname.startsWith("/api/") && (request.method !== "GET" || url.pathname === "/api/admin/commerce" || url.pathname === "/api/payments/verify")) {
        ctx.waitUntil(runCommerceMaintenance().catch(error=>console.error("Commerce notifications pending",error instanceof Error ? error.name : "UnknownError")));
      }
      return secureResponse(response, request, env);
    } catch (error) {
      console.error("Store request failed", url.pathname, error instanceof Error ? error.name : "UnknownError");
      return secureResponse(Response.json({ error: "The store is temporarily unavailable. Please try again." }, { status: 503 }), request, env);
    }
  },
};

export default worker;
