'use client';
import {useEffect,useRef,useState} from 'react';
import StoreImage from './store-image';
// A display-only cutout of edge-connected studio grey. Source photography is never changed.
export function BagGarment({src,alt}:{src:string;alt:string}){
 const canvas=useRef<HTMLCanvasElement>(null),[ready,setReady]=useState(false);
 useEffect(()=>{let active=true;setReady(false);const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(!active||!canvas.current)return;try{const c=canvas.current,cx=c.getContext('2d',{willReadFrequently:true});if(!cx)return;const ratio=Math.min(1,480/image.naturalWidth);c.width=Math.round(image.naturalWidth*ratio);c.height=Math.round(image.naturalHeight*ratio);cx.drawImage(image,0,0,c.width,c.height);const frame=cx.getImageData(0,0,c.width,c.height),d=frame.data,w=c.width,h=c.height,n=w*h,seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
 const bg=(i:number)=>{const j=i*4,r=d[j],g=d[j+1],b=d[j+2];return d[j+3]<8||(Math.min(r,g,b)>205&&Math.max(r,g,b)-Math.min(r,g,b)<12);};
 const add=(i:number)=>{if(i>=0&&i<n&&!seen[i]&&bg(i)){seen[i]=1;queue[tail++]=i;}};
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 while(head<tail){const i=queue[head++];if(i%w)add(i-1);if(i%w<w-1)add(i+1);add(i-w);add(i+w);}
 // Refuse ambiguous extractions rather than damage a light garment.
 if(tail/n<.1||tail/n>.94)return;for(let i=0;i<n;i++)if(seen[i])d[i*4+3]=0;cx.putImageData(frame,0,0);setReady(true);
 }catch{/* Cross-origin or non-studio imagery retains its original display. */}};image.src=src;return()=>{active=false;};},[src]);
 return <span className="vn-bag-cutout"><canvas ref={canvas} role="img" aria-label={alt} hidden={!ready}/>{!ready&&<StoreImage src={src} alt={alt} sizes="160px"/>}</span>;
}
