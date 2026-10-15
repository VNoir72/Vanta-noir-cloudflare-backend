'use client';
import {useEffect,useState} from 'react';
/** Shared owner/staff mobile behavior: hidden when closed, reflows beside content. */
export function useCompactNavigation(){
 const [open,setOpen]=useState(false),[desktop,setDesktop]=useState(false);
 useEffect(()=>{const media=window.matchMedia('(min-width:1024px)');const sync=()=>setDesktop(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
 return {open,setOpen,hidden:!desktop&&!open};
}
