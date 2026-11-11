// Página /catalogo/ — listagem com filtros, ordenação e paginação (tudo no navegador).
import { iniciarMovimento, escalonar } from '../motion.js';
import { renderHeader, renderFooter, iniciarHeader } from '../components/layout.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { ProductCard } from '../components/ProductCard.js';
import { FilterSidebar, lerFiltros, sincronizarFiltros, mostrarSubs } from '../components/FilterSidebar.js';
import { Banner } from '../components/Banner.js';
import { HeroCategoria } from '../components/HeroVendas.js';
import { aplicarTemaNaPagina } from '../data/temas.js';
import { bannerDe } from '../data/banners.js';
import { Pagination } from '../components/Pagination.js';
import { icon } from '../lib/icons.js';
import { plural, urlSite, urlCatalogo, escapeHtml } from '../lib/format.js';
import { favoritos } from '../lib/storage.js';
import { listarProdutos, listarCategorias } from '../services/produtos.js';
import { ORDENACOES, FILTROS_VAZIOS, filtrarProdutos, ordenarProdutos, paginar, contarFiltrosAtivos } from '../lib/filtros.js';

const POR_PAGINA = 12;

// ── Estado da página ────────────────────────────────────────────────────────
// Tudo o que o usuário escolhe fica neste objeto; render() desenha a tela a partir dele.
// O estado também é espelhado na URL (?categoria=Agendas&ordem=menor-preco), então dá para
// compartilhar ou recarregar a página sem perder os filtros.
let estado = { ...FILTROS_VAZIOS, ordem: 'relevancia', pagina: 1 };
let produtos = [];
let listaCats = []; // categorias (para os atalhos do topo)

function estadoDaUrl() {
  const p = new URLSearchParams(location.search);
  const ordem = p.get('ordem');
  return {
    q: p.get('q') ?? '',
    categoria: p.get('categoria') ?? '',
    subcategoria: p.get('sub') ?? '',
    min: p.get('min') ?? '',
    max: p.get('max') ?? '',
    notaMin: Number(p.get('nota')) || 0,
    comDesconto: p.get('desconto') === '1',
    ordem: ORDENACOES.some(o => o.valor === ordem) ? ordem : 'relevancia',
    pagina: Number(p.get('pagina')) || 1,
  };
}

function estadoParaUrl() {
  const p = new URLSearchParams();
  if (estado.q) p.set('q', estado.q);
  if (estado.categoria) p.set('categoria', estado.categoria);
  if (estado.subcategoria) p.set('sub', estado.subcategoria);
  if (estado.min !== '') p.set('min', estado.min);
  if (estado.max !== '') p.set('max', estado.max);
  if (estado.notaMin) p.set('nota', estado.notaMin);
  if (estado.comDesconto) p.set('desconto', '1');
  if (estado.ordem !== 'relevancia') p.set('ordem', estado.ordem);
  if (estado.pagina > 1) p.set('pagina', estado.pagina);
  const qs = p.toString();
  history.replaceState(null, '', `${location.pathname}${qs ? '?' + qs : ''}${location.hash}`);
}

// ── Desenho da tela ─────────────────────────────────────────────────────────
function montarEsqueleto(categorias) {
  listaCats = categorias;
  document.querySelector('#app').innerHTML = `
    ${renderHeader({ barra: true })}
    <main id="conteudo">
      <div id="category-hero"></div>
      <div class="cat container">
      <div id="breadcrumb"></div>
      <div id="banner"></div>
      <h1 class="cat-title" id="titulo-pagina">Catálogo</h1>
      <div class="chips-cat" id="chips-cat" role="group" aria-label="Atalhos de categorias"></div>
      <div class="cat-layout">
        ${FilterSidebar(categorias, produtos.length)}
        <div class="fs-backdrop" data-fechar-filtros hidden></div>
        <section class="cat-results" id="produtos" aria-labelledby="titulo-pagina">
          <div class="cat-bar">
            <p class="cat-count" id="contagem" role="status" aria-live="polite"></p>
            <button type="button" class="cat-filter-btn" id="abrir-filtros" aria-controls="filtros" aria-expanded="false">${icon('filter')}Filtrar<span class="cat-filter-n" hidden></span></button>
            <div class="cat-sort"><label for="ordem">Ordenar por</label>
              <select id="ordem">${ORDENACOES.map(o => `<option value="${o.valor}">${o.rotulo}</option>`).join('')}</select>
            </div>
          </div>
          <div class="ativos" id="ativos" aria-label="Filtros aplicados"></div>
          <div class="cat-grid" id="grade"></div>
          <div id="paginacao"></div>
        </section>
      </div>
      </div>
    </main>
    ${renderFooter()}`;
  iniciarHeader();
}

