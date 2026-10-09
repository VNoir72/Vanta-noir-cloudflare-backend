import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
await build({entryPoints:["lib/commerce-config.ts"],outfile:"work/checkout-config.mjs",bundle:true,format:"esm",platform:"node"});
const {defaultCommerceSettings,commerceSettingsSchema,checkoutSetupIssues,shippingQuote,publicCommerceSettings,NIGERIA_STATES}=await import("../work/checkout-config.mjs");
test("new stores cannot accidentally offer free delivery or accept sample inventory",()=>{
  const settings=defaultCommerceSettings();
  assert.equal(settings.acceptingOrders,false);assert.equal(settings.supportEmail,"");assert.equal(settings.inventoryConfirmed,false);
  assert.equal(shippingQuote(settings,"Lagos").feeKobo,null);
  assert.ok(checkoutSetupIssues(settings,true).length>=5);
});
test("explicit delivery zones take precedence and do not deliver to an unlisted state",()=>{
  const settings=commerceSettingsSchema.parse({supportEmail:"care@example.com",acceptingOrders:true,inventoryConfirmed:true,dispatchNote:"Confirmed dispatch",returnPolicy:"Confirmed policy",shippingZones:[{state:"Lagos",feeKobo:0,estimate:"Confirmed estimate"}]});
  assert.deepEqual(checkoutSetupIssues(settings,true),[]);
  assert.equal(shippingQuote({...settings,shippingFeeKobo:200000},"Lagos").feeKobo,0);
  assert.equal(shippingQuote({...settings,shippingFeeKobo:200000},"Kano").feeKobo,null);
  assert.equal(shippingQuote(settings,"").feeKobo,null);
  assert.ok(checkoutSetupIssues(settings,false).includes("Connect Paystack"));
});

test("all 36 states and FCT can be saved pending without free checkout",()=>{
 const shippingZones=NIGERIA_STATES.map(state=>({state,feeKobo:null,estimate:""}));
 const settings=commerceSettingsSchema.parse({acceptingOrders:true,shippingZones});
 assert.equal(shippingZones.length,37);assert.equal(new Set(shippingZones.map(z=>z.state)).size,37);
 for(const state of NIGERIA_STATES){assert.equal(shippingQuote({...settings,shippingFeeKobo:999},state).feeKobo,null);assert.equal(shippingQuote(settings,state).supported,false);}
 assert.equal(publicCommerceSettings(settings).acceptingOrders,false);
 assert.deepEqual(publicCommerceSettings(settings).shippingZones,[]);
 assert.ok(checkoutSetupIssues(settings,true).some(x=>x.includes("delivery zone")));
 settings.shippingZones[0]={state:"Abia",feeKobo:350000,estimate:"5–8 business days including processing"};
 assert.equal(shippingQuote(settings,"Abia").feeKobo,350000);
 assert.equal(publicCommerceSettings(settings).shippingZones.length,1);
 assert.equal(publicCommerceSettings(settings).acceptingOrders,true);
 settings.shippingZones[0].estimate="";
 assert.equal(shippingQuote(settings,"Abia").feeKobo,null);
 settings.shippingZones.push({state:"*",feeKobo:500000,estimate:"7 days"});
 assert.equal(shippingQuote(settings,"Abia").feeKobo,null,"explicit pending zone cannot inherit wildcard price");
});

test('live courier checkout does not depend on a legacy free fixed-fee zone',()=>{
 const settings=commerceSettingsSchema.parse({supportEmail:'care@example.com',acceptingOrders:true,inventoryConfirmed:true,dispatchNote:'Next pickup',returnPolicy:'Returns policy',shippingZones:NIGERIA_STATES.map(state=>({state,feeKobo:null,estimate:''}))});
 assert.deepEqual(checkoutSetupIssues(settings,true,null,true),[]);
 assert.equal(publicCommerceSettings(settings,true).acceptingOrders,true);
 assert.equal(publicCommerceSettings(settings,false).acceptingOrders,false);
 assert.ok(checkoutSetupIssues(settings,true,null,false).length>0);
 assert.ok(checkoutSetupIssues(settings,false,null,true).includes('Connect Paystack'));
});
