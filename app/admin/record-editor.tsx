'use client';
import {useEffect,useRef,useState,type ReactNode,type Dispatch,type SetStateAction} from 'react';
import {useUnsavedChanges} from './unsaved-changes';

// Each business action owns its own draft. Saving tracking never clears a status draft.
export function RecordEditor<T>({name,initialValue,onSave,children,busy=false,disabled=false,initialEditing=false,saveLabel='Save'}:{name:string;initialValue:T;onSave:(value:T)=>Promise<boolean>;children:(value:T,setValue:Dispatch<SetStateAction<T>>)=>ReactNode;busy?:boolean;disabled?:boolean;initialEditing?:boolean;saveLabel?:string}){
 const [value,setValue]=useState(initialValue),[baseline,setBaseline]=useState(initialValue),[editing,setEditing]=useState(initialEditing),[working,setWorking]=useState(false),[error,setError]=useState('');
 const form=useRef<HTMLFormElement>(null),lock=useRef(false),lastSource=useRef(JSON.stringify(initialValue)),latestSource=useRef(initialValue);latestSource.current=initialValue;
 const dirty=JSON.stringify(value)!==JSON.stringify(baseline),source=JSON.stringify(initialValue);
 useEffect(()=>{if(source!==lastSource.current&&!dirty&&!working&&!busy){lastSource.current=source;setValue(latestSource.current);setBaseline(latestSource.current);}},[source,dirty,working,busy]);
 const cancel=()=>{setValue(baseline);setEditing(false);setError('');};
 async function commit(){
  if(lock.current||busy||disabled)return false;
  if(!dirty){setEditing(false);return true;}
  if(!form.current?.reportValidity()){setError('Check the required fields before saving.');return false;}
  lock.current=true;setWorking(true);setError('');const submitted=value;
  try{if(!await onSave(submitted)){setError('Could not save. Your changes are still here.');return false;}setBaseline(submitted);setEditing(false);return true;}
  catch(e){setError(e instanceof Error?e.message:'Could not save. Your changes are still here.');return false;}
  finally{lock.current=false;setWorking(false);}
 }
 useUnsavedChanges({name,dirty,busy:working||busy&&dirty,save:commit,discard:cancel});
 return <form ref={form} className="vn-record-editor" aria-label={name} onSubmit={e=>{e.preventDefault();void commit();}}>
  <div className="vn-editor-heading"><strong>{name}</strong><button type="button" className="vn-pill" disabled={busy||working||disabled} onClick={()=>editing?void commit():setEditing(true)}>{working||busy?'Saving…':editing?saveLabel:'Edit'}</button>{editing&&<button type="button" className="vn-pill" disabled={busy||working} onClick={cancel}>Cancel</button>}</div>
  <div onDoubleClick={()=>{if(!busy&&!working&&!disabled)setEditing(true);}}><fieldset className="vn-settings-editor" disabled={!editing||busy||working||disabled}>{children(value,setValue)}</fieldset></div>
  {error&&<p role="alert">{error}</p>}{dirty&&<p role="status">Unsaved changes</p>}
 </form>;
}