function render() {
  const filtrados = ordenarProdutos(filtrarProdutos(produtos, estado), estado.ordem);
  const { itens, pagina, totalPaginas } = paginar(filtrados, estado.pagina, POR_PAGINA);
  estado.pagina = pagina; // corrige se a URL pedia uma página que não existe mais

  // Breadcrumb: Início > Catálogo > (Categoria)
  const trilha = [{ label: 'Início', href: urlSite() }, { label: 'Catálogo', href: estado.categoria ? urlCatalogo() : undefined }];
  if (estado.categoria) trilha.push({ label: estado.categoria, href: estado.subcategoria ? urlCatalogo({ categoria: estado.categoria }) : undefined });
  if (estado.subcategoria) trilha.push({ label: estado.subcategoria });
  document.querySelector('#breadcrumb').innerHTML = Breadcrumb(trilha);
  const titulo = estado.subcategoria || estado.categoria || 'Catálogo';
  document.querySelector('#titulo-pagina').textContent = titulo;
  document.title = `${titulo} — Feito de Afeto`;
  // Uma coleção por página; filtros de preço/ordem não reiniciam a animação do banner.
  const hero = document.querySelector('#category-hero');
  if (hero.dataset.categoria !== estado.categoria) {
    hero.innerHTML = HeroCategoria(estado.categoria);
    hero.dataset.categoria = estado.categoria;
  }
  document.querySelector('#banner').innerHTML = hero.childElementCount
    ? '' : Banner(bannerDe(estado.categoria, estado.subcategoria));
  mostrarSubs(document.querySelector('.fs-form'), estado.categoria);

  document.querySelector('#contagem').textContent = plural(filtrados.length, 'resultado', 'resultados');
  document.querySelector('[data-contagem-filtros]').textContent = filtrados.length;

  const n = contarFiltrosAtivos(estado);
  const selo = document.querySelector('.cat-filter-n');
  selo.hidden = !n;
  selo.textContent = n;

  document.querySelector('#grade').innerHTML = itens.length
    ? itens.map(p => ProductCard(p, { favorito: favoritos.tem(p.id) })).join('')
    : `<div class="cat-empty">${icon('search')}<h2>Nenhum arquivo encontrado</h2><p>Tente remover alguns filtros ou buscar por outro termo.</p><button type="button" class="button button-primary" data-limpar-filtros>Limpar filtros</button></div>`;
  escalonar('#grade .pc', 11); // atraso crescente: os cards entram em cascata (motion.css)
  document.querySelector('#paginacao').innerHTML = Pagination({ pagina, totalPaginas });
  desenharAtalhos();
  aplicarTemaNaPagina(estado.categoria); // destaques (chips, filtros) na cor da categoria
  document.body.classList.add('lista');   // listagem ampla, estilo de marketplace (loja.css)
  estadoParaUrl();
}

// Atalhos de categoria no topo (um toque troca de categoria) e "etiquetas" dos filtros aplicados, cada uma com X.
function desenharAtalhos() {
  const chip = (rotulo, attrs, ativo) => `<button type="button" class="chip-f${ativo ? ' on' : ''}" ${attrs} aria-pressed="${ativo}">${rotulo}</button>`;
  document.querySelector('#chips-cat').innerHTML =
    chip('Todos', 'data-chip-cat=""', !estado.categoria && !estado.comDesconto) +
    chip('Ofertas', 'data-chip-ofertas', estado.comDesconto) +
    listaCats.map(c => chip(escapeHtml(c.nome), `data-chip-cat="${escapeHtml(c.nome)}"`, estado.categoria === c.nome)).join('');

  const ativos = [];
  if (estado.q) ativos.push(['q', `Busca: “${escapeHtml(estado.q)}”`]);
  if (estado.categoria) ativos.push(['categoria', escapeHtml(estado.categoria)]);
  if (estado.subcategoria) ativos.push(['sub', escapeHtml(estado.subcategoria)]);
  if (estado.min !== '' || estado.max !== '') ativos.push(['preco', `Preço: ${estado.min !== '' ? 'de R$ ' + estado.min : ''}${estado.min !== '' && estado.max !== '' ? ' ' : ''}${estado.max !== '' ? 'até R$ ' + estado.max : ''}`]);
  if (estado.notaMin) ativos.push(['nota', `${String(estado.notaMin).replace('.', ',')}+ estrelas`]);
  if (estado.comDesconto) ativos.push(['desconto', 'Com desconto']);
  document.querySelector('#ativos').innerHTML = ativos.length
    ? ativos.map(([k, t]) => `<span class="ativo">${t}<button type="button" data-remover="${k}" aria-label="Remover filtro: ${t.replace(/<[^>]+>/g, '')}">${icon('close')}</button></span>`).join('') + '<button type="button" class="ativos-limpar" data-limpar-filtros>Limpar tudo</button>'
    : '';
}

