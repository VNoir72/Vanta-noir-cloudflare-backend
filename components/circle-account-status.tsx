'use client';
import {useEffect,useState} from 'react';
import {customerRequest} from '@/lib/customer-web';
type Membership={active:boolean;until:number;cancelled:boolean};
export function CircleAccountStatus(){
 const [membership,setMembership]=useState<Membership|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;setError('');setMembership(null);void customerRequest<{membership:Membership}>('circle/status').then(data=>{if(live)setMembership(data.membership);}).catch(()=>{if(live)setError('Membership status could not load.');});return()=>{live=false;};},[attempt]);
 return <section className="vn-account-card" aria-label="Vanta Circle membership"><h3>Vanta Circle</h3>{error?<p role="status">{error}</p>:!membership?<p role="status">Checking membership…</p>:<><strong>{membership.active?'Active member':membership.until?'Membership expired':'Not a member yet'}</strong>{membership.active&&<p>Access {membership.cancelled?'ends':'valid until'} {new Date(membership.until).toLocaleDateString()}.</p>}<p>Your membership belongs to this account and is visible on both the website and app. Join, manage billing and use app-only benefits in the Vanta Noir app.</p></>}<button type="button" className="dn-secondary" onClick={()=>setAttempt(n=>n+1)}>{error?'Retry membership status':'Refresh membership status'}</button></section>;
}
