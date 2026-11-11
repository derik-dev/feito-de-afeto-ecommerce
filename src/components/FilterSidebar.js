import { icon } from '../lib/icons.js';
import { escapeHtml } from '../lib/format.js';

/**
 * Barra lateral de filtros. No desktop fica ao lado dos resultados; no celular vira um
 * "drawer" (gaveta) que o CSS desliza da esquerda — é o MESMO elemento nos dois casos.
 * @param {{nome:string, total:number, subs?:{nome:string, total:number}[]}[]} categorias categorias com a quantidade de produtos (e subcategorias, se houver)
 * @param {number} total quantidade total de produtos
 */
export function FilterSidebar(categorias, total) {
  const radio = (name, value, rotulo, extra = '') =>
    `<label class="fs-opt"><input type="radio" name="${name}" value="${value}" /><span>${rotulo}</span>${extra}</label>`;
  return `
  <aside class="fs" id="filtros" aria-label="Filtros" tabindex="-1">
    <div class="fs-head"><h2>Filtros</h2><button type="button" class="fs-close" data-fechar-filtros aria-label="Fechar filtros">${icon('close')}</button></div>
    <form class="fs-form" novalidate>
      <fieldset>
        <legend>Categoria</legend>
        ${radio('categoria', '', 'Todas', `<small>${total}</small>`)}
        ${categorias.map(c => radio('categoria', escapeHtml(c.nome), escapeHtml(c.nome), `<small>${c.total}</small>`) + (c.subs?.length
          // Subcategorias: só aparecem (sem `hidden`) quando a categoria-mãe está selecionada. Veja mostrarSubs().
          ? `<div class="fs-subs" data-sub-de="${escapeHtml(c.nome)}" hidden>${c.subs.map(s => `<label class="fs-opt"><input type="radio" name="subcategoria" value="${escapeHtml(s.nome)}" data-pai="${escapeHtml(c.nome)}" /><span>${escapeHtml(s.nome)}</span><small>${s.total}</small></label>`).join('')}</div>`
          : '')).join('')}
      </fieldset>
      <fieldset>
        <legend>Preço</legend>
        <div class="fs-price">
          <label>Mínimo<input name="min" type="number" inputmode="decimal" min="0" step="0.01" placeholder="R$ 0" /></label>
          <span aria-hidden="true">–</span>
          <label>Máximo<input name="max" type="number" inputmode="decimal" min="0" step="0.01" placeholder="R$ 60" /></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Avaliação mínima</legend>
        ${radio('nota', '0', 'Todas')}
        ${radio('nota', '4.5', '<span class="stars-inline" aria-hidden="true">★★★★★</span> 4,5 ou mais')}
        ${radio('nota', '4', '<span class="stars-inline" aria-hidden="true">★★★★</span> 4,0 ou mais')}
        ${radio('nota', '3', '<span class="stars-inline" aria-hidden="true">★★★</span> 3,0 ou mais')}
      </fieldset>
      <fieldset>
        <legend>Ofertas</legend>
        <label class="fs-opt"><input type="checkbox" name="desconto" value="1" /><span>Com desconto</span></label>
      </fieldset>
      <button type="button" class="fs-clear" data-limpar-filtros>Limpar filtros</button>
    </form>
    <div class="fs-foot"><button type="button" class="button button-primary" data-fechar-filtros>Ver <span data-contagem-filtros>${total}</span> resultados</button></div>
  </aside>`;
}

/** Lê o formulário e devolve só os campos de filtro (a busca e a ordenação ficam fora da sidebar). */
export function lerFiltros(form) {
  const d = new FormData(form);
  const categoria = d.get('categoria') || '';
  // A subcategoria só vale se ela pertence à categoria escolhida (evita sobra ao trocar de categoria).
  const sub = form.querySelector('input[name=subcategoria]:checked');
  return {
    categoria,
    subcategoria: sub && sub.dataset.pai === categoria ? sub.value : '',
    min: d.get('min') ?? '',
    max: d.get('max') ?? '',
    notaMin: Number(d.get('nota') || 0),
    comDesconto: d.get('desconto') === '1',
  };
}

/** Mostra a lista de subcategorias da categoria selecionada e esconde as outras. */
export function mostrarSubs(form, categoria) {
  form.querySelectorAll('.fs-subs').forEach(el => { el.hidden = el.dataset.subDe !== categoria; });
}

/** Faz o caminho inverso: pinta no formulário o estado atual (usado ao carregar a URL e ao limpar). */
export function sincronizarFiltros(form, f) {
  // Marcamos cada rádio na mão: `form.elements.categoria.value = ''` não funciona de forma confiável.
  form.querySelectorAll('input[name=categoria]').forEach(r => { r.checked = r.value === f.categoria; });
  form.querySelectorAll('input[name=subcategoria]').forEach(r => { r.checked = r.value === f.subcategoria && r.dataset.pai === f.categoria; });
  form.querySelectorAll('input[name=nota]').forEach(r => { r.checked = Number(r.value) === f.notaMin; });
  form.elements.min.value = f.min;
  form.elements.max.value = f.max;
  form.elements.desconto.checked = f.comDesconto;
  mostrarSubs(form, f.categoria);
}
