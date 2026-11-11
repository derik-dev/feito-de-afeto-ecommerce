const assetBase = import.meta.env?.BASE_URL ? `${import.meta.env.BASE_URL}images/` : './public/images/';
const paths = {
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  brand: '<path d="M21.5 4.8c-4.3-3.8-9.8.5-10 6.1C6.2 5.1-.8 9.7 2.8 15.2 6.2 20 14.7 24 14.7 24S26.2 9 21.5 4.8Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="7.8"/><path d="m16.5 16.5 5 5"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3Z"/>',
  cart: '<path d="M1.5 3h3l3 13h12l3-10H5"/><circle cx="9" cy="21" r="1.3"/><circle cx="19" cy="21" r="1.3"/>',
  bag: '<path d="M5 7h14l1.5 15h-17L5 7Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  arrow: '<path d="M3 12h18m-6-6 6 6-6 6"/>',
  play: '<circle cx="12" cy="12" r="9.5"/><path d="m10 8 6 4-6 4Z"/>',
  bolt: '<path d="m14 1-11 13h8l-1 9 11-13h-8l1-9Z"/>',
  printer: '<path d="M6 9V2h12v7M6 18H3V9h18v9h-3M6 14h12v9H6Z"/><path d="M17 12h1"/>',
  badge: '<path d="m12 1 3.1 2.2 3.8.3 1.1 3.7 2.4 3-1.3 3.6-.2 3.8-3.7 1.2-3.2 2.2-3.4-1.6-3.8-.6-1.5-3.5-2.7-2.7.9-3.8.1-3.8 3.5-1.6L12 1Z"/><path d="m8 11 3 3 5-6M7 20l-1 4 5-2m6-2 1 4-5-2"/>',
  calendar: '<rect x="2" y="5" width="20" height="17" rx="2"/><path d="M7 2v6M17 2v6M2 11h20M7 15h2m6 0h2M7 19h2m6 0h2"/>',
  planner: '<rect x="4" y="2" width="16" height="21" rx="2"/><path d="M7 2v21m4-16h5m-5 4h3m-3 5h5"/>',
  book: '<path d="M12 6C7 2 2 4 2 4v16s5-2 10 2c5-4 10-2 10-2V4s-5-2-10 2Zm0 0v16M5 7v10m14-10v10"/>',
  layers: '<path d="m12 2 11 6-11 6L1 8l11-6Zm-11 11 11 6 11-6M1 18l11 6 11-6"/>',
  box: '<path d="m12 2 10 5v12l-10 5-10-5V7l10-5Zm0 10v12M2 7l10 5 10-5M7 4.5l10 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  menu: '<path d="M3 5h18M3 12h18M3 19h18"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 5 10 8L22 5"/>',
  download: '<path d="M12 2v14m-5-5 5 5 5-5M3 16v6h18v-6"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.heart}</svg>`;
const money = n => n.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
const products = [
  {id:1,name:'Agenda 2027 – Floral',detail:'Miolo completo · PDF',price:39.90,image:'floral',category:'Agendas',description:'Um novo ano cheio de possibilidades. Miolo de agenda 2027 com páginas diárias, planejamento mensal e delicados detalhes florais.'},
  {id:2,name:'Planner Financeiro',detail:'Organização mensal · PDF',price:24.90,image:'financial',category:'Planners',description:'Mais clareza para cuidar das suas finanças. Planejamento mensal, controle de entradas e saídas e acompanhamento de metas em um só arquivo.'},
  {id:3,name:'Caderno de Estudos',detail:'Miolo completo · PDF',price:19.90,image:'studies',category:'Cadernos',description:'Organize sua rotina de estudos com páginas para anotações, planejamento de matérias e acompanhamento do seu aprendizado.'},
  {id:4,name:'Coleção Minimalista',detail:'Capa + Miolo · PDF',price:49.90,image:'minimal',category:'Kits e Coleções',description:'A beleza dos detalhes simples. Uma coleção coordenada com capa e miolo, pronta para dar vida aos seus próximos projetos.'},
];
const categories = [{name:'Agendas',icon:'calendar'},{name:'Planners',icon:'planner'},{name:'Cadernos',icon:'book'},{name:'Capas',icon:'layers'},{name:'Kits e Coleções',icon:'box'}];
const read = (key, fallback) => {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}};
let cart = read('afeto-cart', []);
let favorites = read('afeto-favorites', []);
let activeCategory = '';
let search = '';
let favoritesOnly = false;
let returnFocus = null;
const save = () => {localStorage.setItem('afeto-cart',JSON.stringify(cart));localStorage.setItem('afeto-favorites',JSON.stringify(favorites));};

