// Chrome real, dados de conferência isolados e nenhuma alteração no backend.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { instalarFixtures, produtosQA } from './mobile-fixtures.mjs';

const base = process.argv.slice(2).find(a => !a.startsWith('--')) || 'http://127.0.0.1:5174/';
const widths = process.argv.includes('--full') ? [320, 390, 768, 1024, 1440] : [320, 390];
const casos = [
  ['home', '', '.hv'],
  ['catalogo', 'catalogo/', '#grade .pc'],
  ['religiosas', 'catalogo/?categoria=Religiosas', '#category-hero .hv'],
  ['produto', `produto/?slug=${produtosQA[0].slug}`, '.bb'],
  ['entrar', 'entrar/', '#painel-entrar'],
  ['cadastro', 'entrar/?modo=cadastro', '#painel-cadastro'],
  ['favoritos', 'conta/#favoritos', '#ac-grade .pc'],
  ['compras', 'conta/#compras', '.ac-item'],
  ['dados', 'conta/#dados', '#f-nome'],
  ['checkout', `comprar/?produto=${produtosQA[0].slug}`, '.ck'],
  ['carrinho-vazio', 'carrinho/', '.ct-empty'],
  ['carrinho-cheio', 'carrinho/', '.ct-item'],
  ['checkout-carrinho', 'comprar/?carrinho=1', '.ck-itens'],
  ['downloads', `pedido/?c=${'b'.repeat(32)}`, '.ck-downloads'],
  ['pix', `pedido/?c=${'a'.repeat(32)}`, '.ck-pix'],
  ['admin-inicio', 'admin/#/inicio', '.stats'],
  ['admin-produtos', 'admin/#/produtos', '.grade-prod'],
  ['admin-novo', 'admin/#/produtos/novo', '#f'],
  ['admin-editar', 'admin/#/produtos/editar/1', '#f'],
  ['admin-categorias', 'admin/#/categorias', '#lista-cats'],
  ['admin-conta', 'admin/#/conta', '#form-senha'],
  ['admin-financeiro', 'admin/#/financeiro', '#f-saque'],
  ['admin-login', 'admin/', '#form-login'],
];
await mkdir('artifacts/mobile', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: width < 768, reducedMotion: 'reduce' });
    for (const [name, path, ready] of casos) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await instalarFixtures(page, { adminLogado: name !== 'admin-login' });
      if (['carrinho-cheio', 'checkout-carrinho'].includes(name)) {
        await page.addInitScript(() => localStorage.setItem('afeto-catalog-cart-v2', JSON.stringify([{ id: '1', qtd: 1 }, { id: '2', qtd: 1 }])));
      } else if (name === 'carrinho-vazio') {
        await page.addInitScript(() => localStorage.removeItem('afeto-catalog-cart-v2'));
      }
      try {
        await page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' });
        await page.locator(ready).first().waitFor({ state: 'attached', timeout: 15000 });
        await page.evaluate(() => document.fonts.ready);
        const state = await page.evaluate(targetWidth => {
          const visible = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width && r.height; };
          const clips = e => { for (let p = e.parentElement; p; p = p.parentElement) if (['hidden', 'auto', 'scroll', 'clip'].includes(getComputedStyle(p).overflowX)) return true; return false; };
          return {
            layoutViewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            overflowing: [...document.querySelectorAll('body *')].filter(e => visible(e) && !clips(e) && e.getBoundingClientRect().right > targetWidth + 1).slice(0, 14).map(e => ({ tag: e.tagName, class: typeof e.className === 'string' ? e.className : '', text: e.textContent.trim().slice(0, 65), right: Math.round(e.getBoundingClientRect().right) })),
            smallFields: [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select,textarea')].filter(visible).filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => ({ id: e.id, font: getComputedStyle(e).fontSize })),
            smallActions: [...document.querySelectorAll('button,a')].filter(visible).filter(e => { const r = e.getBoundingClientRect(); return r.width < 32 || r.height < 32; }).length,
          };
        }, width);
        await page.screenshot({ path: `artifacts/mobile/${name}-${width}.png`, fullPage: true });
        if (['home', 'produto', 'admin-inicio', 'admin-produtos', 'carrinho-cheio', 'checkout-carrinho'].includes(name)) await page.screenshot({ path: `artifacts/mobile/${name}-${width}-viewport.png` });
        results.push({ name, width, ...state, errors });
        console.log(JSON.stringify({ name, width, scrollWidth: state.scrollWidth, fieldsBelow16px: state.smallFields.length, errors }));
      } catch (e) { results.push({ name, width, error: e.message, errors }); console.log(JSON.stringify({ name, width, error: e.message })); }
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile('artifacts/mobile/audit.json', JSON.stringify({ fixtureMode: 'isolated read-only API responses; no live authentication or payments', results }, null, 2));
console.log(JSON.stringify({ pages: results.length, overflow: results.filter(r => r.scrollWidth > r.width).map(r => ({ name: r.name, width: r.width, scrollWidth: r.scrollWidth, elements: r.overflowing })), failures: results.filter(r => r.error || r.errors?.length), smallFields: results.filter(r => r.smallFields?.length).map(r => ({ name: r.name, width: r.width, fields: r.smallFields })) }, null, 2));
if (results.some(r => r.error || r.errors?.length || r.scrollWidth > r.width || (r.width <= 900 && r.smallFields?.length))) process.exitCode = 1;
