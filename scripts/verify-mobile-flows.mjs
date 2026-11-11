import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { instalarFixtures, produtosQA } from './mobile-fixtures.mjs';

const base = 'http://127.0.0.1:5174/';
await mkdir('artifacts/mobile', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
await instalarFixtures(page);
const go = path => page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' });
const money = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
try {
  await go('');
  await page.locator('.hv--home').waitFor();
  await page.evaluate(() => document.fonts.ready);
  const shelf = await page.locator('.car-track').first().evaluate(el => ({ width: el.clientWidth, card: el.firstElementChild.getBoundingClientRect().width, columns: getComputedStyle(el).gridAutoColumns, display: getComputedStyle(el).display }));
  console.log(JSON.stringify({ shelf }));
  assert.ok(shelf.card >= 220, 'Os cards da home precisam continuar legíveis no celular: ' + JSON.stringify(shelf));
  const beforeScroll = await page.locator('.car-track').first().evaluate(el => el.scrollLeft);
  await page.locator('.car-track').first().evaluate(el => el.scrollTo({ left: el.clientWidth, behavior: 'instant' }));
  assert.ok(await page.locator('.car-track').first().evaluate(el => el.scrollLeft) > beforeScroll);
  await page.locator('.menu-toggle').click();
  await expect(page.locator('#menu-mobile')).toBeVisible();
  await expect(page.locator('#menu-mobile a[href$="/conta/"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-mobile')).toBeHidden();
  checks.push('home cards and horizontal scroll', 'mobile menu and account access');

  await go('catalogo/');
  await page.locator('#abrir-filtros').click();
  await expect(page.locator('#filtros')).toHaveClass(/is-open/);
  await page.locator('input[name="categoria"][value="Religiosas"]').check({ force: true });
  await expect(page.locator('#titulo-pagina')).toHaveText('Religiosas');
  await page.locator('.fs-close').click();
  await expect(page.locator('#abrir-filtros')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#grade .pc')).toHaveCount(2);
  checks.push('mobile filter drawer and category selection');

  await go(`produto/?slug=${produtosQA[0].slug}`);
  await page.locator('[data-expandir]').click();
  await expect(page.locator('.lb')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.lb')).toHaveCount(0);
  await page.locator('[data-adicionar]').click();
  await page.locator('[data-adicionar]').click();
  await expect(page.locator('.cart-count')).toHaveText('1');
  await go(`produto/?slug=${produtosQA[1].slug}`);
  await page.locator('[data-adicionar]').click();
  await page.locator('[data-cart]').click();
  await expect(page.locator('.ct-item')).toHaveCount(2);
  await expect(page.locator('.ct-total strong')).toHaveText(money(produtosQA[0].preco + produtosQA[1].preco));
  await page.locator('[data-ct-remover="1"]').click();
  await expect(page.locator('.ct-item')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.ct-item')).toHaveCount(1);
  await expect(page.locator('.ct-total strong')).toHaveText(money(produtosQA[1].preco));
  checks.push('product lightbox', 'add to cart without duplicate charges', 'cart totals, removal and persistence');

  const other = await context.newPage();
  await instalarFixtures(other);
  await other.goto(new URL(`produto/?slug=${produtosQA[2].slug}`, base).href, { waitUntil: 'domcontentloaded' });
  await other.locator('[data-adicionar]').click();
  await expect(page.locator('.ct-item')).toHaveCount(2);
  await other.close();
  await page.screenshot({ path: 'artifacts/mobile/cart-flow-390.png', fullPage: true });
  checks.push('cart synchronized across tabs');

  let captured = null, paid = false;
  const selected = [produtosQA[1], produtosQA[2]];
  const code = 'd'.repeat(32), token = 'e'.repeat(48);
  await page.route('**/api/comprar.php', async route => {
    assert.equal(route.request().method(), 'POST');
    captured = route.request().postDataJSON();
    await route.fulfill({ json: { codigo: code, pago: false } });
  });
  await page.route('**/api/pedido.php?**', async route => {
    await route.fulfill({ json: {
      status: paid ? 'pago' : 'aguardando', produto: '2 arquivos digitais Feito de Afeto', valor: selected.reduce((s, p) => s + p.preco, 0),
      download: paid ? `api/baixar.php?t=${token}` : null,
      itens: selected.map((p, i) => ({ id: p.id, titulo: p.titulo, valor: p.preco, download: paid ? `api/baixar.php?t=${token}&i=${i + 1}` : null })),
      pix: paid ? null : { codigo: 'CODIGO-SIMULADO-PARA-CONFERENCIA', imagem: '' },
    } });
  });
  await page.locator('.ct-mobile .button').click();
  await expect(page.locator('.ck-itens li')).toHaveCount(2);
  await expect(page.locator('.ck-total strong')).toHaveText(money(selected.reduce((s, p) => s + p.preco, 0)));
  await page.getByText('Cartão de crédito', { exact: true }).click();
  await expect(page.locator('#area-cartao')).toBeVisible();
  assert.equal(await page.locator('#c-numero').evaluate(e => getComputedStyle(e).fontSize), '16px');
  await page.getByText('Pix', { exact: true }).click();
  await page.locator('#cpf').fill('12345678909');
  await page.locator('#ir').click();
  await expect(page.locator('.ck-pix')).toBeVisible();
  assert.deepEqual(captured.itens, selected.map(p => p.slug));
  assert.equal('preco' in captured || 'total' in captured || 'valor' in captured, false);
  await expect(page.locator('.cart-count')).toHaveText('2');
  paid = true;
  await page.reload();
  await expect(page.locator('.ck-downloads a')).toHaveCount(2);
  await expect(page.locator('.cart-count')).toHaveText('0');
  await expect(page.locator('.cart-count')).toBeHidden();
  await page.screenshot({ path: 'artifacts/mobile/downloads-flow-390.png', fullPage: true });
  checks.push('multi-file checkout and payment method switch', 'pending payment preserves cart', 'simulated confirmation unlocks each PDF and clears purchased items');

  await go('carrinho/');
  await expect(page.locator('.ct-empty')).toBeVisible();
  await expect(page.locator('#ct-mobile')).toBeHidden();
  await page.evaluate(() => localStorage.setItem('afeto-catalog-cart-v2', JSON.stringify([{ id: '1', qtd: 1 }, { id: '999999', qtd: 1 }])));
  await page.reload();
  await expect(page.locator('[data-ct-indisponiveis]')).toBeVisible();
  await expect(page.locator('.ct-finalizar')).toHaveCount(0);
  await page.locator('[data-ct-indisponiveis]').click();
  await expect(page.locator('.ct-finalizar')).toHaveCount(1);
  checks.push('empty cart and unavailable products');

  await go('admin/#/inicio');
  await page.locator('.barra .avatar').click();
  await expect(page.locator('#form-senha')).toBeVisible();
  await go('admin/#/categorias');
  await page.locator('[data-acao="nova-categoria"]').first().click();
  await expect(page.locator('.modal-fundo .modal')).toBeVisible();
  await page.locator('#modal-campo').fill('Categoria de conferência com nome comprido');
  assert.ok(await page.locator('.modal-fundo .modal').evaluate(e => e.getBoundingClientRect().width <= innerWidth));
  await page.keyboard.press('Escape');
  await go('admin/#/produtos/novo');
  await expect(page.locator('.barra-fixa')).toBeVisible();
  await expect(page.locator('.abas')).toBeHidden();
  await expect(page.locator('#titulo')).toBeVisible();
  await go('admin/#/financeiro');
  await page.locator('#s-tudo').click();
  await expect(page.locator('#s-valor')).toHaveValue('1750,35');
  checks.push('admin account access', 'category dialog', 'mobile editor save bar', 'finance layout with read-only test data');
  assert.deepEqual(errors, []);
  await writeFile('artifacts/mobile/flows.json', JSON.stringify({ status: 'passed', checks, errors, paymentMode: 'isolated browser fixtures; no real charge, email, withdrawal or database write' }, null, 2));
  console.log(JSON.stringify({ status: 'passed', checks, errors }, null, 2));
} finally { await browser.close(); }
