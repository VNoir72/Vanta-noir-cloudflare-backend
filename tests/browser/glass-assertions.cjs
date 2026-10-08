const assert=require('node:assert/strict');
async function assertGlass(locator,label){
 await locator.first().waitFor();
 const c=await locator.first().evaluate(e=>{const s=getComputedStyle(e);return {filter:s.backdropFilter||s.webkitBackdropFilter,image:s.backgroundImage,background:s.backgroundColor,shadow:s.boxShadow,token:s.getPropertyValue("--vn-glass-filter"),supported:CSS.supports("backdrop-filter","blur(1px)"),contrast:matchMedia("(prefers-contrast:more)").matches,reducedTransparency:matchMedia("(prefers-reduced-transparency:reduce)").matches};});
 console.log(label,JSON.stringify(c));
 if(!c.filter.includes('blur(')) console.log('Glass cascade',await locator.first().evaluate(e=>{const matched=[];function walk(rules){for(const r of rules){if(r.selectorText&&e.matches(r.selectorText)&&r.style?.cssText.includes('backdrop'))matched.push(r.cssText);if(r.cssRules)walk(r.cssRules);}}for(const sheet of document.styleSheets){try{walk(sheet.cssRules)}catch{}}return {inline:e.getAttribute('style'),rules:matched};}));
 assert.match(c.filter,/blur\(/,label+' has real backdrop blur');
 assert.match(c.image,/gradient/,label+' has translucent material');
 assert.match(c.image,/rgba\(/,label+' material has alpha');
 assert.notEqual(c.shadow,'none',label+' has depth');
}
async function assertLime(locator,label){
 assert.equal(await locator.first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(198, 242, 118)',label+' approved lime');
 assert.equal(await locator.first().evaluate(e=>getComputedStyle(e).color),'rgb(23, 26, 28)',label+' charcoal text');
}
module.exports={assertGlass,assertLime};
