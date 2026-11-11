// Página /produto/?slug=agenda-2027-floral — detalhe do produto (layout de loja grande).
import { iniciarMovimento } from '../motion.js';
import { renderHeader, renderFooter, iniciarHeader } from '../components/layout.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { Gallery, iniciarGallery } from '../components/Gallery.js';
import { BuyBox, BarraCompraMobile } from '../components/BuyBox.js';
import { Carousel, iniciarCarousel } from '../components/Carousel.js';
import { ProductCard } from '../components/ProductCard.js';
import { Reviews } from '../components/Reviews.js';
import { Estrelas } from '../components/Stars.js';
import { icon } from '../lib/icons.js';
import { moeda, escapeHtml, urlSite, urlCatalogo, urlProduto, notaBR } from '../lib/format.js';
import { temDesconto, percentualDesconto, ehMaisVendido } from '../lib/filtros.js';
import { favoritos, carrinho, vistos } from '../lib/storage.js';
import { toast } from '../lib/toast.js';
import { aplicarTemaNaPagina } from '../data/temas.js';
import { buscarProdutoPorSlug, listarRelacionados, listarAvaliacoes, listarProdutos } from '../services/produtos.js';

const app = document.querySelector('#app');
const slug = new URLSearchParams(location.search).get('slug') ?? '';
const produto = await buscarProdutoPorSlug(slug);

// Os 3 passos mostrados na seção "Como funciona" (ajuda quem nunca comprou arquivo digital)
const PASSOS = [
  ['cart', 'Compre', 'Finalize o pedido com segurança.'],
  ['download', 'Baixe na hora', 'O PDF fica disponível para download assim que o pagamento é confirmado.'],
  ['printer', 'Imprima e crie', 'Imprima em casa ou na gráfica e encaderne do seu jeito.'],
];

