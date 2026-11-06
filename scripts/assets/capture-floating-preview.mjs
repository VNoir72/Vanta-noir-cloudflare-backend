// Capture public data only. No auth, write endpoints, or production credentials.
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.VANTA_PUBLIC_API||'https://api.vantanoir.store';
await mkdir('work/floating',{recursive:true});
for(const [endpoint,name] of [['catalog','catalog'],['store-settings','settings'],['catalog-options','options']]){
 const response=await fetch(`${base}/api/${endpoint}`,{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error(`${endpoint}: HTTP ${response.status}`);
 const data=await response.json();await writeFile(`work/floating/${name}.json`,JSON.stringify(data));
 console.log(`Saved public ${name} snapshot`);
}
