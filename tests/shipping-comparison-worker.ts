import {GET,POST} from '../app/api/admin/shipping-comparison/route';
import {queueComparison,runComparisonJob,comparisonStatus} from '../lib/shipping-comparison-job';
export default {async fetch(r:Request){
 if(new URL(r.url).pathname.startsWith('/api/'))return r.method==='POST'?POST(r):GET(r);
 if(new URL(r.url).pathname==='/run'){await Promise.all([queueComparison(),queueComparison()]);await Promise.all([runComparisonJob(),runComparisonJob()]);}
 return Response.json(await comparisonStatus());
}};
