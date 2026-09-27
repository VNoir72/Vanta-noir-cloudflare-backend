import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['lib/newsletter-popup.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {newsletterDue,newsletterPage,NEWSLETTER_DISMISS_MS}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('newsletter only appears on shopping pages, never checkout or customer support',()=>{
 for(const path of ['/','/products/hoodie'])assert.equal(newsletterPage(path),true);
 for(const path of ['/checkout','/checkout/complete','/admin','/email-preferences','/help-center','/privacy-policy'])assert.equal(newsletterPage(path),false);
});
test('newsletter waits for both browsing and thirty seconds',()=>{
 assert.equal(newsletterDue(29000,0,null,null,true),false);
 assert.equal(newsletterDue(30000,0,null,null,false),false);
 assert.equal(newsletterDue(30000,0,null,null,true),true);
});
test('dismissal lasts seven days and successful signup suppresses further prompts',()=>{
 const dismissed=100000;
 assert.equal(newsletterDue(dismissed+NEWSLETTER_DISMISS_MS-1,0,String(dismissed),null,true),false);
 assert.equal(newsletterDue(dismissed+NEWSLETTER_DISMISS_MS,0,String(dismissed),null,true),true);
 assert.equal(newsletterDue(dismissed+NEWSLETTER_DISMISS_MS,0,null,'1',true),false);
 assert.equal(newsletterDue(30000,0,'broken',null,true),true);
});
