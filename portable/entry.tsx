import { hydrateRoot } from "react-dom/client";
import { App,routePage } from "./app";
import {isPreviousCollection} from "@/lib/browse-history";
import "@/app/globals.css";
import "@/app/discovery.css";
import "@/app/commerce.css";
import "@/app/checkout-experience.css";

const data = JSON.parse(document.getElementById("store-data")!.textContent!);
async function hydratePage(){
  const path=data.path==='/products/_dynamic'?window.location.pathname:data.path;
  const page=await routePage(path,data.products);
  const root=hydrateRoot(document.getElementById("root")!, <App>{page}</App>);
  let navigation=0;
  const supported=(path:string)=>path==='/'||/^\/products\/[a-z0-9_-]+\/?$/.test(path);
  const render=async()=>{
    const revision=++navigation;
    const next=await routePage(window.location.pathname,[]);
    if(revision===navigation)root.render(<App><div key={revision}>{next}</div></App>);
  };
  document.addEventListener('click',event=>{
    const anchor=(event.target as Element)?.closest<HTMLAnchorElement>('a[href]');
    if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||anchor.target||anchor.hasAttribute('download'))return;
    const url=new URL(anchor.href,location.href);
    if(url.origin!==location.origin||!supported(url.pathname)||url.pathname===location.pathname)return;
    event.preventDefault();
    if(anchor.dataset.collectionBack==='true'&&isPreviousCollection(history.state,url)){history.back();return;}
    const state={vnPreviousCollection:location.pathname==='/'?location.pathname+location.search+location.hash:null};
    history.pushState(state,'',url);window.scrollTo(0,0);void render();
  });
  window.addEventListener('popstate',()=>{if(supported(location.pathname))void render();else location.reload();});
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
