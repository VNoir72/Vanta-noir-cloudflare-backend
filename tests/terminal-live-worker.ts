import {queueLiveCheck,runLiveCheck,liveStatus} from '../lib/terminal-live';
import {GET,POST} from '../app/api/admin/terminal-live/route';
export default {async fetch(r:Request){if(new URL(r.url).pathname.startsWith('/api/'))return r.method==='POST'?POST(r):GET(r);await queueLiveCheck();await Promise.all([runLiveCheck(),runLiveCheck()]);return Response.json(await liveStatus());}};
