import { escapeHtml, notaBR, dataBR } from '../lib/format.js';
import { Estrelas } from './Stars.js';

/** Resumo da nota + lista de avaliações. */
export function Reviews(produto, avaliacoes) {
  return `
  <section class="rv" aria-labelledby="rv-titulo">
    <h2 id="rv-titulo">Avaliações dos <em>clientes</em></h2>
    <div class="rv-layout">
      <div class="rv-summary">
        <p class="rv-score">${notaBR(produto.nota)}</p>
        ${Estrelas(produto.nota)}
        <p class="rv-total">${produto.numAvaliacoes} avaliações</p>
      </div>
      <ul class="rv-list">
        ${avaliacoes.map(a => `
        <li class="rv-item">
          ${Estrelas(a.nota)}
          <h3>${escapeHtml(a.titulo)}</h3>
          <p>${escapeHtml(a.texto)}</p>
          <small>${escapeHtml(a.autor)} · ${dataBR(a.data)} · Compra verificada</small>
        </li>`).join('')}
      </ul>
    </div>
  </section>`;
}
