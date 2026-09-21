import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
await build({entryPoints:["lib/commerce-config.ts"],outfile:"work/checkout-config.mjs",bundle:true,format:"esm",platform:"node"});
const {defaultCommerceSettings,commerceSettingsSchema,checkoutSetupIssues,shippingQuote}=await import("../work/checkout-config.mjs");
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
