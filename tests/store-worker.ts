import {GET as catalogOptions} from "../app/api/catalog-options/route";
import {POST as saveOption} from "../app/api/admin/catalog-options/route";
import { env } from "cloudflare:workers";
import * as store from "../lib/store-db";
import { importVdCompletionCatalogue } from "../lib/vd-completion-catalogue";
import { importSeason01Catalogue } from "../lib/season01-catalogue";
import { adminAuthStateFromRequest } from "../lib/admin-auth";
import { GET as catalog } from "../app/api/catalog/route";
import { POST as checkout } from "../app/api/checkout/route";
import { POST as webhook } from "../app/api/payments/webhook/route";
import { GET as verify } from "../app/api/payments/verify/route";
import { checkApiRequest, secureResponse } from "../lib/http-policy";

// Used only inside the isolated Miniflare integration tests; never a deploy entrypoint.
export default {
  async fetch(request: Request) {
    const path = new URL(request.url).pathname;
    const settings = { ALLOWED_ORIGINS: "https://vantanoir.store,https://www.vantanoir.store" };
    try {
      const denied = checkApiRequest(request, settings);
      if (denied) return secureResponse(denied, request, settings);
      let response: Response;
      if (path === "/api/catalog-options") response=await catalogOptions();
      else if(path === "/api/admin/catalog-options") response=await saveOption(request);
      else if (path === "/api/catalog") response = await catalog();
      else if (path === "/api/checkout") response = await checkout(request);
      else if (path === "/api/payments/webhook") response = await webhook(request);
      else if (path === "/api/payments/verify") response = await verify(request);
      else if (path === "/auth") response = Response.json(await adminAuthStateFromRequest(request));
      else {
        const { action, args } = await request.json() as { action: string; args: unknown[] };
        if (action === "importSeason01Catalogue") response = Response.json(await importSeason01Catalogue() ?? null);
        else if (action === "importVdCompletionCatalogue") response = Response.json(await importVdCompletionCatalogue() ?? null);
        else if (action === "sql") response = Response.json(await env.DB.prepare(String(args[0])).bind(...args.slice(1)).all());
        else {
          const fn = (store as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[action];
          response = Response.json(await fn(...args) ?? null);
        }
      }
      return secureResponse(response, request, settings);
    } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 }); }
  },
};
