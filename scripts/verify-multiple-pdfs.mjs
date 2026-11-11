import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import PhpParser from 'php-parser';
import { instalarFixtures, produtosQA } from './mobile-fixtures.mjs';

// Sintaxe PHP e fluxo de navegador com API isolada: não altera banco nem gera cobranças.
const parser = new PhpParser({ parser: { phpVersion: '8.0' } });
async function validarPhp(dir) {
  let count = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) count += await validarPhp(path);
    else if (path.endsWith('.php')) { parser.parseCode(await readFile(path, 'utf8'), path); count++; }
  }
  return count;
}
const phpFiles = await validarPhp('api');
const base = process.argv[2] || 'http://127.0.0.1:5175/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
const pdf = name => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nPDF de teste\n%%EOF') });
let products = structuredClone(produtosQA).map(p => ({ ...p, imagens: p.imagens.map(i => ({ ...i, src: i.src.replace(/^\//, '') })) }));
products[0].pdfs = [{ id: 1, nome: 'Capa.pdf', bytes: 100 }, { id: 2, nome: 'Miolo.pdf', bytes: 200 }];
products[0].pdf = products[0].pdfs[0];
let uploadNumber = 0, saved, hold = false, releaseUpload;
await instalarFixtures(page);
await page.route('**/api/admin/produtos.php', route => route.fulfill({ json: { produtos: products } }));
await page.route('**/api/admin/upload-pdf.php', async route => {
  const filename = /filename="([^"]+)"/.exec(route.request().postDataBuffer().toString())?.[1];
  if (hold) await new Promise(resolve => { releaseUpload = resolve; });
  if (filename === 'Falha.pdf') return route.fulfill({ status: 500, json: { erro: 'Falha de teste no envio' } });
  await route.fulfill({ json: { ok: true, arquivo: (++uploadNumber).toString(16).padStart(32, '0') + '.pdf', nome: filename, bytes: 100 } });
});
await page.route('**/api/admin/salvar.php', async route => {
  saved = route.request().postDataJSON();
  const product = products.find(p => p.id === saved.id);
  if (product && saved.pdfs) {
    product.pdfs = saved.pdfs.map((p, i) => p.id ? product.pdfs.find(a => a.id === p.id) : { id: 100 + i, nome: p.nome, bytes: 100 });
    product.pdf = product.pdfs[0] ?? null;
  }
  await route.fulfill({ json: { ok: true, id: saved.id || '999', slug: 'teste' } });
});
const go = path => page.goto(new URL(path, base).href);
const files = () => page.locator('#pdf-area .pdf-card:not(.pdf-card--env)');
const save = () => page.locator('[data-salvar]:visible').first().click();
try {
  await go('admin/#/produtos/editar/1');
  await expect(files()).toHaveCount(2);
  assert.equal(await page.locator('#arquivo-pdf').getAttribute('multiple'), '');
  await page.locator('#arquivo-pdf').setInputFiles([pdf('Guia.pdf'), pdf('Extras.pdf')]);
  await expect(files()).toHaveCount(4);
  await expect(page.locator('#dz-pdf')).toBeVisible();
  await page.locator('#arquivo-pdf').setInputFiles(pdf('Bonus.pdf'));
  await expect(files()).toHaveCount(5);
  await page.getByRole('button', { name: 'Remover Capa.pdf', exact: true }).click();
  await expect(files()).toHaveCount(4);
  await save();
  await expect(page.locator('#lista-produtos')).toBeVisible();
  assert.deepEqual(saved.pdfs, [{ id: 2 }, ...[1, 2, 3].map((id, i) => ({ arquivo: id.toString(16).padStart(32, '0') + '.pdf', nome: ['Guia.pdf', 'Extras.pdf', 'Bonus.pdf'][i] }))]);
  checks.push('select multiple PDFs, append without replacing, remove one, retain existing IDs in save');

  await go('admin/#/produtos/editar/1');
  await expect(files()).toHaveCount(4);
  await expect(files().first()).toContainText('Miolo.pdf');
  await page.locator('#titulo').fill('Produto atualizado');
  await save();
  await expect(page.locator('#lista-produtos')).toBeVisible();
  assert.equal('pdfs' in saved, false);
  checks.push('reopen saved PDFs and preserve them when editing other fields');

  await go('admin/#/produtos/editar/1');
  await page.locator('#arquivo-pdf').setInputFiles([pdf('Antes.pdf'), pdf('Falha.pdf'), pdf('Depois.pdf')]);
  await expect(files()).toHaveCount(6);
  await expect(page.locator('#dz-pdf')).toBeVisible();
  await expect(files().last()).toContainText('Depois.pdf');
  checks.push('failed upload preserves existing PDFs and continues the batch');

  hold = true;
  await page.locator('#arquivo-pdf').setInputFiles(pdf('Aguardando.pdf'));
  await expect(page.locator('.pdf-card--env')).toBeVisible();
  await save();
  await expect(page.locator('[data-erro="pdf"]')).toContainText('Espere');
  await expect(page.locator('#f')).toBeVisible();
  hold = false; releaseUpload();
  await expect(files()).toHaveCount(7);
  await expect(page.locator('.pdf-card--env')).toHaveCount(0);
  checks.push('save is blocked until all uploads finish');

  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mkdir('artifacts/multiple-pdfs', { recursive: true });
  await page.locator('#pdf-area').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/multiple-pdfs/admin-mobile.png', fullPage: true });
  checks.push('multiple-file list fits mobile viewport');

  // Recarrega para descartar alterações locais e conferir duplicação/novo.
  await page.reload();
  await go('admin/#/produtos/duplicar/1');
  await expect(files()).toHaveCount(0);
  await save();
  await expect(page.locator('[data-erro="pdf"]')).toBeVisible();
  checks.push('duplicated products require their own PDFs');

  await page.locator('#arquivo-pdf').setInputFiles([pdf('Novo-1.pdf'), pdf('Novo-2.pdf')]);
  await expect(files()).toHaveCount(2);
  await save();
  await expect(page.locator('#lista-produtos')).toBeVisible();
  assert.equal(saved.id, undefined);
  assert.equal(saved.pdfs.length, 2);
  checks.push('create a product with two PDFs');

  await go('admin/#/produtos/duplicar/1');
  await page.locator('#ativo').uncheck();
  await save();
  await expect(page.locator('#lista-produtos')).toBeVisible();
  assert.equal(saved.ativo, false);
  assert.equal('pdfs' in saved, false);
  checks.push('draft products can be saved without PDFs');

  await go('admin/#/produtos/editar/1');
  const beforeBatch = uploadNumber;
  await page.locator('#arquivo-pdf').setInputFiles(Array.from({ length: 27 }, (_, i) => pdf(`Lote-${i}.pdf`)));
  await expect(files()).toHaveCount(30);
  await expect(page.locator('.pdf-card--env')).toHaveCount(0);
  assert.equal(uploadNumber - beforeBatch, 26);
  await expect(page.locator('#dz-pdf')).toBeHidden();
  checks.push('file limit applies to the full batch');

  const code = 'a'.repeat(32), token = 'b'.repeat(48);
  await page.route('**/api/pedido.php?**', route => route.fulfill({ json: {
    status: 'pago', produto: products[0].titulo, valor: products[0].preco,
    download: `api/baixar.php?t=${token}`,
    itens: [1, 2].map(id => ({ id: '1', titulo: `${products[0].titulo} · ${id === 1 ? 'Capa.pdf' : 'Miolo.pdf'}`, valor: products[0].preco, download: `api/baixar.php?t=${token}&a=${id}` })),
  } }));
  await go(`pedido/?c=${code}`);
  await expect(page.locator('.ck-downloads a')).toHaveCount(2);
  await expect(page.locator('.ck-downloads a').first()).toHaveAttribute('href', `/api/baixar.php?t=${token}&a=1`);
  await expect(page.locator('.ck-downloads a').last()).toHaveAttribute('href', `/api/baixar.php?t=${token}&a=2`);
  await page.screenshot({ path: 'artifacts/multiple-pdfs/pedido-mobile.png', fullPage: true });
  checks.push('one purchased product exposes a separate download for each PDF');

  const result = { status: 'passed', checks, phpFiles, errors, backend: 'API mocked in browser; PHP syntax parsed; no live PHP/MySQL integration' };
  assert.deepEqual(errors, []);
  await writeFile('artifacts/multiple-pdfs/verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
