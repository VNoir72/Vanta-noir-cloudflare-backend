// Content-only deployment entry. legacy.js is the unchanged previous production
// module, retrieved and carried forward by the authorized deployment operation.
import legacy from './legacy.js';
import {shipbubbleFetch} from './shipbubble-overlay.js';
export default {...legacy,async fetch(request,env,ctx){return await shipbubbleFetch(request)??legacy.fetch(request,env,ctx);}};
