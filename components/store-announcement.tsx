'use client';
import {useEffect,useState} from 'react';
import type {CommerceSettings} from '@/lib/commerce-config';
export function StoreAnnouncement({value}:{value:CommerceSettings['announcement']}){const [now,setNow]=useState(0);useEffect(()=>{setNow(Date.now());const t=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(t);},[]);if(!now||!value.enabled||!value.text||(value.startsAt&&Date.parse(value.startsAt)>now)||(value.endsAt&&Date.parse(value.endsAt)<=now))return null;return <aside className="vn-announcement-strip" aria-label="Store announcement" data-direction={value.mode}><div className="vn-announcement-track"><span>{value.text}</span></div></aside>;}
