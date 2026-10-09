'use client';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription} from '@/components/ui/alert-dialog';
import {createContext,useContext,useEffect,useId,useRef,useState,useCallback,type ReactNode} from 'react';
type Entry={name:string;dirty:boolean;busy?:boolean;save?:()=>Promise<boolean>;discard:()=>void};
type Guard={notify:()=>void;entries:Map<string,()=>Entry>;navigate:(action:()=>void)=>void};
const Context=createContext<Guard|null>(null);
export function UnsavedChangesProvider({children}:{children:ReactNode}){
 const entries=useRef(new Map<string,()=>Entry>()),[pending,setPending]=useState<(()=>void)|null>(null),[working,setWorking]=useState(false),[error,setError]=useState('');
 const [,setVersion]=useState(0);const notify=useCallback(()=>setVersion(v=>v+1),[]);
 const blockers=()=>Array.from(entries.current.values()).map(get=>get()).filter(e=>e.dirty||e.busy);
 const navigate=(action:()=>void)=>{if(blockers().length){setError('');setPending(()=>action);}else action();};
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(blockers().length){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 const current=blockers();
 return <Context.Provider value={{entries:entries.current,navigate,notify}}>{children}{pending&&<AlertDialog open onOpenChange={open=>{if(!open&&!working)setPending(null);}}><AlertDialogContent className="vn-unsaved-dialog !z-[200]"><AlertDialogTitle>Keep your changes?</AlertDialogTitle><AlertDialogDescription>{current.map(e=>e.name).join(', ') || 'Your changes'}{current.some(e=>e.busy)?' is still saving. Please wait.':' has unsaved changes.'}</AlertDialogDescription>{current.some(e=>!e.save)&&!current.some(e=>e.busy)&&<p>Finish the review on this page before saving this action.</p>}{error&&<p role="alert">{error}</p>}<div className="vn-inventory-actions"><button autoFocus className="vn-pill" disabled={working} onClick={()=>setPending(null)}>Stay here</button><button className="vn-pill" disabled={working||current.some(e=>e.busy)} onClick={()=>{current.forEach(e=>e.discard());const next=pending;setPending(null);next();}}>Exit without saving</button>{current.every(e=>e.save)&&<button className="vn-pill" disabled={working||current.some(e=>e.busy)} onClick={async()=>{setWorking(true);try{for(const entry of current)if(!await entry.save!()){setError('Some changes could not be saved. Stay here to review them.');return;}const next=pending;setPending(null);next();}catch{setError('Could not save. Your changes are still here.');}finally{setWorking(false);}}}>Save and exit</button>}</div></AlertDialogContent></AlertDialog>}</Context.Provider>;
}
export function useUnsavedChanges(entry:Entry){const context=useContext(Context),id=useId(),latest=useRef(entry);latest.current=entry;useEffect(()=>{if(!context)return;context.entries.set(id,()=>latest.current);return()=>{context.entries.delete(id);};},[context?.entries,id]);useEffect(()=>{context?.notify();},[context?.notify,entry.dirty,entry.busy,entry.name,!!entry.save]);}
export function useAdminNavigation(){const context=useContext(Context);return context?.navigate??((action:()=>void)=>action());}
// Each operation form tracks its own baseline; saving one form cannot mark another as saved.
export function useOperationDraft<T>(name:string,value:T,reset:(value:T)=>void,busy:boolean,save?:()=>Promise<boolean>){
 const [baseline,setBaseline]=useState(value);const dirty=JSON.stringify(value)!==JSON.stringify(baseline);
 useUnsavedChanges({name,dirty,busy:dirty&&busy,save,discard:()=>reset(baseline)});
 return {dirty,markSaved:()=>setBaseline(value)};
}

export function useAdminHasChanges(){const context=useContext(Context);return ()=>!!context&&Array.from(context.entries.values()).some(get=>{const e=get();return e.dirty||e.busy;});}
