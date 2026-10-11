'use client';
import {useId} from 'react';
import {ribbonSvg} from '@/mobile/src/components/ribbon-art';
export function RibbonBackground({theme=0,moving=true}:{theme?:number;moving?:boolean}){
 const id=useId().replace(/[^a-zA-Z0-9]/g,'');
 return <div className="vn-ribbon-background" aria-hidden="true" dangerouslySetInnerHTML={{__html:ribbonSvg(theme,moving,id)}}/>;
}
