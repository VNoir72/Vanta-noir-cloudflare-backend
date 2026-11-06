"use client";
import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import StoreImage from './store-image';
import './floating-catalogue.css';
export type FloatingPiece={id:string;name:string;image:string;cutout?:string;href:string;subtitle?:string;members?:{image:string;cutout?:string;name:string}[]};
export function FloatingCatalogue({pieces,label,renderOptions,onChoose,persistenceKey}:{pieces:FloatingPiece[];label:string;renderOptions?:(id:string)=>ReactNode;onChoose?:(id:string)=>void;persistenceKey?:string}){
 const [selected,setSelected]=useState('');const touch=useRef<{x:number;y:number}|null>(null);const swiped=useRef(false);
 const index=Math.max(0,pieces.findIndex(p=>p.id===selected));const active=pieces[index];
 useEffect(()=>{if(!persistenceKey)return;try{setSelected(sessionStorage.getItem(persistenceKey)||'');}catch{}},[persistenceKey]);
 const choose=(id:string)=>{setSelected(id);if(persistenceKey)try{sessionStorage.setItem(persistenceKey,id)}catch{};};
 const move=(delta:number)=>{if(pieces.length)choose(pieces[(index+delta+pieces.length)%pieces.length].id)};
 if(!active)return null;
 return <div className={`vn-float ${onChoose?"vn-float-groups":""}`} role="region" aria-roledescription="carousel" aria-label={label}>
  <div className="vn-float-main"><div className="vn-float-stage" onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};swiped.current=false}} onTouchEnd={e=>{const t=touch.current;if(t){const dx=e.changedTouches[0].clientX-t.x,dy=e.changedTouches[0].clientY-t.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){swiped.current=true;move(dx<0?1:-1)}}touch.current=null;}}>
   {pieces.map((piece,i)=>{let offset=i-index;if(pieces.length>2){if(offset>pieces.length/2)offset-=pieces.length;if(offset< -pieces.length/2)offset+=pieces.length}if(Math.abs(offset)>1)return null;return <button key={piece.id} type="button" className={`vn-float-piece ${offset===0?'is-current':offset<0?'is-before':'is-after'}`} aria-label={`${offset===0?'View':'Browse'} ${piece.name}`} onClick={()=>{if(swiped.current){swiped.current=false;return}if(offset)choose(piece.id);else if(onChoose)onChoose(piece.id);else window.location.assign(piece.href)}}>
    <span className={`vn-float-art ${piece.members?'is-outfit':''}`}>
     {(piece.members?.slice(0,3)||[piece]).map((part,n)=><StoreImage key={n} src={part.cutout||part.image} preserveOriginal={Boolean(part.cutout)} className={part.cutout?'is-cutout':'is-studio'} alt={part.name} sizes="(max-width: 650px) 70vw, 45vw" priority={offset===0}/>)}
    </span>{onChoose&&offset!==0&&<span className="vn-group-neighbour-name">{piece.name}</span>}
   </button>})}
  </div><div className="vn-float-info" aria-live="polite"><h2>{active.name}</h2><p className="vn-float-subtitle">{active.subtitle}</p>{renderOptions?.(active.id)}{onChoose?<button className="dn-primary" onClick={()=>onChoose(active.id)}>{label==='Collections'?'Explore collection':'Explore look'} <ArrowRight size={16}/></button>:<a className="dn-primary" href={active.href}>View product <ArrowRight size={16}/></a>}</div></div>
  <div className="vn-float-controls"><button type="button" aria-label="Previous piece" disabled={pieces.length<2} onClick={()=>move(-1)}><ArrowLeft size={19}/></button><span aria-live="polite">{String(index+1).padStart(2,'0')} / {String(pieces.length).padStart(2,'0')}</span><button type="button" aria-label="Next piece" disabled={pieces.length<2} onClick={()=>move(1)}><ArrowRight size={19}/></button></div>
  <div className="vn-float-progress" aria-hidden="true">{Array.from({length:Math.min(pieces.length,6)},(_,i)=><i key={i} className={i===index%6?"is-active":""}/>)}</div><details className="vn-float-jump"><summary>Find a piece</summary><label>Jump to a piece <select aria-label="Jump to a piece" value={active.id} onChange={e=>choose(e.target.value)}>{pieces.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></details>
  <div className="vn-float-strip" aria-label="Nearby pieces">{pieces.slice(Math.max(0,Math.min(index-2,pieces.length-6)),Math.max(0,Math.min(index-2,pieces.length-6))+6).map(p=><button type="button" key={p.id} aria-pressed={p.id===active.id} onClick={()=>choose(p.id)}><StoreImage src={p.cutout||p.image} preserveOriginal={Boolean(p.cutout)} alt="" sizes="90px"/><span>{p.name}</span></button>)}</div>
 </div>;
}
