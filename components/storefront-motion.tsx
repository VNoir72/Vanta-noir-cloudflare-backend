"use client";
import { useEffect } from "react";

/** Progressive enhancement: never intercept navigation or hide content without JS. */
export function StorefrontMotion() {
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const seen = new WeakSet<Element>();
    const pending = new Set<HTMLElement>();
    const cleanups = new Set<() => void>();
    let disposed = false;
    const reveal = (node: HTMLElement) => {
      if (disposed || !node.isConnected) return;
      pending.delete(node); node.removeAttribute('data-motion-pending');
      if (!media.matches) node.dataset.motionReady = 'true';
    };
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const node = entry.target as HTMLElement; observer.unobserve(node);
      const image = node.querySelector('img');
      if (!image) { reveal(node); return; }
      let finished = false;
      const done = () => { if(finished)return;finished=true;clearTimeout(timer);image.removeEventListener('load', loaded);image.removeEventListener('error', done);cleanups.delete(cancel);reveal(node); };
      const loaded = () => { if(image.decode) void image.decode().catch(()=>{}).then(done);else done(); };
      const cancel = () => {finished=true;clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',done);};
      const timer = setTimeout(done, 8000); // A failed network must never trap content.
      cleanups.add(cancel);
      if (image.complete) loaded(); else { image.addEventListener('load',loaded);image.addEventListener('error',done); }
    }), {threshold:0.06, rootMargin:'0px 0px 50px 0px'});
    const scan = () => {
      document.querySelectorAll<HTMLElement>('.dn-card, .dn-hero, .dn-editorial, .dn-detail-grid, .dn-panel:not(.vn-loading-shell)').forEach((node,index) => {
        if(seen.has(node))return;seen.add(node);
        if(media.matches)return;
        node.style.setProperty('--motion-delay', node.matches('.dn-card') ? `${Array.from(node.parentElement?.children ?? []).indexOf(node)%4*65}ms` : '0ms');
        node.dataset.motionPending='true';pending.add(node);observer.observe(node);
      });
    };
    const changes = new MutationObserver(scan); changes.observe(document.body,{childList:true,subtree:true});scan();
    const reduce = () => { if(media.matches){observer.disconnect();pending.forEach(reveal);document.querySelectorAll('[data-motion-ready]').forEach(n=>n.removeAttribute('data-motion-ready'));} };
    media.addEventListener('change',reduce);
    const focus = (event:FocusEvent) => {const node=(event.target as Element)?.closest<HTMLElement>('[data-motion-pending]');if(node){observer.unobserve(node);reveal(node);}};
    document.addEventListener('focusin',focus);
    return () => {disposed=true;observer.disconnect();changes.disconnect();cleanups.forEach(fn=>fn());pending.forEach(node=>node.removeAttribute('data-motion-pending'));media.removeEventListener('change',reduce);document.removeEventListener('focusin',focus);};
  }, []);
  return null;
}

export function CollectionPlaceholder({product=false}:{product?:boolean}) {
  return <section className={`vn-loading-shell ${product?'vn-loading-product dn-panel dn-wrap':'dn-product-grid'}`} role="status" aria-label={product?'Loading product':'Loading collection'} aria-busy="true"><span className="sr-only">Preparing your collection…</span>{Array.from({length:product?2:4},(_,i)=><div className="vn-loading-tile" key={i} aria-hidden="true"><div/><span/><span/></div>)}</section>;
}
