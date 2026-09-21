import { spawnSync } from "node:child_process";
import { build } from "vite";
import { readFile, writeFile, cp, mkdir, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";

await build({ configFile: resolve("portable/vite.config.ts") });
await build({ configFile: resolve("portable/vite.config.ts"), build: { ssr: resolve("portable/render.tsx"), outDir: "outputs/static-renderer", manifest: false } });
const { render, SEO_PAGES, SITE_URL, SOCIAL_IMAGE, productSeo, productJsonLd, defaultProducts } = await import(resolve("outputs/static-renderer/render.js"));
const root = resolve("outputs/namecheap");
const manifest = JSON.parse(await readFile(`${root}/.vite/manifest.json`, "utf8"));
const entry = manifest["portable/entry.tsx"];
const escape = s => String(s).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const json = value => JSON.stringify(value).replaceAll("<", "\\u003c");
let snapshot;
try { snapshot = JSON.parse(await readFile("portable/catalog-snapshot.json", "utf8")); } catch { /* Initial development builds use the curated seed. */ }
snapshot ??= defaultProducts;
const pages = [...Object.values(SEO_PAGES), ...snapshot.map(product => ({...productSeo(product),product})),
  { path: "/products/_dynamic", title: "Vanta Noir product", description: "Explore the Vanta Noir collection.", noindex:true },
  { path: "/email-preferences", title: "Email preferences | Vanta Noir", description: "Manage your Vanta Noir email preferences.", noindex: true },
  { path: "/checkout", title: "Checkout | Vanta Noir", description: "Review your bag and delivery options.", noindex: true },
  { path: "/checkout/complete", title: "Payment confirmation | Vanta Noir", description: "Review your payment and order confirmation.", noindex: true },
  { path: "/404.html", title: "Page not found | Vanta Noir", description: "This page is unavailable.", noindex: true },
];
for (const page of pages) {
  const { html, products } = render(page.path, snapshot);
  const canonical = new URL(page.path, SITE_URL).href;
  const output = page.path === "/" ? `${root}/index.html` : page.path === "/404.html" ? `${root}/404.html` : `${root}${page.path}.html`;
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}">${page.noindex ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}">`}<meta property="og:type" content="website"><meta property="og:site_name" content="Vanta Noir"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:image" content="${escape(page.image || SOCIAL_IMAGE.url)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(page.title)}"><meta name="twitter:description" content="${escape(page.description)}"><meta name="twitter:image" content="${escape(page.image || SOCIAL_IMAGE.url)}"><link rel="icon" href="/images/vanta-noir-emblem-480.webp"><link rel="manifest" href="/site.webmanifest">${(entry.css ?? []).map(css => `<link rel="stylesheet" href="/${css}">`).join("")}<script src="/store-config.js"></script></head><body><div id="root">${html}</div><script type="application/json" id="store-data">${json({path:page.path,products:page.path === "/" || page.path.startsWith("/products/") ? products : []})}</script><script type="module" src="/${entry.file}"></script><script type="application/ld+json">${json({"@context":"https://schema.org","@type":"OnlineStore","@id":`${SITE_URL}/#organization`,name:"Vanta Noir",url:SITE_URL,logo:`${SITE_URL}/images/vanta-noir-header-logo.png`,sameAs:["https://www.instagram.com/the_vanta_noir","https://www.tiktok.com/@the_vanta_noir","https://x.com/vanta_noir72"]})}</script>${page.product ? `<script type="application/ld+json">${json(productJsonLd(page.product))}</script>` : ""}</body></html>`);
}
await cp("public", root, { recursive: true, filter: source => !/^(?:__|qa-)/.test(source.split("/").at(-1)) });
const imageManifest = JSON.parse(await readFile("lib/image-assets.json", "utf8"));
for (const path of Object.keys(imageManifest)) {
  if (!["/images/vanta-hero.png", "/images/vanta-noir-header-logo.png"].includes(path)) {
    await rm(`${root}${path}`, { force: true });
  }
}
await writeFile(`${root}/store-config.js`, 'window.VANTA_NOIR_CONFIG = Object.freeze({apiBaseUrl:"https://api.vantanoir.store"});\n');
await writeFile(`${root}/robots.txt`, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /email-preferences\nSitemap: ${SITE_URL}/sitemap.xml\n`);
await writeFile(`${root}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(page=>!page.noindex).map(page => `<url><loc>${SITE_URL}${page.path}</loc></url>`).join("")}</urlset>`);
await cp("portable/namecheap.htaccess", `${root}/.htaccess`);
const reconciliation=JSON.parse(await readFile("data/season01-reconciliation.json","utf8"));
const redirects=reconciliation.filter(row=>row.oldSlug).map(row=>`RewriteRule ^products/${row.oldSlug}/?$ /products/${row.newSlug} [R=301,L]`).join("\n");
const htaccess=await readFile(`${root}/.htaccess`,"utf8");
await writeFile(`${root}/.htaccess`,htaccess.replace("RewriteEngine On","RewriteEngine On\n# Previous preview product URLs\n"+redirects));
await rm(`${root}/.vite`, { recursive: true, force: true });
console.log(`Prepared ${pages.length} rendered pages for Namecheap.`);

const optimized = spawnSync(process.execPath, ["scripts/optimize-images.mjs", "outputs/namecheap"], { stdio: "inherit" });
if (optimized.error) throw optimized.error;
if (optimized.status !== 0) process.exit(optimized.status ?? 1);
