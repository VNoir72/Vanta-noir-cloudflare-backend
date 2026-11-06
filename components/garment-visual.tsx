import StoreImage from './store-image';
import bounds from '@/lib/floating-asset-bounds.json';
/** Frame the garment's alpha bounds without changing a single source-image pixel. */
export default function GarmentVisual({src,alt,priority=false,className='',sizes='45vw'}:{src:string;alt:string;priority?:boolean;className?:string;sizes?:string}){
 const hash=src.match(/^\/images\/floating\/([a-f0-9]{24})\.webp$/)?.[1];
 const box=hash?(bounds as Record<string,number[]>)[hash]:undefined;
 if(!box)return <StoreImage src={src} preserveOriginal className={`vn-garment-visual ${className}`} alt={alt} priority={priority} sizes={sizes}/>;
 const [width,height,x,y,w,h]=box;
 return <svg className={`vn-garment-visual ${className}`} viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role={alt?'img':undefined} aria-label={alt||undefined} aria-hidden={alt?undefined:true} focusable="false"><image href={src} x="0" y="0" width={width} height={height}/></svg>;
}
