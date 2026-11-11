import { notaBR } from '../lib/format.js';

/**
 * Estrelas com preenchimento proporcional (4,6 enche 92%). A variável CSS --pct controla o
 * quanto fica rosa; o desenho das estrelas e o degradê estão em catalogo.css (.stars).
 */
export function Estrelas(nota, numAvaliacoes) {
  // Produto recém-cadastrado, sem nenhuma avaliação: mostra "Novo" em vez de estrelas
  if (numAvaliacoes === 0) return '<span class="stars-new">Novo</span>';
  const contagem = numAvaliacoes == null ? '' : `<span class="stars-count" aria-hidden="true">(${numAvaliacoes})</span>`;
  return `<span class="stars-wrap"><span class="stars" style="--pct:${(nota / 5) * 100}%" role="img" aria-label="Nota ${notaBR(nota)} de 5${numAvaliacoes == null ? '' : `, ${numAvaliacoes} avaliações`}"></span>${contagem}</span>`;
}
