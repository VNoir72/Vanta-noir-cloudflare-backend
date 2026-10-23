import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

const built=await build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import {OrderAftercare} from './components/order-aftercare';import {deliveryStep} from './mobile/src/delivery-progress';window.deliveryStep=deliveryStep;window.renderOrder=(order)=>createRoot(document.getElementById('root')).render(<OrderAftercare order={order} contact='buyer@example.com'/>);",loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'}});
const order={reference:'VN-INLINE',totalKobo:10000,status:'processing',paymentStatus:'paid',createdAt:'2026-10-01',carrier:'',trackingNumber:'',trackingUrl:'https://courier.invalid/track',deliveryEstimate:'',items:[]};
const until=async(check)=>{for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.ok(check(),'Expected tracking update to render');};

test('courier stages respect payment and fulfilment holds',()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://vantanoir.store/help-center#track-order',runScripts:'outside-only',pretendToBeVisual:true});
 try{dom.window.eval(built.outputFiles[0].text);const step=dom.window.deliveryStep;for(const [status,expected] of [['pending',1],['confirmed',1],['picked_up',2],['in_transit',2],['completed',3]])assert.equal(step({...order,deliveryProgress:{status}}),expected);assert.equal(step({...order,paymentStatus:'pending',deliveryProgress:{status:'completed'}}),null);assert.equal(step({...order,status:'paid_stock_review',deliveryProgress:{status:'completed'}}),null);assert.equal(step({...order,status:'cancelled',deliveryProgress:{status:'completed'}}),null);}finally{dom.window.close();}
});

test('delivery refresh remains in the existing page and preserves the last progress on failure',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://vantanoir.store/help-center#track-order',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;let fail=false,ready=false;const interval=w.setInterval.bind(w);w.setInterval=(...args)=>{ready=true;return interval(...args);};
 try{w.AbortSignal=AbortSignal;w.fetch=async()=>{if(fail)throw Error('offline');return {ok:true,json:async()=>({order:{...order,deliveryProgress:{status:'completed',carrier:'Test courier',observedAt:new Date().toISOString(),events:[{message:'<img src=x onerror=alert(1)> Delivered',location:'Lagos',at:null}],timeline:[]}}})};};w.eval(built.outputFiles[0].text);w.renderOrder(order);await until(()=>ready&&w.document.querySelector('[aria-label="Order progress"]')); w.dispatchEvent(new w.Event('focus'));await until(()=>w.document.body.textContent.includes('Your parcel has been delivered.'));assert.equal(w.location.href,'https://vantanoir.store/help-center#track-order');assert.equal(w.document.querySelector('a[href="https://courier.invalid/track"]'),null);assert.equal(w.document.querySelector('img'),null);assert.ok(w.document.body.textContent.includes('<img src=x onerror=alert(1)> Delivered'));fail=true;w.dispatchEvent(new w.Event('focus'));await until(()=>w.document.body.textContent.includes('Showing the last available progress.'));assert.ok(w.document.body.textContent.includes('Your parcel has been delivered.'));}finally{dom.window.close();}
});
