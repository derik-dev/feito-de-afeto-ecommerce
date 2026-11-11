import { escapeHtml, urlSite } from '../lib/format.js';

/**
 * Espaço de banner do topo de cada catálogo. Os dados vêm de src/data/banners.js.
 * Com `imagem` preenchida mostra a sua arte; sem ela, mostra um banner de papelaria com título e texto.
 * @param {{imagem?:string, imagemMobile?:string, alt?:string, titulo:string, texto?:string, link?:string}} b
 */
export function Banner(b) {
  const caminho = nome => urlSite(`banners/${encodeURIComponent(nome)}`);
  const conteudo = b.imagem
    ? `<picture>${b.imagemMobile ? `<source media="(max-width: 700px)" srcset="${caminho(b.imagemMobile)}" />` : ''}<img src="${caminho(b.imagem)}" alt="${escapeHtml(b.alt || b.titulo)}" width="1320" height="320" /></picture>`
    : `<div class="bn-fallback"><span class="bn-tape" aria-hidden="true"></span><p class="bn-eyebrow">${escapeHtml(b.titulo)}</p>${b.texto ? `<p class="bn-title">${escapeHtml(b.texto)}</p>` : ''}</div>`;
  return `<section class="bn" aria-label="Destaque">${b.link ? `<a href="${escapeHtml(b.link)}">${conteudo}</a>` : conteudo}</section>`;
}
