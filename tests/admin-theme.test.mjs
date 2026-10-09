import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import postcss from 'postcss';
const compiled=await build({entryPoints:['lib/admin-theme.ts'],bundle:true,write:false,format:'esm',platform:'browser'});
const {adminThemeScript}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function fixture({mode,dark=false,hour=12,storageFails=false}={}) {
 const dom=new JSDOM('<!doctype html><html><body><select data-admin-theme-control><option value="system">Device</option><option value="schedule">Time</option><option value="light">Light</option><option value="dark">Dark</option></select></body></html>',{url:'https://api.vantanoir.store/admin',runScripts:'outside-only'});
 const w=dom.window; let listener;
 const media={matches:dark,addEventListener:(_,fn)=>listener=fn,removeEventListener:()=>listener=null};w.matchMedia=()=>media;
 let localHour=hour;w.Date=class extends Date{getHours(){return localHour;}};
 if(mode)w.localStorage.setItem('vn-admin-appearance-v1',mode);
 if(storageFails)Object.defineProperty(w,'localStorage',{get(){throw Error('Unavailable');}});
 w.eval(adminThemeScript);
 return {w,root:w.document.documentElement,close:()=>{w.__vnAdminThemeStop();w.close();},device(value){media.matches=value;listener?.();},hour(value){localHour=value;w.dispatchEvent(new w.Event('focus'));},choose(value){const s=w.document.querySelector('select');s.value=value;s.dispatchEvent(new w.Event('change',{bubbles:true}));}};
}
test('new device preference applies before paint and tracks OS changes',()=>{const f=fixture({dark:true});assert.equal(f.root.dataset.vnAdminTheme,'dark');f.device(false);assert.equal(f.root.dataset.vnAdminTheme,'light');f.close();});
test('manual selection persists and ignores device/time changes',()=>{const f=fixture({dark:true});f.choose('light');f.device(true);f.hour(23);assert.equal(f.root.dataset.vnAdminTheme,'light');assert.equal(f.w.localStorage.getItem('vn-admin-appearance-v1'),'light');f.close();const reload=fixture({mode:'light',dark:true});assert.equal(reload.root.dataset.vnAdminTheme,'light');reload.close();});
test('scheduled local-time boundaries and focus after sleep',()=>{const f=fixture({mode:'schedule',hour:6});assert.equal(f.root.dataset.vnAdminTheme,'dark');f.hour(7);assert.equal(f.root.dataset.vnAdminTheme,'light');f.device(true);assert.equal(f.root.dataset.vnAdminTheme,'light');f.hour(19);assert.equal(f.root.dataset.vnAdminTheme,'dark');f.hour(0);assert.equal(f.root.dataset.vnAdminTheme,'dark');f.close();});
test('shipping pages and tabs adopt the saved preference and storage changes',()=>{const f=fixture({mode:'dark'});assert.equal(f.w.document.querySelector('select').value,'dark');f.w.localStorage.setItem('vn-admin-appearance-v1','light');f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:'vn-admin-appearance-v1'}));assert.equal(f.root.dataset.vnAdminTheme,'light');f.close();});
test('invalid or inaccessible storage falls back safely; cleanup removes admin styling',()=>{for(const settings of [{mode:'old-black'},{storageFails:true}]){const f=fixture(settings);assert.equal(f.root.dataset.vnAdminMode,'system');f.choose('dark');assert.equal(f.root.dataset.vnAdminTheme,'dark');f.w.__vnAdminThemeStop();assert.equal(f.root.dataset.vnAdminTheme,undefined);f.w.close();}});
test('all admin styles resolve colours through one palette, with no broken variable names',async()=>{
 for(const file of (await readdir('app/admin')).filter(f=>f.endsWith('.css'))){const css=await readFile('app/admin/'+file,'utf8');assert.doesNotMatch(css,/--[\w-]*var\(/,file);const ast=postcss.parse(css);if(file!=='theme.css')ast.walkDecls(d=>assert.doesNotMatch(d.value,/#[\da-f]{3,8}\b|rgba?\(/i,file+':'+d.prop));}
 for(const file of ['bulk-dispatch-admin','shipbubble-admin','shipping-weights-admin']){const s=await readFile('lib/'+file+'.ts','utf8');assert.match(s,/\$\{adminThemeHead\}/);assert.match(s,/\$\{adminThemeToolbar\}/);}
});