// ── Gaveta de filtros (celular) ─────────────────────────────────────────────
const gaveta = {
  abrir() {
    document.querySelector('#filtros').classList.add('is-open');
    document.querySelector('.fs-backdrop').hidden = false;
    document.body.classList.add('modal-open');
    document.querySelector('#abrir-filtros').setAttribute('aria-expanded', 'true');
    document.querySelector('#filtros').focus();
  },
  fechar() {
    document.querySelector('#filtros').classList.remove('is-open');
    document.querySelector('.fs-backdrop').hidden = true;
    document.body.classList.remove('modal-open');
    const botao = document.querySelector('#abrir-filtros');
    botao.setAttribute('aria-expanded', 'false');
    if (getComputedStyle(botao).display !== 'none') botao.focus(); // devolve o foco a quem abriu
  },
};

// ── Eventos ─────────────────────────────────────────────────────────────────
function ligarEventos() {
  const form = document.querySelector('.fs-form');
  let atraso;

  // Mudou algum filtro: relê o formulário, volta para a página 1 e redesenha.
  const aplicarFiltros = () => {
    const novos = lerFiltros(form);
    // Se nada mudou (ex.: o "change" que o navegador dispara quando o campo perde o foco), não redesenha:
    // redesenhar no meio de um clique trocaria o botão clicado e o clique se perderia.
    if (Object.keys(novos).every(k => novos[k] === estado[k])) return;
    estado = { ...estado, ...novos, pagina: 1 };
    render();
  };
  form.addEventListener('change', aplicarFiltros);
  // Nos campos de preço, espera o usuário parar de digitar (300 ms) antes de filtrar.
  form.addEventListener('input', e => {
    if (e.target.type !== 'number') return;
    clearTimeout(atraso);
    atraso = setTimeout(aplicarFiltros, 300);
  });
  form.addEventListener('submit', e => e.preventDefault());

  document.querySelector('#ordem').addEventListener('change', e => { estado.ordem = e.target.value; estado.pagina = 1; render(); });

  // Um único listener no documento trata todos os cliques (event delegation),
  // porque a grade e a paginação são redesenhadas a cada render.
  document.addEventListener('click', e => {
    const alvo = e.target.closest('button');
    if (!alvo) return;
    if (alvo.matches('[data-favorite]')) {
      const ligado = favoritos.alternar(alvo.dataset.favorite);
      alvo.classList.toggle('is-favorite', ligado);
      alvo.setAttribute('aria-pressed', String(ligado));
      alvo.setAttribute('aria-label', alvo.getAttribute('aria-label').replace(/^(Adicionar aos|Remover dos)( favoritos)/, `${ligado ? 'Remover dos' : 'Adicionar aos'}$2`));
    } else if (alvo.matches('[data-pagina]')) {
      estado.pagina = Number(alvo.dataset.pagina);
      render();
      document.querySelector('#titulo-pagina').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (alvo.matches('[data-limpar-filtros]')) {
      estado = { ...estado, ...FILTROS_VAZIOS, q: '', pagina: 1 };
      sincronizarFiltros(form, estado);
      document.querySelector('#busca-header').value = ''; // a busca fica no header
      render();
    } else if (alvo.matches('[data-chip-cat]')) {
      estado = { ...estado, categoria: alvo.dataset.chipCat, subcategoria: '', comDesconto: false, pagina: 1 };
      sincronizarFiltros(form, estado);
      render();
    } else if (alvo.matches('[data-chip-ofertas]')) {
      estado = { ...estado, categoria: '', subcategoria: '', comDesconto: !estado.comDesconto, pagina: 1 };
      sincronizarFiltros(form, estado);
      render();
    } else if (alvo.matches('[data-remover]')) {
      const k = alvo.dataset.remover;
      if (k === 'q') { estado.q = ''; document.querySelector('#busca-header').value = ''; }
      if (k === 'categoria') { estado.categoria = ''; estado.subcategoria = ''; }
      if (k === 'sub') estado.subcategoria = '';
      if (k === 'preco') { estado.min = ''; estado.max = ''; }
      if (k === 'nota') estado.notaMin = 0;
      if (k === 'desconto') estado.comDesconto = false;
      estado.pagina = 1;
      sincronizarFiltros(form, estado);
      render();
    } else if (alvo.matches('#abrir-filtros')) gaveta.abrir();
  });
  document.querySelectorAll('[data-fechar-filtros]').forEach(el => el.addEventListener('click', gaveta.fechar));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('#filtros').classList.contains('is-open')) gaveta.fechar(); });
}

// ── Início ──────────────────────────────────────────────────────────────────
document.querySelector('#app').innerHTML = `${renderHeader({ barra: true })}<main class="cat container" id="conteudo" aria-busy="true"><div class="skel-titulo"></div><div class="cat-grid">${Array.from({ length: 8 }, () => '<div class="skel-card"><div></div><i></i><i></i><i></i></div>').join('')}</div></main>${renderFooter()}`;
produtos = await listarProdutos();
estado = estadoDaUrl();
montarEsqueleto(await listarCategorias());
sincronizarFiltros(document.querySelector('.fs-form'), estado);
document.querySelector('#ordem').value = estado.ordem;
ligarEventos();
iniciarMovimento(); // antes do 1º render, para a grade já entrar animada
render();
