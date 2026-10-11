// Compatibility backport for query-string 7, which requires a CommonJS function.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const target=require.resolve('decode-uri-component',{paths:[path.dirname(require.resolve('query-string'))]});
const patched=fs.readFileSync(path.join(__dirname,'../vendor/decode-uri-component/index.cjs'));
const current=fs.readFileSync(target);const hash=crypto.createHash('sha256').update(current).digest('hex');
if(current.equals(patched)){console.log('URI decoder security backport already applied.');process.exit(0);}
if(hash!=="3b8ba0a765e1089d11bba9a919d0d8789ecd9a6833ea078d8d9114e1db093863")throw Error('URI decoder changed; review the upstream patch before building.');
fs.writeFileSync(target,patched);console.log('Applied upstream URI decoder 0.5.0 security backport.');
