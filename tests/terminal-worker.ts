import {env} from 'cloudflare:workers';
import {queueTerminalTest,runTerminalJob,terminalStatus} from '../lib/terminal-jobs';
import {GET,POST} from '../app/api/admin/terminal/route';
export default {async fetch(r:Request){const p=new URL(r.url).pathname;if(p==='/status')return Response.json(await terminalStatus());if(p==='/queue')return Response.json(await queueTerminalTest());if(p==='/run'){await runTerminalJob();return Response.json(await terminalStatus());}return r.method==='POST'?POST(r):GET(r);}};
