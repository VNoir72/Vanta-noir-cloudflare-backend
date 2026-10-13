"use client";
import {useState} from 'react';
/** Display only; database keys, exports and order actions retain the full value. */
export function CompactReference({value}:{value:string}){
 const [copied,setCopied]=useState(false),[failed,setFailed]=useState(false);
 const short=value.length>14?value.slice(0,3)+'…'+value.slice(-6):value;
 return <span className="vn-reference"><button type="button" title={value} aria-label={'Copy full reference '+value} onClick={async()=>{try{await navigator.clipboard.writeText(value);setCopied(true);setFailed(false);setTimeout(()=>setCopied(false),1800);}catch{setFailed(true);}}}>{short}</button><span role="status">{copied?' Copied':''}</span>{failed&&<input readOnly aria-label="Full reference — select to copy" value={value} onFocus={e=>e.target.select()}/>}</span>;
}
