import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';

/**
 * Carrossel horizontal feito só com rolagem + scroll-snap do CSS (sem biblioteca).
 * @param {string} titulo   HTML do título (pode ter <em> para o itálico rosa)
 * @param {string[]} itensHtml  um HTML por item (normalmente ProductCard)
 * @param {string} [verTodas]   se informado, mostra o link "Ver todas" apontando para essa URL
 */
export function Carousel({ titulo, itensHtml, verTodas }) {
  const rotulo = escapeHtml(titulo.replace(/<[^>]+>/g, '')); // aria-label sem as tags
  return `
  <section class="car" aria-label="${rotulo}">
    <div class="car-head"><h2>${titulo}</h2>
      <div class="car-side">
        ${verTodas ? `<a class="car-all" href="${verTodas}" aria-label="Ver todas: ${rotulo}">Ver todas ${icon('arrow')}</a>` : ''}
        <div class="car-controls">
          <button type="button" data-car="-1" aria-label="Anteriores: ${rotulo}">${icon('chevron', 'flipped')}</button>
          <button type="button" data-car="1" aria-label="Próximos: ${rotulo}">${icon('chevron')}</button>
        </div>
      </div>
    </div>
    <div class="car-track" tabindex="0" role="group" aria-label="${rotulo}, role para o lado">${itensHtml.map(h => `<div class="car-item">${h}</div>`).join('')}</div>
  </section>`;
}

export function iniciarCarousel(raiz) {
  const trilho = raiz.querySelector('.car-track');
  raiz.querySelectorAll('[data-car]').forEach(b =>
    b.addEventListener('click', () => {
      const item = trilho.querySelector('.car-item');
      // Rola "um card" por clique (largura do card + espaçamento).
      trilho.scrollBy({ left: Number(b.dataset.car) * (item.getBoundingClientRect().width + 16), behavior: 'smooth' });
    }));

  // Estado das setas: some a do lado onde não há mais para onde rolar; sem rolagem nenhuma (tudo cabe), as duas somem.
  const [anterior, proxima] = raiz.querySelectorAll('[data-car]');
  const atualizar = () => {
    const max = trilho.scrollWidth - trilho.clientWidth;
    raiz.classList.toggle('car--sem-rolagem', max <= 24);
    anterior.disabled = trilho.scrollLeft <= 12;
    proxima.disabled = trilho.scrollLeft >= max - 12;
  };
  trilho.addEventListener('scroll', atualizar, { passive: true });
  addEventListener('resize', atualizar);
  atualizar();
}
