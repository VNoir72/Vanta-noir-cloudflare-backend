import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from './miniflare.mjs';

test('saved provider corrections and persisted order postcodes reuse checkout verification',async()=>{
 await build({stdin:{contents:`import {validatedShippingAddress} from './lib/shipping-address';import {validatedOrderShippingAddress} from './lib/order-shipping-address';export default {async fetch(r){const {order,customer}=await r.json();try{return Response.json(await (order?validatedOrderShippingAddress(order):validatedShippingAddress(customer)))}catch(e){return Response.json({error:e.message},{status:400})}}}`,resolveDir:process.cwd()},outfile:'work/address-checkout-dispatch-cost.mjs',bundle:true,format:'esm',platform:'neutral',conditions:['workerd','browser'],external:['cloudflare:workers']});
 let calls=0;
 const mf=new Miniflare({modules:true,scriptPath:'work/address-checkout-dispatch-cost.mjs',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{SHIPBUBBLE_API_KEY:'sb_prod_fixture'},outboundService:async r=>{
  assert.ok(r.url.endsWith('/address/validate'));calls++;
  return Response.json({status:'success',data:{address_code:calls,country_code:'NG',postal_code:'100001',city:'Ikeja',state:'Lagos'}});
 }});
 try{
  const db=await mf.getD1Database('DB');await db.batch([db.prepare('CREATE TABLE store_meta(key TEXT PRIMARY KEY,value TEXT)'),db.prepare('CREATE TABLE request_limits(key TEXT PRIMARY KEY,hits INTEGER,expires_at INTEGER)')]);
  const request=async body=>{const r=await mf.dispatchFetch('https://test.invalid/',{method:'POST',body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();};
  const customer={firstName:'Test',lastName:'Buyer',email:'buyer@example.com',phone:'08000000000',addressLine1:'10 Example Street',addressLine2:'Flat 2',city:'',state:'Lagos',countryCode:'NG',postalCode:''};
  const initial=await request({customer});assert.equal(calls,1);
  const corrected={...customer,city:'Ikeja',postalCode:'100001'};assert.equal((await request({customer:corrected})).address_code,initial.address_code);assert.equal(calls,1);
  const order={first_name:'Test',last_name:'Buyer',email:customer.email,phone:customer.phone,address_line_1:customer.addressLine1,address_line_2:'Flat 2\nPostal code: 100001',city:'Ikeja',state:'Lagos',country:'Nigeria'};
  assert.equal((await request({order})).address_code,initial.address_code);assert.equal(calls,1,'dispatch must not pay again for the postcode serialization');
  await request({order:{...order,address_line_1:'11 Example Street'}});assert.equal(calls,2,'a genuinely different destination must not reuse verification');
  await request({order:{...order,email:'other@example.com'}});assert.equal(calls,3,'different recipients must not share a courier address code');
 }finally{await mf.dispose();}
});
