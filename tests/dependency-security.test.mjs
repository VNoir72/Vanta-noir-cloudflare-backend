import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../mobile/package.json',import.meta.url));
test('patched mobile decoder keeps CommonJS parsing and handles malformed links promptly',()=>{
 execFileSync(process.execPath,['mobile/scripts/patch-decoder.cjs']);
 const q=require('query-string');assert.equal(q.parse('size=XL&colour=Dark%20Burgundy').colour,'Dark Burgundy');assert.equal(q.parse('name=%E2%9C%93').name,'✓');
 const start=performance.now();assert.ok(q.parse('x='+('%C0%AF'.repeat(20000))).x);assert.ok(performance.now()-start<2000);
});
test('patched UUID remains compatible with native project generation',()=>{const project=require('xcode').project('fixture');project.hash={project:{objects:{}}};assert.match(project.generateUuid(),/^[A-F0-9]{24}$/);});
