import { escapeHtml } from '../lib/format.js';

/** @param {{label:string, href?:string}[]} itens o último item (sem href) é a página atual */
export function Breadcrumb(itens) {
  return `<nav class="bc" aria-label="Você está em"><ol>${itens.map((it, i) => {
    const ultimo = i === itens.length - 1;
    const texto = escapeHtml(it.label);
    return `<li>${it.href && !ultimo ? `<a href="${it.href}">${texto}</a>` : `<span aria-current="page">${texto}</span>`}</li>`;
  }).join('')}</ol></nav>`;
}
