"use client";
import { useEffect, useRef, useState } from "react";
import StoreImage from "./store-image";
import type { CatalogProduct } from "@/lib/catalog";

export function garmentViews(product: CatalogProduct, color: string, main: string, alt: string) {
  const images = [{ imageUrl: main, imageAlt: alt }, ...(product.images ?? []).filter(image => !image.color || image.color === color)];
  const rank = (image: typeof images[number]) => {
    const view = (image.imageAlt.match(/\b(front|back|left|right|side)\b/i)?.[1] ?? image.imageUrl.match(/-(front|back|left|right|side)(?:-r\d+)?\./i)?.[1] ?? "front").toLowerCase();
    return ["front", "back", "left", "right", "side"].indexOf(view);
  };
  return images.filter((image, i) => image.imageUrl && images.findIndex(other => other.imageUrl === image.imageUrl) === i).sort((a, b) => rank(a) - rank(b));
}

/** Only visible galleries animate. Images slide as a track; the last slide loops through a clone. */
export function SlidingGarmentViews({ images, sizes, priority = false, suspended = false, selection, onViewChange }: { images: {imageUrl:string;imageAlt:string}[]; sizes: string; priority?: boolean; suspended?: boolean; selection?: {index:number;revision:number}; onViewChange?: (index:number)=>void }) {
  const root = useRef<HTMLSpanElement>(null);
  const start = useRef<{x:number;y:number}|null>(null);
  const dragged = useRef(false);
  const [index, setIndex] = useState(0);
  const [instant, setInstant] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const identity = images.map(image => image.imageUrl).join("|");
  const count = images.length;
  useEffect(() => { setIndex(0); setInstant(true); setPaused(false); }, [identity]);
  useEffect(() => { if(selection && selection.index>=0 && selection.index<count){setIndex(selection.index);setInstant(reduced);setPaused(true);} }, [selection]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    change(); media.addEventListener("change", change);
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: .15 });
    if(root.current) observer.observe(root.current);
    return () => { observer.disconnect(); media.removeEventListener("change", change); };
  }, []);
  useEffect(() => {
    if (count < 2 || paused || suspended || !visible || reduced) return;
    let timer:ReturnType<typeof setTimeout>;
    const advance=()=>{timer=setTimeout(()=>{if(!document.hidden){setInstant(false);setIndex(current=>{const step=1+Math.floor(Math.random()*(count-1));return (current+step)%count;});}advance();},4800+Math.random()*6200);};
    advance();return()=>clearTimeout(timer);
  }, [count, paused, suspended, visible, reduced, identity]);
  useEffect(() => {
    const host = root.current?.closest("button,a");
    if(!host || count < 2) return;
    const key = (event: Event) => { const e=event as KeyboardEvent;if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;e.preventDefault();setPaused(true);setInstant(reduced);setIndex(current=>(current+(e.key==="ArrowRight"?1:-1)+count)%count); };
    const blur = () => setPaused(false);
    host.addEventListener("keydown",key);host.addEventListener("blur",blur);
    return () => {host.removeEventListener("keydown",key);host.removeEventListener("blur",blur);};
  },[count,reduced]);
  useEffect(() => { onViewChange?.(index % (count || 1)); }, [index, count, onViewChange]);
  if (!count) return null;
  return <span ref={root} className="vn-sliding-views" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}
    onPointerDown={event=>{start.current={x:event.clientX,y:event.clientY};dragged.current=false;setPaused(true);}}
    onPointerUp={event=>{const point=start.current;start.current=null;setPaused(false);if(!point)return;const dx=event.clientX-point.x,dy=event.clientY-point.y;if(count>1&&Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){dragged.current=true;setInstant(reduced);setIndex(current=>(current+(dx<0?1:-1)+count)%count);}}}
    onPointerCancel={()=>{start.current=null;setPaused(false);}}
    onClickCapture={event=>{if(dragged.current){event.preventDefault();event.stopPropagation();dragged.current=false;}}}>
    <span className="vn-independent-track" style={{position:'absolute',inset:0}}>
      {images.map((image,i)=><span className="vn-independent-frame" style={{opacity:i===index?1:0,transform:i===index?"translate3d(0,0,0)":`translate3d(${i%2?3:-3}%,0,0)`,transition:instant||reduced?"none":undefined}} key={`${image.imageUrl}-${i}`} aria-hidden={i!==index}>{(i===0||visible||i===index)&&<StoreImage src={image.imageUrl} alt={i===index?image.imageAlt:""} sizes={sizes} priority={priority&&i===0} draggable={false}/>}</span>)}
    </span>
  </span>;
}
