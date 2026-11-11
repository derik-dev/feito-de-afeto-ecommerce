// Página inicial (/) — estrutura de loja estilo Mercado Livre:
// Duas prateleiras de produtos → um banner de categoria, repetindo até as três coleções.
import { iniciarMovimento } from '../motion.js';
import { renderHeader, renderFooter, iniciarHeader } from '../components/layout.js';
import { HeroVendas } from '../components/HeroVendas.js';
import { iniciarHero } from '../hero.js';
import { Carousel, iniciarCarousel } from '../components/Carousel.js';
import { ProductCard } from '../components/ProductCard.js';
import { CategoryBanners } from '../components/CategoryRow.js';
import { abrirModal } from '../components/InfoModal.js';
import { icon } from '../lib/icons.js';
import { urlSite, urlCatalogo } from '../lib/format.js';
import { favoritos } from '../lib/storage.js';
import { temDesconto, percentualDesconto, novosPrimeiro } from '../lib/filtros.js';
import { listarProdutos } from '../services/produtos.js';

const imagens = `${import.meta.env.BASE_URL}images/`;

const palavrasChave = ['Agendas 2027', 'Agendamento', 'Religiosas', 'Jardim Encantado', 'Personalizadas', 'Download imediato', 'Pronto para imprimir', 'Feito com afeto'];

// ── Seleção dos produtos de cada prateleira ─────────────────────────────────
// São funções simples sobre a lista; com o Supabase você pode trocá-las por consultas.
const maiorDesconto = (a, b) => percentualDesconto(b) - percentualDesconto(a);
// Novidades: os cadastrados por último primeiro e, para completar, os mais recentes entre os demais.
const novidades = produtos => [...produtos].sort((a, b) => (b.recencia ?? 0) - (a.recencia ?? 0)).slice(0, 10);
const prateleiras = produtos => [
  { titulo: 'Ofertas do <em>dia</em>', verTodas: urlCatalogo({ desconto: '1' }), selos: true,
    itens: produtos.filter(temDesconto).sort(maiorDesconto).slice(0, 10) },
  { titulo: 'Agendas para <em>profissionais</em>', verTodas: urlCatalogo({ categoria: 'Agendamento' }),
    itens: produtos.filter(p => p.categoria === 'Agendamento').sort((a, b) => novosPrimeiro(a, b) || (b.prioridade ?? 0) - (a.prioridade ?? 0) || b.vendidos - a.vendidos) },
  { titulo: 'Jardim <em>Encantado</em>', verTodas: urlCatalogo({ categoria: 'Jardim Encantado' }),
    itens: produtos.filter(p => p.categoria === 'Jardim Encantado').sort((a, b) => novosPrimeiro(a, b) || (b.prioridade ?? 0) - (a.prioridade ?? 0) || b.vendidos - a.vendidos) },
  { titulo: 'Agendas <em>religiosas</em>', verTodas: urlCatalogo({ categoria: 'Religiosas' }),
    itens: produtos.filter(p => p.categoria === 'Religiosas').sort((a, b) => novosPrimeiro(a, b) || (b.prioridade ?? 0) - (a.prioridade ?? 0) || b.vendidos - a.vendidos) },
  { titulo: 'Mais <em>vendidos</em>', verTodas: urlCatalogo({ ordem: 'mais-vendidos' }),
    itens: [...produtos].sort((a, b) => b.vendidos - a.vendidos).slice(0, 10) },
  { titulo: 'Agendas <em>2027</em>', verTodas: urlCatalogo({ q: 'agenda 2027' }),
    itens: produtos.filter(p => p.tags.includes('2027') && /agenda/i.test(p.titulo)) },
];

// ── Montagem da página ──────────────────────────────────────────────────────
const produtos = await listarProdutos();
const temNovo = produtos.some(p => p.novo);
const secaoNovidades = temNovo ? { titulo: 'Acabou de <em>chegar</em>', verTodas: urlCatalogo({ ordem: 'recentes' }), itens: novidades(produtos) } : null;
const secoes = prateleiras(produtos).filter(s => s.itens.length); // prateleira sem produto não aparece
const banners = CategoryBanners(produtos);
const blocoCategoria = html => html ? `<div class="home-sec home-category">${html}</div>` : '';

document.querySelector('#app').innerHTML = `
  ${renderHeader()}
  <main id="conteudo">
    ${HeroVendas()}
    <!-- Faixa azul de palavras-chave logo abaixo do hero -->
    <section class="kw-band" aria-label="Destaques da loja"><div class="kw-track"><ul>${palavrasChave.map(p => `<li>${p}</li>`).join('')}</ul><ul aria-hidden="true">${palavrasChave.map(p => `<li>${p}</li>`).join('')}</ul></div></section>
    <div class="container home-sections">
      ${secaoNovidades ? `<div class="home-sec">${Carousel({ titulo: secaoNovidades.titulo, verTodas: secaoNovidades.verTodas, itensHtml: secaoNovidades.itens.map(p => ProductCard(p, { favorito: favoritos.tem(p.id) })) })}</div>` : ''}
      ${secoes.map((s, i) => `<div class="home-sec">${Carousel({ titulo: s.titulo, verTodas: s.verTodas, itensHtml: s.itens.map(p => ProductCard(p, { favorito: favoritos.tem(p.id), selosDeOferta: s.selos })) })}</div>${(i + 1) % 2 === 0 ? blocoCategoria(banners[Math.floor(i / 2)]) : ''}`).join('')}
      ${banners.slice(Math.floor(secoes.length / 2)).map(blocoCategoria).join('')}
      <section class="atelier-banner" aria-label="Arquivos para o seu ateliê"><img src="${imagens}atelier.webp" alt="Materiais de encadernação, fitas e clips sobre uma base de corte rosa" loading="lazy"/><div class="atelier-title">${icon('brand')}<h2>Mais praticidade<br>para o <em>seu ateliê</em></h2></div><p>Arquivos pensados para quem<br>trabalha com papelaria personalizada,<br>encadernação e produtos criativos.</p></section>
    </div>
  </main>
  ${renderFooter()}`;

iniciarHeader();
iniciarHero(); // slides sincronizados do banner (src/hero.js)
iniciarMovimento(); // efeitos do resto da página (src/motion.js)
document.querySelectorAll('.car').forEach(iniciarCarousel);

// Cliques: favoritar nos cards e abrir os modais (botões com data-modal).
document.addEventListener('click', e => {
  const alvo = e.target.closest('button');
  if (!alvo) return;
  if (alvo.matches('[data-modal]')) abrirModal(alvo.dataset.modal);
  else if (alvo.matches('[data-favorite]')) {
    const ligado = favoritos.alternar(alvo.dataset.favorite);
    alvo.classList.toggle('is-favorite', ligado);
    alvo.setAttribute('aria-pressed', String(ligado));
    alvo.setAttribute('aria-label', alvo.getAttribute('aria-label').replace(/^(Adicionar aos|Remover dos)( favoritos)/, `${ligado ? 'Remover dos' : 'Adicionar aos'}$2`));
  }
});

// Links do header de outras páginas: /?modal=about | contact | how
const modal = new URLSearchParams(location.search).get('modal');
if (['about', 'contact', 'how'].includes(modal)) abrirModal(modal);
