// Header e footer compartilhados por TODAS as páginas (home, catálogo e produto).
// O visual base vem de src/style.css; a busca e a linha de categorias estão em catalogo.css.
import { icon } from '../lib/icons.js';
import { urlSite, urlCatalogo, escapeHtml } from '../lib/format.js';
import { carrinho } from '../lib/storage.js';
import { toast } from '../lib/toast.js';

// Links da segunda linha do header. `params` vira a query do /catalogo/.
const LINKS_CATEGORIAS = [
  { rotulo: 'Ofertas', params: { desconto: '1' }, destaque: true },
  { rotulo: 'Agendamento', params: { categoria: 'Agendamento' } },
  { rotulo: 'Religiosas', params: { categoria: 'Religiosas' } },
  { rotulo: 'Jardim Encantado', params: { categoria: 'Jardim Encantado' } },
];

// Faixa fina acima do header (estilo loja grande): só nas páginas internas, com os 3 diferenciais da loja.
const BARRA = `<div class="topbar" role="note"><ul><li>${icon('bolt')}Download imediato</li><li>${icon('printer')}Pronto para imprimir</li><li>${icon('shield')}Compra segura</li></ul></div>`;

/** @param {{barra?: boolean}} opcoes barra: mostra a faixa de diferenciais no topo (páginas internas) */
export function renderHeader({ barra = false } = {}) {
  const q = new URLSearchParams(location.search).get('q') ?? '';
  return `
  ${barra ? BARRA : ''}
  <header class="site-header">
    <div class="header-inner">
      <a class="brand brand--logo" href="${urlSite()}" aria-label="Feito de Afeto, início"><img src="${urlSite('images/logo.webp')}" alt="Feito de Afeto" width="108" height="72" /></a>
      <!-- A busca é o elemento principal: envia para /catalogo/?q=... -->
      <form class="hd-search" role="search" action="${urlSite('catalogo/')}" method="get">
        <label class="sr-only" for="busca-header">Buscar produtos</label>
        <input id="busca-header" name="q" type="search" value="${escapeHtml(q)}" placeholder="Buscar agendas, planners…" autocomplete="off" />
        <button type="submit" aria-label="Buscar">${icon('search')}</button>
      </form>
      <div class="header-actions">
        <a class="icon-button account-toggle" href="${urlSite('conta/')}" aria-label="Minha conta">${icon('user')}</a>
        <a class="icon-button cart-toggle" href="${urlSite('carrinho/')}" aria-label="Abrir carrinho" data-cart>${icon('cart')}<span class="cart-count" hidden>0</span></a>
        <button class="icon-button menu-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-mobile">${icon('menu')}</button>
      </div>
    </div>
    <nav class="hd-cats" aria-label="Categorias">
      <div class="hd-cats-inner">
        <ul>${LINKS_CATEGORIAS.map(l => `<li><a${l.destaque ? ' class="is-hot"' : ''} href="${urlCatalogo(l.params)}">${l.rotulo}</a></li>`).join('')}</ul>
        <ul class="hd-cats-side"><li><a href="${urlSite('catalogo/')}">Ver catálogo</a></li><li><a href="${urlSite('?modal=about')}">Sobre nós</a></li><li><a href="${urlSite('?modal=contact')}">Contato</a></li></ul>
      </div>
    </nav>
    <nav class="mobile-nav" id="menu-mobile" aria-label="Navegação no celular" hidden>
      <a href="${urlSite()}">Início</a><a href="${urlSite('catalogo/')}">Catálogo</a>${LINKS_CATEGORIAS.map(c => `<a href="${urlCatalogo(c.params)}">${c.rotulo}</a>`).join('')}<a href="${urlSite('carrinho/')}">Meu carrinho</a><a href="${urlSite('conta/')}">Minha conta</a><a href="${urlSite('?modal=about')}">Sobre nós</a><a href="${urlSite('?modal=contact')}">Contato</a>
    </nav>
  </header>`;
}

