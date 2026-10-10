import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['lib/shipping-options.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {deliveryChoices,transitEstimate}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const rate=(id,amountKobo,delivery)=>({id,amountKobo,delivery});
test('Express defaults to clearly fastest ETA; Standard keeps exact lowest price',()=>{const choices=deliveryChoices([rate('cheap',600000,'3 days'),rate('fast',900000,'2 days'),rate('slow',1200000,'5 days')]);assert.deepEqual(choices.map(c=>[c.label,c.rate.id,c.rate.amountKobo]),[['Express','fast',900000],['Standard','cheap',600000]]);});
test('fastest and cheapest same, overlapping ETA, unknown ETA: do not manufacture Express',()=>{for(const rates of [[rate('a',1,'1 day'),rate('b',2,'3 days')],[rate('a',1,'2-3 days'),rate('b',2,'1-2 days')],[rate('a',1,'Contact courier'),rate('b',2,'1 day')]])assert.deepEqual(deliveryChoices(rates).map(c=>c.label),['Standard']);assert.deepEqual(deliveryChoices([]),[]);});
test('explicit hours and working-day ranges parse; mixed calendar/working estimates are not guessed',()=>{assert.deepEqual(transitEstimate('Within 20 hrs'),{min:20,max:20,basis:'calendar'});assert.deepEqual(transitEstimate('Within 2 - 3 working days'),{min:48,max:72,basis:'working'});assert.equal(transitEstimate('Tomorrow'),null);assert.equal(deliveryChoices([rate('a',1,'3 working days'),rate('b',2,'2 days')]).length,1);});
