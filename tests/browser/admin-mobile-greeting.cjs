const assert = require('node:assert/strict');
const fs = require('node:fs');

module.exports = async function checkMobileGreeting(browser) {
  // Same instant must greet each viewer in their own timezone.
  for (const [timezoneId, expected] of [['Africa/Lagos', 'Good morning'], ['America/Los_Angeles', 'Good evening']]) {
    const context = await browser.newContext({ timezoneId, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await context.route('**/images/**', route => {
        const path = 'public' + new URL(route.request().url()).pathname;
        return fs.existsSync(path) ? route.fulfill({ path }) : route.abort();
      });
      const page = await context.newPage();
      await page.clock.install({ time: new Date('2026-10-08T06:00:00Z') });
      await page.goto('http://127.0.0.1:5203/tests/browser/portal-audit.html?role=owner&revenue=demo');
      const greeting = page.locator('.vn-header-subtitle');
      await greeting.filter({ hasText: expected }).waitFor();
      if (timezoneId !== 'Africa/Lagos') continue;
      await page.clock.setSystemTime(new Date('2026-10-08T10:59:59Z'));
      await page.clock.runFor(31_000);
      await greeting.filter({ hasText: 'Good afternoon' }).waitFor();
      await page.clock.setSystemTime(new Date('2026-10-08T17:00:00Z'));
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await greeting.filter({ hasText: 'Good evening' }).waitFor();
      await page.clock.setSystemTime(new Date('2026-10-09T06:00:00Z'));
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await greeting.filter({ hasText: 'Good morning' }).waitFor();
      for (const width of [320, 390, 820]) {
        await page.setViewportSize({ width, height: 844 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px overflow`);
        const backdrop = await page.locator('.vn-control-center').evaluate(el => {
          const css = getComputedStyle(el, '::before');
          return { size: css.backgroundSize, position: css.position, image: css.backgroundImage };
        });
        assert.equal(backdrop.size, 'cover');
        assert.equal(backdrop.position, 'fixed');
        assert(backdrop.image.includes('vanta-pearl-leaf-glass.webp'));
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: 'work/admin-mobile-greeting.png' });
      await page.locator('.vn-exact-revenue').scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'work/admin-mobile-revenue-demo.png' });
      await require('./admin-mobile-drawer.cjs')(page);
      await page.emulateMedia({ contrast: 'more' });
      assert.equal(await page.locator('.vn-control-center').evaluate(el => getComputedStyle(el, '::before').display), 'none');
      assert.equal(await page.locator('.vn-workspace-bar').evaluate(el => getComputedStyle(el).backdropFilter), 'none');
    } finally { await context.close(); }
  }
  console.log('PASS mobile glass proportions, responsive bounds, local timezone, noon transition and resumed greeting');
};
