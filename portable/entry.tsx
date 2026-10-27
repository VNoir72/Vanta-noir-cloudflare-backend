import { hydrateRoot } from "react-dom/client";
import { App,routePage } from "./app";
import "@/app/globals.css";
import "@/app/discovery.css";
import "@/app/commerce.css";
import "@/app/checkout-experience.css";

const data = JSON.parse(document.getElementById("store-data")!.textContent!);
async function hydratePage(){
  const path=data.path==='/products/_dynamic'?window.location.pathname:data.path;
  const page=await routePage(path,data.products);
  hydrateRoot(document.getElementById("root")!, <App>{page}</App>);
}
void hydratePage().catch(()=>{
  const notice=document.createElement('p');notice.setAttribute('role','alert');
  notice.textContent='This page could not finish loading. Please refresh to try again.';
  const root=document.getElementById('root');if(root)root.insertBefore(notice,root.firstChild);
});

import "@/app/approved-storefront.css";
import "@/app/liquid-glass.css";

import "@/app/campaign-2026.css";
import "@/app/brand-materials.css";
import "@/app/brand-palette.css";


import "@/app/keyboard-viewport.css";