document.querySelector('#app').innerHTML = `
  <header class="site-header" id="inicio">
    <div class="header-inner">
      <a class="brand" href="#inicio" aria-label="Feito de Afeto, início">${icon('brand')}<span>Feito de Afeto</span></a>
      <nav class="desktop-nav" aria-label="Navegação principal">
        <a class="nav-active" href="#inicio">Início</a><a href="/catalogo/">Catálogo</a><button data-modal="about">Sobre nós</button><button data-modal="contact">Contato</button>
      </nav>
      <div class="header-actions">
        <button class="icon-button search-toggle" aria-label="Buscar produtos" data-modal="search">${icon('search')}</button>
        <button class="icon-button account-toggle" aria-label="Meus favoritos" data-favorites>${icon('user')}</button>
        <button class="icon-button cart-toggle" aria-label="Abrir carrinho" data-cart>${icon('cart')}<span class="cart-count" hidden>0</span></button>
        <button class="icon-button menu-toggle" aria-label="Abrir menu" aria-expanded="false">${icon('menu')}</button>
      </div>
    </div>
    <nav class="mobile-nav" aria-label="Navegação no celular" hidden><a href="#inicio">Início</a><a href="/catalogo/">Catálogo</a><button data-modal="about">Sobre nós</button><button data-modal="contact">Contato</button><button data-modal="search">Buscar produtos</button><button data-favorites>Meus favoritos</button></nav>
  </header>
  <main>
    <section class="hero" aria-labelledby="hero-title">
      <picture><source media="(max-width: 700px)" srcset="${assetBase}hero-mobile.webp"/><img class="hero-image" src="${assetBase}hero.webp" alt="Agenda floral 2027 com espiral dourado, flores e uma xícara rosa" fetchpriority="high" /></picture>
      <div class="hero-shade"></div>
      <div class="hero-content">
        <p class="eyebrow">ARQUIVOS DIGITAIS PARA</p>
        <h1 id="hero-title">Agendas, planners<br>e <em>encadernação</em></h1>
        <div class="handdrawn"> <svg viewBox="0 0 270 50" aria-hidden="true"><path d="M3 30C69 8 115 57 207 20M221 18c-18-21-29 1 5 21 31-31 9-43-5-21"/></svg></div>
        <p class="hero-description">Miolos, capas, planners e muito mais.<br>Arquivos digitais prontos para imprimir,<br>encadernar e transformar em produtos<br class="desktop-break"> incríveis. ♡</p>
        <div class="hero-buttons"><a class="button button-primary" href="/catalogo/">${icon('bag')}Ver catálogo ${icon('arrow')}</a><button class="button button-light" data-modal="how">${icon('play')}Como funciona?</button></div>
      </div>
    </section>
    <section class="products-section container" id="catalogo" aria-labelledby="products-title">
      <div class="section-heading"><h2 id="products-title">Lançamentos e <em>novidades</em></h2><div class="carousel-controls"><button aria-label="Produtos anteriores" data-slide="-1">${icon('chevron','flipped')}</button><button aria-label="Próximos produtos" data-slide="1">${icon('chevron')}</button></div></div>
      <div class="filter-status" hidden></div>
      <div class="product-track"></div>
    </section>
    <section class="benefits container" aria-label="Vantagens dos nossos arquivos">
      <div class="benefit">${icon('bolt')}<span>Download imediato<br>após a compra</span></div>
      <div class="benefit">${icon('printer')}<span>Arquivos prontos<br>para impressão</span></div>
      <div class="benefit">${icon('badge')}<span>Qualidade profissional<br>em cada detalhe</span></div>
      <div class="benefit">${icon('heart')}<span>Feito com carinho<br>para você</span></div>
    </section>
    <div class="content container">
      <section class="catalog-banner" aria-labelledby="banner-title">
        <img src="${assetBase}collection.webp" alt="Coleção de cadernos em tons de rosa, azul e creme com espirais dourados" loading="lazy" />
        <div class="banner-copy"><h2 id="banner-title">Encontre o arquivo<br><em>perfeito</em> para o seu projeto</h2><p>Agendas, planners, cadernos, capas e<br class="wide-break"> coleções completas, organizados por<br class="wide-break"> categorias.</p><a class="button button-primary" href="/catalogo/">Explorar catálogo ${icon('arrow')}</a></div>
      </section>
      <section class="categories" aria-labelledby="categories-title">
        <div class="section-heading"><h2 id="categories-title">Categorias em destaque <span class="flourish">〜</span></h2><button class="text-link" data-all-categories>Ver todas ${icon('arrow')}</button></div>
        <div class="category-track">${categories.map((c,i)=>`<button class="category category-${i}" data-category="${c.name}" aria-pressed="false">${icon(c.icon)}<span>${c.name}</span></button>`).join('')}</div>
        <div class="category-dots" aria-label="Páginas das categorias"><button class="active" aria-label="Ver primeiras categorias" data-category-page="0"></button><button aria-label="Ver mais categorias" data-category-page="1"></button></div>
      </section>
      <section class="atelier-banner" aria-label="Arquivos para o seu ateliê"><img src="${assetBase}atelier.webp" alt="Materiais de encadernação, fitas e clips sobre uma base de corte rosa" loading="lazy"/><div class="atelier-title">${icon('brand')}<h2>Mais praticidade<br>para o <em>seu ateliê</em></h2></div><p>Arquivos pensados para quem<br>trabalha com papelaria personalizada,<br>encadernação e produtos criativos.</p></section>
    </div>
  </main>
  <div class="modal-backdrop" hidden><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><button class="modal-close icon-button" aria-label="Fechar">${icon('close')}</button><div class="modal-content"></div></section></div>
  <div class="toast" role="status" aria-live="polite"></div>
`;

