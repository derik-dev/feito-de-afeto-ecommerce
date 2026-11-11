import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const baseUrl = process.argv[2] || 'http://127.0.0.1:5173/';
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const results = [];
try {
  for (const width of [1440, 900, 375, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `artifacts/home-${width}.png`, fullPage: true });
    const state = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      heroHeight: Math.round(document.querySelector('.hero').getBoundingClientRect().height),
      pageHeight: document.documentElement.scrollHeight,
      brokenImages: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src),
    }));
    assert.ok(state.scrollWidth <= width, `Horizontal overflow at ${width}: ${state.scrollWidth}`);
    assert.equal(state.brokenImages.length, 0, 'Broken images');
    results.push(state);
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(baseUrl);
  await page.locator('[data-category="Planners"]').click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.product-card').count(), 1);
  assert.match(await page.locator('.product-name').textContent(), /Financeiro/);
  await page.locator('.filter-status [data-reset]').click();
  assert.equal(await page.locator('.product-card').count(), 4);
  await page.locator('[data-favorite="1"]').click();
  assert.equal(await page.locator('[data-favorite="1"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-add="1"]').click();
  assert.equal(await page.locator('.cart-count').textContent(), '1');
  await page.locator('[data-cart]').click();
  await page.locator('[data-qty="1"][data-change="1"]').click();
  assert.match(await page.locator('.cart-total strong').textContent(), /79,80/);
  await page.keyboard.press('Escape');
  await page.reload();
  assert.equal(await page.locator('.cart-count').textContent(), '2');
  assert.equal(await page.locator('[data-favorite="1"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-modal="search"]').first().click();
  await page.locator('#product-search').fill('estudos');
  await page.locator('.search-form button').click();
  assert.equal(await page.locator('.product-card').count(), 1);
  assert.match(await page.locator('.product-name').textContent(), /Estudos/);
  await page.locator('.filter-status [data-reset]').click();
  await page.locator('[data-product="3"]').first().click();
  assert.match(await page.locator('#modal-title').textContent(), /Estudos/);
  await page.keyboard.press('Escape');
  await page.locator('[data-cart]').click();
  await page.locator('[data-remove="1"]').click();
  assert.equal(await page.locator('.empty-cart').count(), 1);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(baseUrl);
  await page.locator('.menu-toggle').click();
  assert.equal(await page.locator('.mobile-nav').isVisible(), true);
  await page.locator('.mobile-nav [data-modal="search"]').click();
  assert.equal(await page.locator('.search-form').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.locator('.category-dots [data-category-page="1"]').click();
  await page.waitForTimeout(500);
  assert.ok(await page.locator('.category-track').evaluate(el => el.scrollLeft) > 0);
  assert.equal(errors.length, 0, 'Browser JavaScript errors');
  console.log(JSON.stringify({ status: 'passed', checks: ['responsive layouts', 'images', 'category filter', 'favorites', 'cart quantities', 'persistence', 'search', 'product details', 'mobile menu', 'category carousel'], viewports: results, errors }, null, 2));
  await writeFile('artifacts/verification.json', JSON.stringify({status:'passed',viewports:results,errors}, null, 2));
} finally {
  await browser.close();
}
