import {appAccessContext} from '../lib/app-attestation';
export default {async fetch(request:Request){return Response.json(await appAccessContext(request));}};
