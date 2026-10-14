"use client";
import {compactIdentifier} from '@/lib/compact-identifiers';
import {customerOrderReference} from '@/lib/order-reference';
import {useState} from 'react';
/** Display only; database keys, exports and order actions retain the full value. */
export function CompactReference({value}:{value:string}){
 const [copied,setCopied]=useState(false),[failed,setFailed]=useState(false);
 const copyValue=customerOrderReference(value);
 const short=compactIdentifier(copyValue);
 return <span className="vn-reference"><button type="button" title={value} aria-label={'Copy reference '+copyValue} onClick={async()=>{try{await navigator.clipboard.writeText(copyValue);setCopied(true);setFailed(false);setTimeout(()=>setCopied(false),1800);}catch{setFailed(true);}}}>{short}</button><span role="status">{copied?' Copied':''}</span>{failed&&<input readOnly aria-label="Full reference — select to copy" value={copyValue} onFocus={e=>e.target.select()}/>}</span>;
}
