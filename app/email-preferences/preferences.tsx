"use client";
import { useEffect, useState } from "react";
import { StoreShell } from "@/components/store-shell";
import { apiUrl } from "@/lib/api-client";
export function EmailPreferences(){
 const [token,setToken]=useState(""),[action,setAction]=useState("unsubscribe"),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[done,setDone]=useState(false);
 useEffect(()=>{const url=new URL(location.href);setToken(url.searchParams.get("token")||"");setAction(url.searchParams.get("action")==="confirm"?"confirm":"unsubscribe");},[]);
 async function submit(){setBusy(true);try{const r=await fetch(apiUrl("/api/subscriptions"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,action})});const p=await r.json() as {error?:string};if(!r.ok)throw new Error(p.error||"Please try again.");setDone(true);setMessage(action==="confirm"?"Your email is confirmed. Your request is active.":"You have been unsubscribed from this email list.");}catch(e){setMessage(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}}
 return <StoreShell><section className="dn-panel dn-prose" style={{maxWidth:700}}><a className="vn-text-link" href="/">Vanta Noir</a><h1 className="text-4xl mt-10 mb-6">{action==="confirm"?"Confirm your email":"Email preferences"}</h1><p className="leading-7">{action==="confirm"?"Confirm that you requested Vanta Noir emails. You can unsubscribe using the link in a future email.":"Stop the emails associated with this link. Order and delivery updates are separate from collection news."}</p>{token&&!done?<button className="vn-pill mt-8" disabled={busy} onClick={submit}>{busy?"Saving…":action==="confirm"?"Confirm email":"Unsubscribe"}</button>:!token&&<p className="mt-6">Open the preference link from your Vanta Noir email.</p>}{message&&<p className="mt-6" role={done?"status":"alert"}>{message}</p>}</section></StoreShell>;
}
