"use client";
import {useEffect,useState} from 'react';
import {Slider} from 'radix-ui';
import {formatNaira} from '@/lib/catalog-runtime';

// Keep dragging local: filtering hundreds of products and changing the URL on
// every pointer movement can exhaust Safari's history quota and interrupt drag.
export function PriceFilter({value,onCommit}:{value:[number,number];onCommit:(value:[number,number])=>void}) {
  const [draft,setDraft]=useState(value);
  useEffect(()=>setDraft(value),[value[0],value[1]]);
  return <fieldset className="filter-wide"><legend>Price</legend>
    <div className="filter-price-values"><span>{formatNaira(draft[0]*100)}</span><span>{formatNaira(draft[1]*100)}{draft[1]===10000000?'+':''}</span></div>
    <Slider.Root className="filter-price-slider" min={0} max={10000000} step={1000} value={draft}
      onValueChange={v=>setDraft(v as [number,number])} onValueCommit={v=>onCommit(v as [number,number])}>
      <Slider.Track className="filter-price-track"><Slider.Range className="filter-price-fill"/></Slider.Track>
      <Slider.Thumb className="filter-price-thumb" aria-label="Minimum price in naira" aria-valuetext={formatNaira(draft[0]*100)}/>
      <Slider.Thumb className="filter-price-thumb" aria-label="Maximum price in naira" aria-valuetext={formatNaira(draft[1]*100)+(draft[1]===10000000?' and above':'')}/>
    </Slider.Root><small>Drag either handle. ₦10,000,000+ includes all higher prices.</small>
  </fieldset>;
}
