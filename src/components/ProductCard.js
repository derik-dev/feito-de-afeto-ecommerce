import { icon } from '../lib/icons.js';
import { moeda, escapeHtml, urlProduto, urlSite } from '../lib/format.js';
import { carrinho } from '../lib/storage.js';
import { temDesconto, percentualDesconto, ehMaisVendido } from '../lib/filtros.js';
import { estiloDoTema } from '../data/temas.js';
import { Estrelas } from './Stars.js';
import { textoParcelamento } from './BuyBox.js';

/**
 * Card de produto: uma "pasta" colorida (a cor vem da categoria, veja data/temas.js) com a foto dentro,
 * etiqueta da categoria, selo redondo de desconto e preço grande. Ao passar o mouse, o card levanta e inclina.
 * O botão de favoritar tem `data-favorite="<id>"`; quem usa o card trata o clique (event delegation).
 */
export function ProductCard(p, { favorito = false } = {}) {
  const titulo = escapeHtml(p.titulo);
  const href = urlProduto(p.slug);
  const desconto = temDesconto(p);
  const indisponivel = p.temArquivo === false;
  const noCarrinho = carrinho.listar().some(l => l.id === String(p.id));
  return `
  <article class="pc" style="${estiloDoTema(p.categoria)}">
    ${desconto ? `<span class="pc-selo" aria-label="${percentualDesconto(p)}% de desconto"><b>${percentualDesconto(p)}%</b><i>OFF</i></span>` : ''}
    <div class="pc-media">
      <a href="${href}" tabindex="-1" aria-hidden="true"><img src="${p.imagens[0].src}" alt="${escapeHtml(p.imagens[0].alt)}" width="320" height="400" loading="lazy" /></a>
      <span class="pc-tab">${escapeHtml(p.subcategoria || p.categoria)}</span>
      <button type="button" class="pc-fav${favorito ? ' is-favorite' : ''}" data-favorite="${p.id}" aria-pressed="${favorito}" aria-label="${favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}: ${titulo}">${icon('heart')}</button>
      <a class="pc-quick" href="${href}" tabindex="-1" aria-hidden="true">Ver detalhes</a>
    </div>
    <div class="pc-body">
      <h3 class="pc-title"><a href="${href}">${titulo}</a></h3>
      <div class="pc-rate">${Estrelas(p.nota, p.numAvaliacoes)}${ehMaisVendido(p) ? '<span class="pc-best">Mais vendido</span>' : ''}</div>
      <div class="pc-pricebox">
        ${desconto ? `<p class="pc-old"><s aria-label="Preço anterior ${moeda(p.precoOriginal)}">${moeda(p.precoOriginal)}</s></p>` : '<p class="pc-old" aria-hidden="true">&nbsp;</p>'}
        <p class="pc-price"><strong>${moeda(p.preco)}</strong>${desconto ? `<span class="pc-off-inline">${percentualDesconto(p)}% OFF</span>` : ''}</p>
        <p class="pc-inst">${textoParcelamento(p.preco)}</p>
      </div>
      <p class="pc-delivery">${icon('bolt')}Baixe na hora</p>
      <div class="pc-acoes">${indisponivel
        ? '<button type="button" class="pc-btn pc-btn-add" disabled>Disponível em breve</button>'
        : `<a class="pc-btn pc-btn-comprar" href="${urlSite(`comprar/?produto=${encodeURIComponent(p.slug)}`)}" aria-label="Comprar agora: ${titulo}">Comprar agora</a>
        <button type="button" class="pc-btn pc-btn-add${noCarrinho ? ' is-no-carrinho' : ''}" data-card-add="${p.id}" aria-label="${noCarrinho ? 'Ver no carrinho' : 'Adicionar ao carrinho'}: ${titulo}">${icon(noCarrinho ? 'check' : 'cart')}${noCarrinho ? 'Ver no carrinho' : 'Adicionar ao carrinho'}</button>`}</div>
    </div>
  </article>`;
}
