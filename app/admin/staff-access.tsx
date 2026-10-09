'use client';
import {useState,useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useOperationDraft} from './unsaved-changes';
type Staff={email:string;role:string;active:number|boolean};
type Save=(action:string,data:unknown)=>Promise<unknown>;
const roles=['sales','catalogue','fulfilment','support','analyst'];
export function StaffAccess({staff,busy,save}:{staff:Staff[];busy:boolean;save:Save}){
 const [addKey,setAddKey]=useState(0);
 return <div className="vn-staff-access"><p>Staff sign in at <a href="https://api.vantanoir.store/admin">api.vantanoir.store/admin</a> using their own email and a one-time code. Only enabled staff can enter. Their changes still need your approval.</p><section aria-label="Add staff"><h3>Add staff</h3><StaffEditor key={addKey} existing={staff.map(s=>s.email)} busy={busy} save={save} done={()=>setAddKey(k=>k+1)}/></section><section aria-label="Saved staff"><h3>Saved staff ({staff.length})</h3>{staff.length?staff.map(row=><SavedStaff key={row.email+'-'+row.role+'-'+row.active} row={row} busy={busy} save={save}/>):<p>No staff added yet.</p>}</section><p>Delete removes access and rejects that person’s pending requests. Previous activity stays in your audit history. Adding staff does not send an invitation; they request their code from the login page.</p></div>;
}
function SavedStaff({row,busy,save}:{row:Staff;busy:boolean;save:Save}){
 const [editing,setEditing]=useState(false);
 return <article className="vn-staff-row" aria-label={'Staff '+row.email}>{editing?<StaffEditor row={row} busy={busy} save={save} done={()=>setEditing(false)}/>:<><div><strong>{row.email}</strong><p>{row.role} · {row.active?'Enabled':'Disabled'}</p></div><div className="vn-staff-actions"><Button type="button" variant="outline" disabled={busy} onClick={()=>setEditing(true)}>Edit</Button><Button type="button" variant="outline" disabled={busy} onClick={async()=>{if(window.confirm('Delete access for '+row.email+'? They will lose access and their pending requests will be rejected.'))await save('staff-delete',{email:row.email});}}>Delete</Button></div></>}</article>;
}
function StaffEditor({row,existing=[],busy,save,done}:{row?:Staff;existing?:string[];busy:boolean;save:Save;done:()=>void}){
 const [value,setValue]=useState({email:row?.email||'',role:row?.role||'fulfilment',active:row?Boolean(row.active):true});
 const form=useRef<HTMLFormElement>(null);
 const draft=useOperationDraft('Staff access '+(row?.email||'new'),value,setValue,busy,commit);
 const duplicate=!row&&existing.some(email=>email.toLowerCase()===value.email.trim().toLowerCase());
 async function commit(){if(busy||duplicate||!form.current?.reportValidity())return false;const result=await save('staff',{...value,email:value.email.trim().toLowerCase()});if(result){draft.markSaved();done();}return !!result;}
 return <form ref={form} className="vn-staff-form" aria-label={row?'Edit staff '+row.email:'Add staff member'} onSubmit={e=>{e.preventDefault();void commit();}}><div className="ops-fields">{row?<div><strong>{row.email}</strong><p>To replace this email, delete its access and add the new address.</p></div>:<Label className="ops-field">Staff email<Input type="email" required maxLength={200} autoComplete="off" value={value.email} onChange={e=>setValue({...value,email:e.target.value})}/></Label>}<Label className="ops-field">Staff role<select aria-label="Staff role" value={value.role} onChange={e=>setValue({...value,role:e.target.value})}>{roles.map(role=><option key={role} value={role}>{role}</option>)}</select></Label><Label className="ops-field">Staff access<select aria-label="Staff access" value={value.active?'enabled':'disabled'} onChange={e=>setValue({...value,active:e.target.value==='enabled'})}><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></Label></div>{duplicate&&<p role="alert">This email is already saved. Use Edit on its saved row.</p>}<div className="vn-staff-actions"><Button type="submit" disabled={busy||!value.email.trim()||duplicate||Boolean(row&&!draft.dirty)}>{row?'Save changes':'Add staff'}</Button>{row&&<Button type="button" variant="outline" disabled={busy} onClick={done}>Cancel</Button>}</div></form>;
}
