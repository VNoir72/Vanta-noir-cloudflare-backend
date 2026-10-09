const {JSDOM}=require('jsdom');const assert=require('node:assert/strict');const {buildSync}=require('esbuild');
const root=require('node:path').resolve(__dirname,'../..');
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','HTMLButtonElement','HTMLFormElement','HTMLSelectElement','Element','Node','DocumentFragment','MutationObserver','CustomEvent','Event','KeyboardEvent','MouseEvent','getComputedStyle'])Object.defineProperty(global,key,{value:key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key],configurable:true});
global.IS_REACT_ACT_ENVIRONMENT=false;global.requestAnimationFrame=cb=>setTimeout(cb,0);global.cancelAnimationFrame=clearTimeout;window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});global.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};Element.prototype.scrollIntoView=()=>{};
buildSync({entryPoints:[root+'/tests/browser/admin-editing-fixture.tsx'],outfile:root+'/work/dom-fixture.cjs',bundle:true,format:'cjs',platform:'browser',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"test"'},jsx:'automatic'});
(async()=>{
 // The fixture supplies the same mock fetch to Node and window after mounting.
 require(root+'/work/dom-fixture.cjs');global.fetch=window.fetch;const act=window.__act;global.IS_REACT_ACT_ENVIRONMENT=true;
 const flush=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,25));});};
 const button=name=>Array.from(document.querySelectorAll('button')).find(e=>e.textContent===name);
 const click=async name=>{const e=button(name);assert(e,'Missing '+name);assert(!e.disabled,'Disabled '+name);await act(async()=>e.click());await flush();};
 const input=label=>document.querySelector('input[aria-label="'+label+'"]');
 const fill=async(el,value)=>{assert(el);await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});};
 await flush();assert(!input('Pickup city'));await click('Edit');await fill(input('Pickup city'),'Zaria');assert.equal(window.__writes.length,0);await click('exit');window.__fail=true;await click('Save and exit');assert(document.querySelector('[role=alertdialog]'));assert(document.body.textContent.includes('Some changes could not be saved'));window.__fail=false;await click('Save and exit');assert(document.body.textContent.includes('Exited'));await click('pickup');await click('Edit');assert.equal(input('Pickup city').value,'Zaria');await fill(input('Pickup city'),'Kaduna');await click('Save pickup details');assert(!input('Pickup city'));
 await click('settings');let email=document.querySelector('input[type=email]');assert(email.matches(':disabled'));await click('Edit');await fill(email,'new@example.com');await click('Save');assert(email.matches(':disabled'));assert(button('Edit'));
 await click('prices');let price=input('Price for Test garment');assert(price.readOnly);await click('Edit');await fill(price,'20000');await click('exit');await click('Save and exit');assert(document.body.textContent.includes('Exited'));assert.equal(window.__writes.at(-1).body.data[0].priceKobo,2000000);
 await click('independent');
 const forms=()=>Array.from(document.querySelectorAll('.vn-record-editor'));
 const within=async(index,name)=>{const e=Array.from(forms()[index].querySelectorAll('button')).find(e=>e.textContent===name);assert(e);await act(async()=>e.click());await flush();};
 assert(input('First record').matches(':disabled'));await within(0,'Edit');await within(1,'Edit');await fill(input('First record'),'First saved');await fill(input('Second record'),'Second draft');await within(0,'Save');assert(input('First record').matches(':disabled'));assert.equal(input('First record').value,'First saved');assert.equal(input('Second record').value,'Second draft');assert(!input('Second record').matches(':disabled'));
 await click('exit');window.__fail=true;await click('Save and exit');assert(document.querySelector('[role=alertdialog]'));window.__fail=false;await click('Save and exit');assert(document.body.textContent.includes('Exited'));
 console.log('PASS: actual React components: pickup collapse, no auto-save, failed save retains draft, save-and-exit persists, settings lock after save, prices lock and save-and-exit.');
 await act(async()=>window.__unmount());dom.window.close();process.exit(0);
})().catch(e=>{console.error(e);process.exitCode=1;window.__unmount?.();dom.window.close();process.exit(1);});