if (!produto) {
  document.title = 'Produto não encontrado — Feito de Afeto';
  app.innerHTML = `${renderHeader({ barra: true })}
    <main class="cat container" id="conteudo"><div class="cat-empty"><h1>Produto não encontrado</h1><p>Esse arquivo não existe ou saiu do catálogo.</p><a class="button button-primary" href="${urlSite('catalogo/')}">Ver catálogo</a></div></main>${renderFooter()}`;
  iniciarHeader();
} else {
  const [relacionados, avaliacoes, todos] = await Promise.all([listarRelacionados(produto), listarAvaliacoes(produto), listarProdutos()]);
  const vistosAntes = vistos.lista().filter(s => s !== produto.slug).map(s => todos.find(p => p.slug === s)).filter(Boolean).slice(0, 8);
  vistos.registrar(produto.slug);
  aplicarTemaNaPagina(produto.categoria);
  const desconto = temDesconto(produto);
  const temAval = produto.numAvaliacoes > 0;
  const fav = favoritos.tem(produto.id);
  document.title = `${produto.titulo} — Feito de Afeto`;

  const linhasTabela = [
    ['Formato', produto.formato],
    ['Número de páginas', produto.paginas],
    ['Categoria', produto.categoria],
    ...(produto.subcategoria ? [['Nicho', produto.subcategoria]] : []),
    ['Tipo de produto', 'Arquivo digital (PDF)'],
    ['Entrega', 'Download imediato após o pagamento'],
    ['Uso', 'Imprimir em casa ou na gráfica'],
  ].filter(([, v]) => v != null && v !== '');
  const lateral = relacionados.slice(0, 4);

  app.innerHTML = `
    ${renderHeader({ barra: true })}
    <main class="pp container" id="conteudo">
      ${Breadcrumb([
        { label: 'Início', href: urlSite() },
        { label: 'Catálogo', href: urlCatalogo() },
        { label: produto.categoria, href: urlCatalogo({ categoria: produto.categoria }) },
        ...(produto.subcategoria ? [{ label: produto.subcategoria, href: urlCatalogo({ categoria: produto.categoria, sub: produto.subcategoria }) }] : []),
        { label: produto.titulo },
      ])}

      <!-- Topo: fotos | título e preço | caixa de compra. Layout simples, estilos em src/produto.css -->
      <div class="pp-card pp-top">
        <div class="pp-gal">${Gallery(produto.imagens)}</div>

        <section class="pp-info" aria-labelledby="pd-titulo">
          <div class="pp-linha">
            <p class="pp-cond">Arquivo digital · PDF${produto.vendidos > 0 ? ` · ${produto.vendidos.toLocaleString('pt-BR')} vendidos` : ''}</p>
            <button type="button" class="pd-fav${fav ? ' is-favorite' : ''}" data-favorite="${produto.id}" aria-pressed="${fav}" aria-label="${fav ? 'Remover dos' : 'Adicionar aos'} favoritos: ${escapeHtml(produto.titulo)}">${icon('heart')}</button>
          </div>
          ${ehMaisVendido(produto) ? '<span class="pp-selo">Mais vendido</span>' : (produto.novo ? '<span class="pp-selo pp-selo--novo">Novo</span>' : '')}
          <h1 id="pd-titulo">${escapeHtml(produto.titulo)}</h1>
          <div class="pp-nota">
            ${temAval ? `<a href="#avaliacoes" class="pd-rating-link">${notaBR(produto.nota)} ${Estrelas(produto.nota)}<span>(${produto.numAvaliacoes})</span></a>` : '<span class="pp-novo-txt">Ainda sem avaliações</span>'}
          </div>
          <div class="pp-preco">
            ${desconto ? `<p class="pp-old"><s>${moeda(produto.precoOriginal)}</s></p>` : ''}
            <p class="pp-valor"><strong>${moeda(produto.preco)}</strong>${desconto ? `<span class="pp-off">${percentualDesconto(produto)}% OFF</span>` : ''}</p>
            <p class="pp-pag">À vista no Pix ou cartão de crédito</p>
          </div>
          <h2 class="pp-h">O que você precisa saber sobre este produto</h2>
          <ul class="pp-lista">
            <li>Formato: <b>${escapeHtml(String(produto.formato))}</b>, com ${produto.paginas} ${produto.paginas === 1 ? 'página' : 'páginas'}.</li>
            <li>Você baixa na hora, assim que o pagamento é confirmado.</li>
            <li>Pronto para imprimir em casa ou na gráfica.</li>
            <li>Produto digital: nenhum item físico é enviado.</li>
          </ul>
          <a class="pp-link" href="#detalhes">Ver todas as características</a>
        </section>

        <aside class="pp-box">${BuyBox(produto)}</aside>
      </div>

      <div class="pp-corpo">
        <div class="pp-main pp-card">
          <section id="detalhes" class="pp-sec" aria-labelledby="pp-det"><h2 id="pp-det">Características do produto</h2>
            <table class="pp-tabela"><tbody>${linhasTabela.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`).join('')}</tbody></table>
          </section>
          <section id="descricao" class="pp-sec" aria-labelledby="pd-desc"><h2 id="pd-desc">Descrição</h2>
            <p class="pp-texto">${escapeHtml(produto.descricao)}</p>
            ${produto.tags.length ? `<p class="pd-tags">${produto.tags.map(t => `<a class="pd-chip" href="${urlCatalogo({ q: t })}">${escapeHtml(t)}</a>`).join('')}</p>` : ''}
          </section>
          ${produto.incluso.length ? `<section id="incluso" class="pp-sec" aria-labelledby="pd-inc"><h2 id="pd-inc">O que está incluso</h2>
            <ul class="pd-incl">${produto.incluso.map(i => `<li>${icon('check')}${escapeHtml(i)}</li>`).join('')}</ul>
          </section>` : ''}
          <section id="como-funciona" class="pp-sec" aria-labelledby="pd-como"><h2 id="pd-como">Como funciona</h2>
            <ol class="pp-passos">${PASSOS.map(([, t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ol>
          </section>
          ${temAval ? `<section id="avaliacoes" class="pp-sec">${Reviews(produto, avaliacoes)}</section>` : ''}
        </div>

        <aside class="pp-lado" aria-label="Informações complementares">
          <section class="pp-card pp-bloco"><h2>Meios de pagamento</h2>
            <ul class="pp-pagto">
              <li><b>Pix</b><span>Aprovação na hora. O PDF é liberado assim que o pagamento cai.</span></li>
              <li><b>Cartão de crédito</b><span>À vista. Os dados do cartão não ficam salvos no site.</span></li>
            </ul>
          </section>
          <section class="pp-card pp-bloco"><h2>Compra segura</h2>
            <ul class="pp-seguro"><li>${icon('shield')}<span>Pagamento processado pelo Asaas.</span></li><li>${icon('download')}<span>Link de download só seu, enviado por e-mail e guardado em Minha conta.</span></li></ul>
          </section>
          ${lateral.length ? `<section class="pp-card pp-bloco"><h2>Produtos relacionados</h2>
            <ul class="pp-rel">${lateral.map(p => `<li><a href="${urlProduto(p.slug)}"><img src="${escapeHtml(p.imagens[0].src)}" alt="" width="56" height="70" loading="lazy"><span><b>${escapeHtml(p.titulo)}</b><strong>${moeda(p.preco)}</strong></span></a></li>`).join('')}</ul>
          </section>` : ''}
        </aside>
      </div>

      <div class="pp-rel-car">${Carousel({ titulo: 'Quem viu este produto também viu', itensHtml: relacionados.map(p => ProductCard(p, { favorito: favoritos.tem(p.id) })) })}</div>
      ${vistosAntes.length ? `<div class="pp-rel-car">${Carousel({ titulo: 'Vistos recentemente', itensHtml: vistosAntes.map(p => ProductCard(p, { favorito: favoritos.tem(p.id) })) })}</div>` : ''}
    </main>
    ${BarraCompraMobile(produto)}
    ${renderFooter()}`;
  document.body.classList.add('pagina-produto');

  iniciarHeader();
  iniciarGallery(document.querySelector('[data-gallery]'), produto.imagens);
  document.querySelectorAll('.car').forEach(iniciarCarousel);
  iniciarMovimento();

  // Barra de compra do celular: aparece quando a caixa de compra já passou para cima da tela.
  // (Calculado no scroll, e não com IntersectionObserver, porque um pulo direto para baixo — ex.: tocar em "Avaliações" —
  //  não faz o observador notar que a caixa saiu da tela.)
  const barra = document.querySelector('[data-barra-mobile]');
  const caixaCompra = document.querySelector('.bb');
  let pedido = false;
  const atualizarBarra = () => {
    pedido = false;
    const mostrar = caixaCompra.getBoundingClientRect().bottom < 0;
    barra.classList.toggle('on', mostrar);
    barra.setAttribute('aria-hidden', String(!mostrar));
    barra.querySelector('button').tabIndex = mostrar ? 0 : -1;
  };
  addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(atualizarBarra); } }, { passive: true });
  addEventListener('resize', atualizarBarra);
  atualizarBarra();

  // Menu de seções: destaca a seção que está na tela
  const links = [...document.querySelectorAll('[data-sec]')];
  const observador = new IntersectionObserver(entradas => {
    for (const e of entradas) if (e.isIntersecting) links.forEach(l => (l.dataset.sec === e.target.id ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
  }, { rootMargin: '-30% 0px -60% 0px' });
  links.forEach(l => { const s = document.getElementById(l.dataset.sec); if (s) observador.observe(s); });

  document.addEventListener('click', async e => {
    const alvo = e.target.closest('button');
    if (!alvo) return;
    if (alvo.matches('[data-favorite]')) {
      const ligado = favoritos.alternar(alvo.dataset.favorite);
      alvo.classList.toggle('is-favorite', ligado);
      alvo.setAttribute('aria-pressed', String(ligado));
      alvo.setAttribute('aria-label', alvo.getAttribute('aria-label').replace(/^(Adicionar aos|Remover dos)( favoritos)/, `${ligado ? 'Remover dos' : 'Adicionar aos'}$2`));
    } else if (alvo.matches('[data-adicionar]')) {
      const adicionado = carrinho.adicionar(alvo.dataset.adicionar);
      toast(adicionado ? 'Adicionado ao seu carrinho com carinho!' : 'Este arquivo já está no seu carrinho.');
    } else if (alvo.matches('[data-comprar]')) {
      location.href = urlSite(`comprar/?produto=${encodeURIComponent(produto.slug)}`);
    } else if (alvo.matches('[data-compartilhar]')) {
      const dados = { title: produto.titulo, text: `${produto.titulo} — Feito de Afeto`, url: location.href };
      try {
        if (navigator.share) await navigator.share(dados);
        else { await navigator.clipboard.writeText(location.href); toast('Link copiado!'); }
      } catch (erro) { if (erro?.name !== 'AbortError') toast('Não consegui copiar o link.'); }
    }
  });
}
