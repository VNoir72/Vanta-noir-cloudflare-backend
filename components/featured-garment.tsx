'use client';
import {garmentBounds} from '@/mobile/src/garment-bounds';
import {apiUrl} from '@/lib/api-client';
import {useEffect,useRef,useState} from 'react';
import {removeGarmentBackdrop} from '@/mobile/src/garment-cutout';
export function FeaturedGarment({src,alt}:{src:string;alt:string}){
 const ref=useRef<HTMLCanvasElement>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;setFailed(false);const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(!active||!ref.current)return;try{const c=ref.current,ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return;const scale=Math.min(1,1000/image.naturalWidth);c.width=Math.round(image.naturalWidth*scale);c.height=Math.round(image.naturalHeight*scale);ctx.drawImage(image,0,0,c.width,c.height);const frame=ctx.getImageData(0,0,c.width,c.height);if(!removeGarmentBackdrop(frame.data,c.width,c.height)){ctx.clearRect(0,0,c.width,c.height);setFailed(true);return;}const bounds=garmentBounds(frame.data,c.width,c.height);if(!bounds){setFailed(true);return;}const crop=new ImageData(bounds.width,bounds.height);for(let y=0;y<bounds.height;y++)crop.data.set(frame.data.subarray(((y+bounds.y)*c.width+bounds.x)*4,((y+bounds.y)*c.width+bounds.x+bounds.width)*4),y*bounds.width*4);c.width=bounds.width;c.height=bounds.height;ctx.putImageData(crop,0,0);}catch{setFailed(true);}};image.onerror=()=>{if(active)setFailed(true);};image.src=src.startsWith('/images/')?src:apiUrl('/api/featured-image?src='+encodeURIComponent(src));return()=>{active=false;};},[src]);
 return failed?<span role="img" aria-label={alt}>Product preview unavailable</span>:<canvas ref={ref} role="img" aria-label={alt} style={{width:'100%',height:'100%',objectFit:'contain'}}/>;
}
