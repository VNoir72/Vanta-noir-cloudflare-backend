'use client';
import {useState} from 'react';
import {Info} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export function DashboardInfo({title,children}:{title:string;children:React.ReactNode}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className="vn-dashboard-info" aria-label={'About '+title} onClick={()=>setOpen(true)}><Info size={16}/></button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="vn-management-dialog"><DialogTitle>{title}</DialogTitle><DialogDescription>{children}</DialogDescription><button className="vn-pill" onClick={()=>setOpen(false)}>Got it</button></DialogContent></Dialog></>;
}
