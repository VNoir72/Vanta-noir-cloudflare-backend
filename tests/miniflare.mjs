import { Miniflare as Runtime, convertV4MiniflareOptions } from 'miniflare';

// The pinned runtime is v5; existing tests use the documented v4 option shape.
export class Miniflare extends Runtime {
  constructor(options) {
    const outbound=options.outboundService;
    if(typeof outbound==='function'&&options.bindings?.ADMIN_IDENTITY_TEST!=='true')options={...options,outboundService:async(request,...args)=>new URL(request.url).pathname==='/cdn-cgi/access/get-identity'?new Response('Identity metadata not modelled by this fixture',{status:503}):outbound(request,...args)};
    super(convertV4MiniflareOptions(options));
  }
}