function renderProducts() {
  const visible = products.filter(p => (!activeCategory || p.category===activeCategory || (activeCategory==='Capas' && p.id===4)) && (!favoritesOnly || favorites.includes(p.id)) && (!search || (p.name+' '+p.detail+' '+p.category).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))));
  document.querySelector('.product-track').innerHTML = visible.length ? visible.map(p=>`
    <article class="product-card">
      <div class="product-image-wrap"><button class="product-view" data-product="${p.id}" aria-label="Ver detalhes de ${p.name}"><img src="${assetBase}${p.image}.webp" alt="${p.name}, arquivo digital para impressão" loading="lazy" width="512" height="512"/></button><button class="favorite-button ${favorites.includes(p.id)?'is-favorite':''}" aria-label="${favorites.includes(p.id)?'Remover dos':'Adicionar aos'} favoritos: ${p.name}" aria-pressed="${favorites.includes(p.id)}" data-favorite="${p.id}">${icon('heart')}</button></div>
      <div class="product-info"><button class="product-name" data-product="${p.id}">${p.name}</button><p>${p.detail}</p><div class="product-bottom"><strong>${money(p.price)}</strong><button class="add-to-cart" data-add="${p.id}" aria-label="Adicionar ${p.name} ao carrinho">${icon('cart')}</button></div></div>
    </article>`).join('') : '<div class="empty-products">'+icon('search')+'<h3>Nenhum arquivo por aqui ainda.</h3><p>Experimente outra busca ou explore todos os produtos.</p><button class="button button-primary" data-reset>Ver todos os arquivos</button></div>';
  const filters = document.querySelector('.filter-status');
  filters.hidden = !(activeCategory || search || favoritesOnly);
  filters.innerHTML = `<span>${favoritesOnly?'Meus favoritos':activeCategory || 'Todos os arquivos'}${search?' · Busca: “'+escapeHtml(search)+'”':''} · ${visible.length} ${visible.length===1?'arquivo':'arquivos'}</span><button data-reset>Limpar filtros ${icon('close')}</button>`;
  document.querySelectorAll('[data-category]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.category===activeCategory)));
  updateCartCount();
}
function escapeHtml(s) {return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function updateCartCount() {const n=cart.reduce((s,p)=>s+p.qty,0);const el=document.querySelector('.cart-count');el.textContent=n;el.hidden=!n;document.querySelector('[data-cart]').setAttribute('aria-label',`Abrir carrinho, ${n} ${n===1?'item':'itens'}`);}
let toastTimer;
function toast(text) {const el=document.querySelector('.toast');el.innerHTML=icon('check')+text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);}
function addToCart(id) {const line=cart.find(x=>x.id===id);if(line)line.qty++;else cart.push({id,qty:1});save();updateCartCount();toast('Adicionado ao seu carrinho com carinho!');}
function openModal(content, variant='') {const backdrop=document.querySelector('.modal-backdrop');if(backdrop.hidden)returnFocus=document.activeElement;backdrop.hidden=false;const modal=document.querySelector('.modal');modal.className='modal '+variant;document.querySelector('.modal-content').innerHTML=content;document.body.classList.add('modal-open');requestAnimationFrame(()=>{(modal.querySelector('input')||modal.querySelector('.modal-close')).focus();});}
function closeModal() {document.querySelector('.modal-backdrop').hidden=true;document.body.classList.remove('modal-open');returnFocus?.focus();}
function showCart() {
  const total=cart.reduce((s,x)=>s+products.find(p=>p.id===x.id).price*x.qty,0);
  openModal(`<p class="modal-eyebrow">FEITO DE AFETO</p><h2 id="modal-title">Seu carrinho ${icon('bag')}</h2>${cart.length?`<p class="modal-intro">Um pouquinho de afeto para os seus próximos projetos.</p><div class="cart-lines">${cart.map(x=>{const p=products.find(p=>p.id===x.id);return `<div class="cart-line"><img src="${assetBase}${p.image}.webp" alt="${p.name}"/><div><h3>${p.name}</h3><p>Arquivo digital · PDF</p><strong>${money(p.price)}</strong><div class="quantity"><button data-qty="${p.id}" data-change="-1" aria-label="Diminuir quantidade de ${p.name}">${icon('minus')}</button><span>${x.qty}</span><button data-qty="${p.id}" data-change="1" aria-label="Aumentar quantidade de ${p.name}">${icon('plus')}</button><button class="remove-item" data-remove="${p.id}">Remover</button></div></div></div>`;}).join('')}</div><div class="cart-total"><span>Total</span><strong>${money(total)}</strong></div><p class="cart-note">${icon('download')} Produtos digitais. Nenhum produto físico será enviado.</p><button class="button button-primary full-width" data-checkout>Continuar com meu pedido ${icon('arrow')}</button>`:`<div class="empty-cart">${icon('bag')}<h3>Seu próximo projeto começa aqui.</h3><p>Escolha seus arquivos favoritos e adicione ao carrinho.</p><button class="button button-primary" data-continue>Explorar catálogo ${icon('arrow')}</button></div>`}`,'cart-modal');
}
function showProduct(id) {const p=products.find(x=>x.id===id);openModal(`<div class="product-detail"><img src="${assetBase}${p.image}.webp" alt="${p.name}"/><div><p class="modal-eyebrow">FEITO COM CARINHO PARA VOCÊ</p><h2 id="modal-title">${p.name}</h2><p class="modal-intro">${p.description}</p><ul class="product-features"><li>${icon('check')} Arquivo digital em PDF</li><li>${icon('check')} Pronto para imprimir e encadernar</li><li>${icon('check')} Para papelaria personalizada</li></ul><strong class="detail-price">${money(p.price)}</strong><button class="button button-primary full-width" data-add="${p.id}">${icon('bag')} Adicionar ao carrinho</button><small>Imagem ilustrativa do produto montado. Você receberá um arquivo digital.</small></div></div>`,'detail-modal');}
function showInfo(type) {
  if(type==='search')openModal(`<p class="modal-eyebrow">ENCONTRE SEU PRÓXIMO PROJETO</p><h2 id="modal-title">O que você quer criar?</h2><form class="search-form"><label for="product-search">Busque por agendas, planners, cadernos...</label><div><input id="product-search" name="q" type="search" placeholder="Digite o que procura" value="${escapeHtml(search)}" required/><button class="button button-primary" type="submit" aria-label="Buscar">${icon('search')}</button></div></form><div class="search-suggestions">${['Agendas','Planners','Cadernos'].map(c=>`<button data-suggest="${c}">${c}</button>`).join('')}</div>`);
  if(type==='how')openModal(`<p class="modal-eyebrow">DO DIGITAL AO FEITO À MÃO</p><h2 id="modal-title">Como funciona?</h2><p class="modal-intro">Criar algo especial pode ser simples. A gente cuida dos arquivos, você dá vida às ideias.</p><div class="how-steps"><div><span>01</span><div><h3>Escolha seu arquivo</h3><p>Encontre no catálogo o miolo, a capa ou a coleção ideal para o seu projeto.</p></div></div><div><span>02</span><div><h3>Receba seu PDF</h3><p>Após a confirmação da compra, o arquivo digital fica disponível para download.</p></div></div><div><span>03</span><div><h3>Imprima e crie</h3><p>Imprima, encaderne e transforme o arquivo em uma peça cheia de personalidade.</p></div></div></div><button class="button button-primary" data-continue>Encontrar meu arquivo ${icon('arrow')}</button>`);
  if(type==='about')openModal(`<p class="modal-eyebrow">CADA DETALHE TEM UM CARINHO</p><h2 id="modal-title">Prazer, Feito de Afeto. ♡</h2><p class="modal-intro">Acreditamos que o papel pode guardar planos, sonhos e um pouquinho de quem a gente é.</p><p>Criamos arquivos digitais para quem ama papelaria e transforma ideias em peças especiais. São miolos, capas, planners e coleções pensados para facilitar sua rotina e trazer mais beleza para o seu ateliê.</p><p>Do primeiro rascunho ao último detalhe, tudo é feito com cuidado — e muito afeto.</p><button class="button button-primary" data-continue>Conheça nossos arquivos ${icon('arrow')}</button>`);
  if(type==='contact')openModal(`<p class="modal-eyebrow">VAMOS CONVERSAR?</p><h2 id="modal-title">Seu carinho chega até aqui.</h2><p class="modal-intro">Tem uma dúvida sobre os arquivos ou sobre como começar? Prepare sua mensagem para o atendimento.</p><form class="contact-form"><label for="contact-name">Seu nome</label><input id="contact-name" name="name" placeholder="Como podemos te chamar?" required/><label for="contact-email">Seu e-mail</label><input type="email" id="contact-email" name="email" placeholder="voce@exemplo.com" required/><label for="contact-message">Sua mensagem</label><textarea id="contact-message" name="message" rows="4" placeholder="Conte como podemos ajudar..." required></textarea><p class="form-note">Esta é uma prévia do site. O canal de atendimento ainda será conectado.</p><button class="button button-primary" type="submit">Preparar mensagem ${icon('mail')}</button><p class="contact-result" role="status"></p></form>`);
}
function resetFilters(){activeCategory='';search='';favoritesOnly=false;renderProducts();}
document.addEventListener('click',e=>{
  const button=e.target.closest('button,a');
  if(!button)return;
  if(button.matches('[data-add]'))addToCart(Number(button.dataset.add));
  if(button.matches('[data-favorite]')){const id=Number(button.dataset.favorite);favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];save();renderProducts();}
  if(button.matches('[data-modal]'))showInfo(button.dataset.modal);
  if(button.matches('[data-cart]'))showCart();
  if(button.matches('[data-product]'))showProduct(Number(button.dataset.product));
  if(button.matches('.modal-close'))closeModal();
  if(button.matches('[data-category]')){activeCategory=activeCategory===button.dataset.category?'':button.dataset.category;search='';favoritesOnly=false;renderProducts();document.querySelector('#catalogo').scrollIntoView({behavior:'smooth',block:'start'});}
  if(button.matches('[data-reset]'))resetFilters();
  if(button.matches('[data-all-categories]')){resetFilters();document.querySelector('.category-track').scrollTo({left:0,behavior:'smooth'});document.querySelector('#catalogo').scrollIntoView({behavior:'smooth'});}
  if(button.matches('[data-favorites]')){favoritesOnly=true;activeCategory='';search='';renderProducts();document.querySelector('#catalogo').scrollIntoView({behavior:'smooth'});}
  if(button.matches('[data-continue]')){closeModal();resetFilters();document.querySelector('#catalogo').scrollIntoView({behavior:'smooth'});}
  if(button.matches('[data-slide]')){const track=document.querySelector('.product-track');const direction=Number(button.dataset.slide);if(track.scrollWidth<=track.clientWidth+2&&track.children.length>1){if(direction>0)track.append(track.firstElementChild);else track.prepend(track.lastElementChild);}else track.scrollBy({left:direction*(track.querySelector('.product-card')?.getBoundingClientRect().width+20||300),behavior:'smooth'});}
  if(button.matches('[data-category-page]')){const track=document.querySelector('.category-track');track.scrollTo({left:Number(button.dataset.categoryPage)*track.clientWidth,behavior:'smooth'});}
  if(button.matches('[data-suggest]')){search=button.dataset.suggest;activeCategory='';favoritesOnly=false;closeModal();renderProducts();document.querySelector('#catalogo').scrollIntoView({behavior:'smooth'});}
  if(button.matches('[data-qty]')){const item=cart.find(x=>x.id===Number(button.dataset.qty));item.qty+=Number(button.dataset.change);cart=cart.filter(x=>x.qty>0);save();updateCartCount();showCart();}
  if(button.matches('[data-remove]')){cart=cart.filter(x=>x.id!==Number(button.dataset.remove));save();updateCartCount();showCart();}
  if(button.matches('[data-checkout]')){document.querySelector('.modal-content').innerHTML=`<p class="modal-eyebrow">SEU PEDIDO</p><h2 id="modal-title">Tudo pronto para criar. ♡</h2><p class="modal-intro">Seu carrinho está salvo neste navegador. Esta loja está em fase de apresentação e os pagamentos ainda não estão disponíveis.</p><p>Seus arquivos escolhidos continuam no carrinho para quando o atendimento e o pagamento estiverem conectados.</p><button class="button button-primary" data-cart>Voltar ao meu carrinho ${icon('arrow')}</button>`;}
  if(button.matches('.menu-toggle')){const nav=document.querySelector('.mobile-nav');nav.hidden=!nav.hidden;button.setAttribute('aria-expanded',String(!nav.hidden));button.innerHTML=icon(nav.hidden?'menu':'close');}
  if(button.closest('.mobile-nav')){document.querySelector('.mobile-nav').hidden=true;document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');document.querySelector('.menu-toggle').innerHTML=icon('menu');}
});
document.querySelector('.modal-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
document.addEventListener('keydown',e=>{
  const backdrop=document.querySelector('.modal-backdrop');if(backdrop.hidden)return;
  if(e.key==='Escape')closeModal();
  if(e.key==='Tab'){const focusable=[...document.querySelector('.modal').querySelectorAll('button,a,input,textarea')].filter(x=>!x.disabled);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
document.addEventListener('submit',e=>{
  if(e.target.matches('.search-form')){e.preventDefault();search=new FormData(e.target).get('q').trim();activeCategory='';favoritesOnly=false;closeModal();renderProducts();document.querySelector('#catalogo').scrollIntoView({behavior:'smooth'});}
  if(e.target.matches('.contact-form')){e.preventDefault();const data=new FormData(e.target);localStorage.setItem('afeto-contact-draft',JSON.stringify(Object.fromEntries(data)));document.querySelector('.contact-result').textContent='Mensagem preparada e salva neste navegador. O envio será habilitado quando o atendimento for conectado.';}
});
document.querySelector('.category-track').addEventListener('scroll',e=>{const page=e.target.scrollLeft>40?1:0;document.querySelectorAll('.category-dots button').forEach((el,i)=>el.classList.toggle('active',i===page));},{passive:true});
renderProducts();

// Links do header das outras páginas: /?modal=about e /?modal=contact abrem o mesmo modal da home.
{const modal=new URLSearchParams(location.search).get('modal');if(modal==='about'||modal==='contact')showInfo(modal);}
