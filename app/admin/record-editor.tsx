'use client';
import {Fragment,Children,cloneElement,createContext,isValidElement,useContext,useId,useEffect,useRef,useState,type ReactNode,type Dispatch,type SetStateAction,type ReactElement} from 'react';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription} from '@/components/ui/alert-dialog';
import {applyFieldChanges,changedFields,type FieldChange} from '@/lib/admin-field-patch';
import {useUnsavedChanges} from './unsaved-changes';

type FieldContext={active:string|null;busy:boolean;disabled:boolean;dirty:boolean;edit:(id:string)=>void;changed:(id:string,confirm:boolean)=>void;save:()=>void;cancel:()=>void};
const Context=createContext<FieldContext|null>(null);
export function useFieldAction(){const context=useContext(Context),id=useId();return (action:()=>void)=>{context?.changed(id,true);action();};}
type Props={children?:ReactNode;type?:string;disabled?:boolean;onChange?:(event:unknown)=>void;onClick?:(event:unknown)=>void;[key:string]:unknown};
function fieldName(node:ReactNode):string {return Children.toArray(node).map(child=>typeof child==='string'||typeof child==='number'?String(child):isValidElement<Props>(child)&&typeof child.type==='string'&&!['input','select','textarea','option'].includes(child.type)?fieldName(child.props.children):'').join(' ').trim();}
/** Decorate native fields only; custom field components use this same context. */
export function EditableFields({children}:{children:ReactNode}){
 const context=useContext(Context),prefix=useId();if(!context)return <>{children}</>;
 function visit(node:ReactNode,path:string):ReactNode{return Children.map(node,(child,i)=>{
  if(!isValidElement<Props>(child))return child;
  const id=path+'.'+(child.key??i),type=child.type;
  if(type==='label'||type==='input'||type==='textarea'||type==='select'){
   const label=type==='label'?fieldName(child.props.children):String(child.props['aria-label']||'Value');
   let immediate=false,hasControl=false;
   function control(element:ReactElement<Props>):ReactElement<Props>{
    if(['input','select','textarea'].includes(String(element.type))){
     hasControl=true;
     if(element.props.readOnly||element.props.type==='search')return element;
     const quick=element.type==='select'||['checkbox','radio','file','color'].includes(element.props.type||'');immediate=immediate||quick;
     return cloneElement(element,{disabled:element.props.disabled||context!.busy||context!.disabled||(!quick&&context!.active!==id)||(context!.active!==null&&context!.active!==id),onChange:(event:unknown)=>{context!.changed(id,quick);element.props.onChange?.(event);}});
    }
    return cloneElement(element,{},Children.map(element.props.children,c=>isValidElement<Props>(c)?control(c):c));
   }
   const rendered=control(child);if(!hasControl)return child;
   return <div className="vn-field-edit" key={id}>{rendered}<span className="vn-field-actions">{context!.active===id?<><button type="button" className="vn-pill" disabled={context!.busy||context!.disabled||!context!.dirty} onClick={context!.save}>Save</button><button type="button" className="vn-pill" disabled={context!.busy} onClick={context!.cancel}>Cancel</button></>:!immediate&&<button type="button" className="vn-pill" aria-label={'Edit '+label} disabled={context!.busy||context!.disabled||context!.active!==null} onClick={()=>context!.edit(id)}>Edit</button>}</span></div>;
  }
  if(typeof type!=='string'&&type!==Fragment)return child;
  // Explicit list actions (reorder/remove) each get their own confirmation.
  if(type==='button'&&child.props.onClick)return cloneElement(child,{disabled:child.props.disabled||context!.busy||context!.disabled||context!.active!==null,onClick:(event:unknown)=>{context!.changed(id,true);child.props.onClick?.(event);}});
  return cloneElement(child,{},visit(child.props.children,id));
 });}
 return <>{visit(children,prefix)}</>;
}
export function RecordEditor<T>({name,initialValue,onSave,children,busy=false,disabled=false,initialEditing=false,saveLabel='Save change'}:{name:string;initialValue:T;onSave:(value:T,changes:FieldChange[])=>Promise<boolean>;children:(value:T,setValue:Dispatch<SetStateAction<T>>)=>ReactNode;busy?:boolean;disabled?:boolean;initialEditing?:boolean;saveLabel?:string}){
 const [value,setValue]=useState(initialValue),[baseline,setBaseline]=useState(initialValue),[active,setActive]=useState<string|null>(initialEditing?'new':null),[working,setWorking]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 const form=useRef<HTMLFormElement>(null),lock=useRef(false),latestSource=useRef(initialValue),lastSource=useRef(JSON.stringify(initialValue));latestSource.current=initialValue;
 const dirty=JSON.stringify(value)!==JSON.stringify(baseline),source=JSON.stringify(initialValue);
 useEffect(()=>{if(lastSource.current!==source&&!dirty&&!working&&!busy){lastSource.current=source;setValue(latestSource.current);setBaseline(latestSource.current);}},[source,dirty,working,busy]);
 const cancel=()=>{setValue(latestSource.current);setBaseline(latestSource.current);setActive(null);setError('');setConfirm(false);};
 async function commit(){
  if(lock.current||busy||disabled)return false;
  if(!dirty){setActive(null);setConfirm(false);return true;}
  if(!form.current?.reportValidity()){setConfirm(false);setError('Check the field before saving.');return false;}
  lock.current=true;setWorking(true);setError('');
  try{const submitted=applyFieldChanges(JSON.stringify(latestSource.current)===lastSource.current?baseline:latestSource.current,changedFields(baseline,value),true);if(!await onSave(submitted,changedFields(baseline,value))){setError('Could not save. Your change is still here.');return false;}setValue(submitted);setBaseline(submitted);setActive(null);setConfirm(false);return true;}
  catch(e){setError(e instanceof Error?e.message:'Could not save. Your change is still here.');return false;}
  finally{lock.current=false;setWorking(false);}
 }
 useUnsavedChanges({name,dirty,busy:working||busy&&dirty,save:commit,discard:cancel});
 const context:FieldContext={active,busy:busy||working,disabled,dirty,edit:id=>{setError('');setActive(id);},changed:(id,quick)=>{setActive(id);setError('');if(quick)setConfirm(true);},save:()=>setConfirm(true),cancel};
 return <Context.Provider value={context}><form ref={form} className="vn-record-editor" aria-label={name} onSubmit={e=>{e.preventDefault();setConfirm(true);}}>{initialEditing?children(value,setValue):<EditableFields>{children(value,setValue)}</EditableFields>}
 {error&&<p role="alert">{error}</p>}
 {dirty&&initialEditing&&<div><button type="submit" className="vn-pill">{saveLabel}</button><button type="button" className="vn-pill" onClick={cancel}>Cancel</button></div>}
 </form>{confirm&&dirty&&!busy&&<AlertDialog open><AlertDialogContent className="vn-unsaved-dialog !z-[200]"><AlertDialogTitle>Save this change?</AlertDialogTitle><AlertDialogDescription>Confirm the selected value for {name.replace(/ VN-.*/,'')}.</AlertDialogDescription>{error&&<p role="alert">{error}</p>}<div className="vn-inventory-actions"><button type="button" className="vn-pill" disabled={working} onClick={cancel}>Cancel</button><button type="button" className="vn-pill" disabled={working} onClick={()=>void commit()}>{working?'Saving…':saveLabel}</button></div></AlertDialogContent></AlertDialog>}</Context.Provider>;
}
