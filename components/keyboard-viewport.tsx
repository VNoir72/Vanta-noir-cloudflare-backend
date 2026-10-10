"use client";
import {useEffect} from 'react';
/** Keep focused fields and scrollable dialogs inside the actual visible viewport. */
export function KeyboardViewport(){
 useEffect(()=>{
  const root=document.documentElement,viewport=window.visualViewport;
  let timer:ReturnType<typeof setTimeout>;
  const editable=()=>document.activeElement instanceof HTMLElement&&document.activeElement.matches('input:not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable=true]')?document.activeElement:null;
  const update=()=>{
   const height=viewport?.height||window.innerHeight,top=viewport?.offsetTop||0;
   root.style.setProperty('--vn-visual-height',height+'px');root.style.setProperty('--vn-visual-top',top+'px');
   const focused=editable();root.toggleAttribute('data-keyboard-open',Boolean(focused&&window.innerHeight-height>100));
   clearTimeout(timer);timer=setTimeout(()=>{const field=editable();if(!field)return;const rect=field.getBoundingClientRect();if(rect.bottom>top+height-24||rect.top<top+24)field.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});},160);
  };
  viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);document.addEventListener('focusin',update);document.addEventListener('focusout',update);update();
  return()=>{clearTimeout(timer);viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);document.removeEventListener('focusin',update);document.removeEventListener('focusout',update);root.removeAttribute('data-keyboard-open');root.style.removeProperty('--vn-visual-height');root.style.removeProperty('--vn-visual-top');};
 },[]);
 return null;
}
