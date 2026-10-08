import test from 'node:test';
import assert from 'node:assert/strict';
import {constructionProposal} from '../lib/manufacturing-specs.mjs';
test('saved seam schedule is not contradicted by generic hem allowances',()=>{
 const product={name:'Eclipse Runner Graphic Tee'};
 const stitching='Join with 4-thread overlock, 6 mm seam allowance. Sleeve and body hems: 25 mm turn-up, twin-needle coverstitch.';
 const proposal=constructionProposal(product,{stitching});
 assert.equal(proposal.stitching,stitching);
 assert.match(proposal.seamAllowances,/saved stitching schedule/);
 assert.doesNotMatch(proposal.seamAllowances,/20 mm/);
 assert.equal(constructionProposal(product,{stitching,seamAllowances:'25 mm body and sleeve hem'}).seamAllowances,'25 mm body and sleeve hem');
 assert.match(constructionProposal(product,{}).seamAllowances,/Sampling proposal/);
});