export function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="ft-garantias">
      <ul>
        <li>${icon('bolt')}<div><b>Download imediato</b><span>Receba o arquivo logo após a compra</span></div></li>
        <li>${icon('printer')}<div><b>Pronto para imprimir</b><span>PDF em alta resolução</span></div></li>
        <li>${icon('shield')}<div><b>Compra segura</b><span>Seus dados protegidos</span></div></li>
        <li>${icon('heart')}<div><b>Feito com carinho</b><span>Cada detalhe pensado para você</span></div></li>
      </ul>
    </div>
    <div class="ft-corpo">
      <div class="ft-marca">
        <a class="brand brand--logo" href="${urlSite()}" aria-label="Feito de Afeto, início"><img src="${urlSite('images/logo.webp')}" alt="Feito de Afeto" width="150" height="100" loading="lazy" /></a>
        <p>Arquivos digitais feitos com afeto, para imprimir em casa ou na gráfica. Produtos digitais em PDF: nenhum item físico é enviado.</p>
      </div>
      <nav aria-label="Loja"><h2>Loja</h2><ul>
        <li><a href="${urlSite('catalogo/')}">Todos os produtos</a></li>
        <li><a href="${urlCatalogo({ desconto: '1' })}">Ofertas</a></li>
        ${LINKS_CATEGORIAS.filter(l => l.params.categoria).map(l => `<li><a href="${urlCatalogo(l.params)}">${l.rotulo}</a></li>`).join('')}
      </ul></nav>
      <nav aria-label="Ajuda"><h2>Ajuda</h2><ul>
        <li><a href="${urlSite('?modal=how')}">Como funciona</a></li>
        <li><a href="${urlSite('?modal=about')}">Sobre nós</a></li>
        <li><a href="${urlSite('?modal=contact')}">Fale com a gente</a></li>
      </ul></nav>
    </div>
    <div class="ft-fim"><p>© ${new Date().getFullYear()} Feito de Afeto. Todos os direitos reservados.</p><button type="button" class="ft-topo" data-topo>Voltar ao topo ${icon('chevron', 'up')}</button></div>
  </footer>`;
}

/** Liga o menu do celular e o contador do carrinho. Chamar depois de inserir o header no DOM. */
export function iniciarHeader() {
  // "Adicionar ao carrinho" dos cards de produto (vale para home, catálogo, produto, conta...)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-card-add]');
    if (!b) return;
    if (b.classList.contains('is-no-carrinho')) { location.href = urlSite('carrinho/'); return; }
    const novo = carrinho.adicionar(b.dataset.cardAdd);
    toast(novo ? 'Adicionado ao seu carrinho com carinho!' : 'Este arquivo já está no seu carrinho.');
    b.classList.add('is-no-carrinho');
    b.innerHTML = `${icon('check')}Ver no carrinho`;
  });
  // Se a pessoa está logada, traz os favoritos da conta (não pesa para quem não tem conta)
  import('../lib/conta.js').then(m => m.sincronizarSessao());
  // Sugestões de produtos enquanto a pessoa digita na busca
  import('./BuscaAoVivo.js').then(m => m.iniciarBuscaAoVivo());
  document.querySelector('[data-topo]')?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  const botaoMenu = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.mobile-nav');
  botaoMenu.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    botaoMenu.setAttribute('aria-expanded', String(!menu.hidden));
    botaoMenu.setAttribute('aria-label', menu.hidden ? 'Abrir menu' : 'Fechar menu');
    botaoMenu.innerHTML = icon(menu.hidden ? 'menu' : 'close');
  });
  const fecharMenu = () => {
    menu.hidden = true;
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir menu');
    botaoMenu.innerHTML = icon('menu');
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { fecharMenu(); botaoMenu.focus(); }
  });
  document.addEventListener('click', e => {
    if (!menu.hidden && !e.target.closest('.site-header')) fecharMenu();
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) fecharMenu(); });

  const botaoCarrinho = document.querySelector('[data-cart]');
  const contador = botaoCarrinho.querySelector('.cart-count');
  let anterior = carrinho.total();
  const atualizar = () => {
    const n = carrinho.total();
    if (n > anterior) { contador.classList.remove('bump'); void contador.offsetWidth; contador.classList.add('bump'); } // reinicia a animação
    anterior = n;
    contador.textContent = n;
    contador.hidden = !n;
    botaoCarrinho.setAttribute('aria-label', `Abrir carrinho, ${n} ${n === 1 ? 'item' : 'itens'}`);
  };
  atualizar();
  window.addEventListener('afeto:carrinho', atualizar);
}
