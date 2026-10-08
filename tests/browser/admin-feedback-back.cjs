const assert = require('node:assert/strict');
const fs = require('node:fs');
module.exports = async function checkFeedbackBack(browser) {
  const page = await browser.newPage({hasTouch:true, colorScheme:'dark'});
  try {
    await page.route('**/images/**', route => {
      const path='public'+new URL(route.request().url()).pathname;
      return fs.existsSync(path)?route.fulfill({path}):route.abort();
    });
    for (const [width,height] of [[390,844],[820,600],[1440,1000]]) {
      await page.setViewportSize({width,height});
      await page.goto('http://127.0.0.1:5184/tests/browser/admin-navigation.html?feedback=1');
      await page.getByRole('heading',{name:'Store overview',exact:true}).waitFor();
      await page.evaluate(()=>{window.__navigationMarker='same-document'});
      const navigation=page.getByRole('navigation',{name:width<1024?'Quick navigation':'Store administration'});
      await navigation.getByRole('button',{name:'Orders',exact:true}).click();
      await navigation.getByRole('button',{name:'Products',exact:true}).click();
      await page.getByRole('button',{name:'Back',exact:true}).click();
      assert.equal(await page.locator('h1').textContent(),'Orders');
      for (const type of ['success','error','warning']) {
        await page.evaluate(type=>window.__qaFeedback(type),type);
        const toast=page.locator(`[data-sonner-toast][data-type=${type}]`);
        await toast.waitFor();
        await page.waitForFunction(type=>document.querySelector(`[data-sonner-toast][data-type=${type}]`)?.getAttribute('data-mounted')==='true',type);
        assert.equal(await page.locator('.vn-admin-toaster').getAttribute('data-sonner-theme'),'light');
        assert.equal(await toast.evaluate(el=>getComputedStyle(el).color),'rgb(23, 26, 28)');
        assert((await toast.evaluate(el=>getComputedStyle(el).backgroundImage)).includes('255, 255, 255'));
        await toast.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{}))));
        const box=await toast.boundingBox(), bar=await page.locator('.vn-workspace-bar').boundingBox();
        assert(box.x>=0 && box.x+box.width<=width+1,'Toast fits viewport');
        assert(box.y>=bar.y+bar.height,'Toast does not cover top toolbar');
        if(width===390&&type==='success')await page.screenshot({path:'work/admin-light-feedback-back.png',animations:'disabled'});
        await toast.getByRole('button',{name:'Close toast'}).click();
        await toast.waitFor({state:'detached'});
      }
      await page.getByRole('button',{name:'Back',exact:true}).click();
      assert.equal(await page.locator('h1').textContent(),'Store overview');
      assert.equal(await page.evaluate(()=>window.__navigationMarker),'same-document','Back must not reload');
      if(width<1024)await page.getByRole('button',{name:'More navigation'}).click();
      const sectionNav=width<1024?page.getByRole('dialog',{name:'Store navigation'}):page.getByRole('navigation',{name:'Store administration'});
      await sectionNav.getByRole('button',{name:'Inventory',exact:true}).click();
      await page.getByRole('textbox',{name:'Test garment Black L total on hand'}).fill('9');
      await page.getByRole('button',{name:'Back',exact:true}).click();
      await page.getByRole('button',{name:'Stay here',exact:true}).click();
      assert.equal(await page.locator('h1').textContent(),'Inventory');
      assert.equal(await page.getByRole('textbox',{name:'Test garment Black L total on hand'}).inputValue(),'9');
      await page.getByRole('button',{name:'Back',exact:true}).click();
      await page.getByRole('button',{name:'Discard and continue',exact:true}).click();
      assert.equal(await page.locator('h1').textContent(),'Store overview');
    }
    console.log('PASS light/dark-device admin feedback, success/error/warning contrast, Back history without reload and unsaved changes protection');
  } finally { await page.close(); }
};
