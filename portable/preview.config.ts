import {defineConfig} from 'vite';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
// Read-only production-build preview. Never forwards writes or uses production credentials.
export default defineConfig({
 publicDir:false,
 server:{allowedHosts:['terminal.local']},
 plugins:[{name:'vanta-readonly-preview',configureServer(server){server.middlewares.use((req,res,next)=>{
  const url=new URL(req.url||'/','http://preview.local');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end('Read-only preview');return;}
  if(url.pathname==='/__preview/mobile'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><title>Vanta Noir mobile web preview</title></head><body style="margin:0;background:#ddd;text-align:center;font-family:Arial"><p>Mobile web preview · 390px viewport · <a href="/">Desktop preview</a></p><iframe title="Vanta Noir mobile storefront" src="/" style="width:390px;height:844px;border:0;background:white"></iframe></body></html>');return;}
  const apis:Record<string,string>={'/api/catalog':'catalog.json','/api/store-settings':'settings.json','/api/catalog-options':'options.json'};
  if(apis[url.pathname]){const path=resolve('work/floating',apis[url.pathname]);if(!existsSync(path)){res.statusCode=503;res.end('Preview snapshot missing');return;}res.setHeader('Content-Type','application/json');res.end(readFileSync(path));return;}
  if(url.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(url.pathname==='/api/growth'?{sponsors:[]}:{}));return;}
  if(url.pathname==='/store-config.js'){res.setHeader('Content-Type','application/javascript');res.end('window.VANTA_NOIR_CONFIG={apiBaseUrl:""};');return;}
  const root=resolve('outputs/namecheap');let p=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(p!==root&&!p.startsWith(root+'/')){res.statusCode=400;res.end();return;}
  if(url.pathname==='/')p=resolve(root,'index.html');else if(!extname(p))p+='.html';
  if(!existsSync(p)&&url.pathname.startsWith('/products/'))p=resolve(root,'products/_dynamic.html');
  if(!existsSync(p)){next();return;}
  const types:Record<string,string>={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf'};res.setHeader('Content-Type',types[extname(p)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');
  let body=readFileSync(p);if(extname(p)==='.html'){body=Buffer.from(body.toString().replace('<body>','<body><div style="padding:8px;text-align:center;background:#222;color:white;font:12px Arial">READ-ONLY PREVIEW · Published catalogue snapshot · Checkout disabled</div>'));}res.end(body);
 });}}]
});
