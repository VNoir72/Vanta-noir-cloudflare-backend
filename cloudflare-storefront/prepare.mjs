import {cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
// Generated assets only. Product images remain served by PUBLIC_API and R2.
const target='outputs/cloudflare-preview';
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
await cp('outputs/namecheap',target,{recursive:true,filter:path=>{const name=path.split('/').at(-1);return !name.startsWith('.')&&name!=='images'&&!name.endsWith('.php');}});
const config=JSON.parse(await readFile('cloudflare-storefront/wrangler.jsonc','utf8'));
config.main=resolve('cloudflare-storefront/worker.mjs');
config.assets.directory=resolve(target);
config.keep_vars=true;
config.vars.RELEASE_SHA=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
await mkdir('outputs/cloudflare-storefront',{recursive:true});
await writeFile('outputs/cloudflare-storefront/wrangler.jsonc',JSON.stringify(config,null,2)+'\n');
console.log('Prepared production storefront assets for source '+config.vars.RELEASE_SHA);
