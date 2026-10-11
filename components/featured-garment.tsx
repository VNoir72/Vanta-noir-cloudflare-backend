'use client';
import {apiUrl} from '@/lib/api-client';
import {useEffect,useRef,useState} from 'react';
import {removeGarmentBackdrop} from '@/mobile/src/garment-cutout';
export function FeaturedGarment({src,alt}:{src:string;alt:string}){
 const ref=useRef<HTMLCanvasElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;setFailed(false);const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(!active||!ref.current)return;try{const c=ref.current,ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return;const scale=Math.min(1,1000/image.naturalWidth);c.width=Math.round(image.naturalWidth*scale);c.height=Math.round(image.naturalHeight*scale);ctx.drawImage(image,0,0,c.width,c.height);const frame=ctx.getImageData(0,0,c.width,c.height);if(!removeGarmentBackdrop(frame.data,c.width,c.height)){ctx.clearRect(0,0,c.width,c.height);setFailed(true);return;}ctx.putImageData(frame,0,0);}catch{setFailed(true);}};image.onerror=()=>{if(active)setFailed(true);};image.src=apiUrl('/api/featured-image?src='+encodeURIComponent(src));return()=>{active=false;};},[src]);
 return failed?<span role="img" aria-label={alt}>Product preview unavailable</span>:<canvas ref={ref} role="img" aria-label={alt} style={{width:'100%',height:'100%',objectFit:'contain'}}/>;
}
