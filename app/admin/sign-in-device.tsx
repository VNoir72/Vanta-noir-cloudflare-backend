'use client';
import {useEffect} from 'react';
export function AdminSignInDevice(){useEffect(()=>{void fetch('/api/admin/sign-in-device',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)}).catch(()=>{});},[]);return null;}

