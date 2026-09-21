'use client';
import {useState,useEffect} from 'react';
import {apiUrl} from './api-client';
import {defaultOptions} from './catalog-options';
export function useCatalogOptions(){const [options,setOptions]=useState(defaultOptions);useEffect(()=>{fetch(apiUrl('/api/catalog-options'),{cache:'no-store'}).then(r=>r.ok?r.json() as Promise<typeof defaultOptions>:null).then(v=>{if(v?.colors&&v?.categories)setOptions(v)}).catch(()=>{});},[]);return {options,setOptions};}
