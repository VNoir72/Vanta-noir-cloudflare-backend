import test from 'node:test';
import assert from 'node:assert/strict';
import {terminalRates,shipbubbleRates,compareRates,shipbubbleSandbox,terminalSandbox,providerJson} from '../lib/shipping-comparison.ts';
const terminal={rate_id:'RT-1',carrier_name:'DHL',carrier_rate_description:'Express',amount:2500.25,currency:'NGN',delivery_time:'2 days'};
const bubble={request_token:'token1',couriers:[{service_code:'dhl',courier_name:'DHL',service_type:'pickup',currency:'₦',total:2000,rate_card_amount:3000,delivery_eta:'3 days'}]};
test('compares customer totals in kobo and retains provider identity and different services',async()=>{
 const r=await compareRates(async()=>terminalRates([terminal]),async()=>shipbubbleRates(bubble));
 assert.equal(r.rates.length,2);assert.deepEqual(r.rates.map(r=>r.amountKobo),[250025,300000]);assert.equal(r.rates[1].walletKobo,200000);assert.equal(r.cheapest.provider,'terminal');assert.equal(r.checkoutEnabled,false);assert.equal(r.bookingEnabled,false);
});
test('rejects malformed prices, foreign currencies, cargo and station services',()=>{
 for(const amount of [null,undefined,NaN,Infinity,-1,0,'2500',10000001])assert.equal(terminalRates([{...terminal,amount}]).length,0);
 for(const extra of [{currency:'USD'},{dropoff_required:true},{type:'cargo'},{rate_id:''}])assert.equal(terminalRates([{...terminal,...extra}]).length,0);
 for(const extra of [{currency:'USD'},{service_type:'dropoff'},{pickup_station:{}},{dropoff_station:{}},{rate_card_amount:'3000'}])assert.equal(shipbubbleRates({...bubble,couriers:[{...bubble.couriers[0],...extra}]}).length,0);
 assert.throws(()=>shipbubbleRates({couriers:[]}));assert.throws(()=>terminalRates({}));
});
test('one provider outage leaves valid rates, while two failures never become free shipping',async()=>{
 const bad=()=>{throw Error('SECRET private provider error');};
 const r=await compareRates(bad,async()=>shipbubbleRates(bubble));assert.equal(r.partial,true);assert.equal(r.rates.length,1);assert.ok(!JSON.stringify(r).includes('SECRET'));
 const all=await compareRates(bad,bad);assert.deepEqual(all.rates,[]);assert.equal(all.cheapest,null);
});
test('both quote sources start independently',async()=>{
 let release;const gate=new Promise(r=>release=r);let started=false;
 const r=await compareRates(async()=>{await gate;return terminalRates([terminal]);},async()=>{started=true;release();return [];});
 assert.equal(started,true);assert.equal(r.rates.length,1);
});
test('non-persisted Terminal quotes can be displayed without pretending to have a bookable ID',()=>{
 const {rate_id,...quote}=terminal;
 assert.equal(terminalRates([quote]).length,0);
 assert.equal(terminalRates([quote],true)[0].id,'quote-only-0');
});
const address={first_name:'Sandbox',last_name:'Tester',email:'test@example.com',phone:'+2348000000000',line1:'Test address',city:'Kaduna',state:'Kaduna',country:'NG',zip:'800242'};
const parcel={weightKg:5,lengthCm:53.34,widthCm:30.48,heightCm:12.7,valueNaira:10000};
test('Shipbubble sandbox validates both addresses, discovers category and requests pickup only',async()=>{
 const calls=[];const send=async(url,options)=>{calls.push({url,options,body:options.body?JSON.parse(options.body):null});assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer sb_sandbox_fixture');assert.ok(options.signal);
  if(url.endsWith('/address/validate'))return Response.json({status:'success',data:{address_code:123}});
  if(url.endsWith('/labels/categories'))return Response.json({status:'success',data:[{category:'Fashion wears',category_id:987}]});
  assert.ok(url.endsWith('/fetch_rates'));return Response.json({status:'success',data:bubble});
 };
 const rates=await shipbubbleSandbox('sb_sandbox_fixture',address,address,parcel,send);assert.equal(rates.length,1);assert.equal(calls.length,4);
 const body=calls.at(-1).body;assert.equal(body.reciever_address_code,123);assert.equal(body.category_id,987);assert.equal(body.package_items[0].unit_weight,5);assert.deepEqual(body.package_dimension,{length:53.34,width:30.48,height:12.7});assert.equal(body.service_type,'pickup');
 await assert.rejects(shipbubbleSandbox('sb_prod_fixture',address,address,parcel,send),/sandbox key/);assert.equal(calls.length,4);
});
test('Terminal only uses sandbox and quotes the same packed weight without booking',async()=>{
 const calls=[];const send=async(url,options)=>{assert.ok(url.startsWith('https://sandbox.terminal.africa/v1/'));calls.push(JSON.parse(options.body));return Response.json({status:true,data:url.endsWith('/packaging')?{packaging_id:'PK-1'}:[terminal]});};
 await terminalSandbox('test-fixture',address,address,parcel,send);
 assert.equal(calls[0].weight+calls[1].parcel.items[0].weight,5);assert.equal(calls[1].persist_data,false);assert.equal(calls.length,2);
});
test('provider errors, redirects and oversized bodies cannot leak secrets',async()=>{
 for(const status of [301,401,403,429,500])await assert.rejects(providerJson('https://example.com','SECRET',{},async()=>new Response('SECRET private contact',{status})),e=>!e.message.includes('SECRET'));
 await assert.rejects(providerJson('https://example.com','SECRET',{},async()=>new Response('x'.repeat(512001))),/size limit/);
 await assert.rejects(providerJson('https://example.com','SECRET',{},async()=>Response.json({status:'failed',message:'SECRET'})),/rejected/);
});
