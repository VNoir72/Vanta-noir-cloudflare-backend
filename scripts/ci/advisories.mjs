import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const report=JSON.parse(await readFile('/scratch/advisories.json','utf8'));
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
assert(!report.error && report.metadata && report.vulnerabilities,'Registry advisory report is unavailable');
// No patched braces release exists. Only its development-tool dependency chain
// is accepted: build globs are repository-controlled and CI is network-isolated.
// Do not generalize this to runtime dependencies or new advisories.
for(const [name,entry] of Object.entries(report.vulnerabilities)){
 assert(entry.nodes.length && entry.nodes.every(path=>lock.packages[path]?.dev===true),`${name}: affected runtime dependency`);
 for(const via of entry.via){
  if(typeof via==='string')assert(report.vulnerabilities[via],`${name}: unknown advisory chain`);
  else assert.equal(via.url,'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',`${name}: new advisory requires review`);
 }
}
console.log('Advisory gate passed: no affected runtime dependencies; remaining development-only braces advisory explicitly documented.');
