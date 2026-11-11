import { urlCatalogo, escapeHtml } from '../lib/format.js';
import { icon } from '../lib/icons.js';

const CATEGORIAS_DESTAQUE = [
  { nome: 'Agendamento', imagem: 'agendamento', chamada: 'Sua rotina, em ordem', descricao: 'Mais organização para seus atendimentos.' },
  { nome: 'Religiosas', imagem: 'religiosas', chamada: 'Para cultivar a fé', descricao: 'Fé e inspiração em cada página.' },
  { nome: 'Jardim Encantado', imagem: 'jardim-encantado', chamada: 'Uma coleção que floresce', descricao: 'Delicadeza que floresce no seu dia.' },
];

/**
 * Banners independentes para intercalar entre as prateleiras da home.
 * @param {import('../data/produtos.js').Produto[]} produtos
 * @returns {string[]} Um bloco por categoria disponível.
 */
export function CategoryBanners(produtos = []) {
  const itens = CATEGORIAS_DESTAQUE.filter(c => produtos.some(p => p.categoria === c.nome));
  return itens.map(i => `
  <section class="cr" aria-labelledby="categoria-${i.imagem}">
      <a class="cr-item cr-${i.imagem}" href="${urlCatalogo({ categoria: i.nome })}">
        <picture class="cr-art">
          <source media="(max-width: 700px)" srcset="${import.meta.env.BASE_URL}images/categorias/${i.imagem}.webp" />
          <img class="cr-image" src="${import.meta.env.BASE_URL}images/categorias/${i.imagem}-panoramico.webp" alt="" loading="lazy" width="2172" height="724" />
        </picture>
        <div class="cr-copy">
          <span class="cr-eyebrow">${escapeHtml(i.chamada)}</span>
          <h2 id="categoria-${i.imagem}">${escapeHtml(i.nome)}</h2>
          <p>${escapeHtml(i.descricao)}</p>
          <span class="cr-cta">Explorar coleção ${icon('arrow')}</span>
        </div>
      </a>
  </section>`);
}
