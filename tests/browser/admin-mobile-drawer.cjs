const assert = require('node:assert/strict');
const { assertGlass } = require('./glass-assertions.cjs');

module.exports = async function checkMobileDrawer(page) {
  await page.evaluate(() => scrollTo(0, 0));
  for (const width of [320, 390, 430, 820]) {
    await page.setViewportSize({ width, height: 844 });
    const trigger = page.getByRole('button', { name: 'Toggle navigation' });
    await trigger.tap();
    const drawer = page.getByRole('dialog', { name: 'Store navigation' });
    await drawer.waitFor();
    await page.waitForFunction(() => Math.abs(document.querySelector('.vn-mobile-drawer').getBoundingClientRect().x) < 0.5);
    assert(await drawer.evaluate(el => el === document.activeElement), 'Focus enters the dialog without outlining the whole logo');
    const logo = drawer.locator('.vn-control-brand img');
    await logo.evaluate(img => img.decode());
    assert((await logo.getAttribute('src')).endsWith('/vanta-spire-light.svg'), 'Approved master logo');
    const brand = await drawer.locator('.vn-control-brand').boundingBox();
    const close = await drawer.getByRole('button', { name: 'Close', exact: true }).boundingBox();
    assert(brand.x + brand.width <= close.x, `${width}px logo does not overlap Close`);
    assert(close.width >= 44 && close.height >= 44, 'Accessible close target');
    const selector = drawer.getByRole('button', { name: 'Vanta Noir Store' });
    assert.equal(await selector.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(245, 247, 247)');
    assert.equal(await selector.locator('span').evaluate(el => getComputedStyle(el).color), 'rgb(23, 26, 28)');
    assert(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${width}px drawer overflow`);
    if (width === 390) {
      await assertGlass(drawer, 'Opened mobile navigation');
      await page.screenshot({ path: 'work/admin-mobile-menu.png', animations: 'disabled' });
      await drawer.locator('.vn-owner-block').scrollIntoViewIfNeeded();
      assert.equal(await drawer.locator('.vn-owner-avatar').evaluate(el => getComputedStyle(el).color), 'rgb(23, 26, 28)');
      await page.screenshot({ path: 'work/admin-mobile-menu-footer.png', animations: 'disabled' });
      await drawer.evaluate(el => { el.scrollTop = 0; });
    }
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'detached' });
    assert(await trigger.evaluate(el => el === document.activeElement), 'Escape restores focus to opener');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'More navigation' }).tap();
  const drawer = page.getByRole('dialog', { name: 'Store navigation' });
  await drawer.waitFor();
  await page.keyboard.press('Tab');
  assert(await drawer.locator('.vn-control-brand').evaluate(el => el === document.activeElement && getComputedStyle(el).outlineStyle === 'solid'), 'Keyboard focus remains visible');
  await drawer.getByRole('button', { name: 'Vanta Noir Store' }).tap();
  await drawer.waitFor({ state: 'detached' });
  assert.equal(await page.locator('.vn-control-header h1').textContent(), 'Settings');
  await page.getByRole('button', { name: 'Toggle navigation' }).tap();
  await drawer.getByRole('button', { name: 'Overview', exact: true }).tap();
  await drawer.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Toggle navigation' }).tap();
  await page.emulateMedia({ contrast: 'more' });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.vn-mobile-drawer')).backdropFilter === 'none');
  assert.equal(await drawer.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
  await drawer.getByRole('button', { name: 'Close', exact: true }).tap();
  await drawer.waitFor({ state: 'detached' });
  await page.emulateMedia({ contrast: 'no-preference' });
  console.log('PASS opened mobile menu: approved logo, readable selector/footer, glass, no overflow, close targets, navigation and keyboard focus');
};
