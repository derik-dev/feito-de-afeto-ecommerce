import { icon } from '../lib/icons.js';

/**
 * Carrossel de banners do topo da home.
 * Cada slide reaproveita as classes .hero* da home original (src/style.css), então a
 * agenda floral continua idêntica. Os slides ficam empilhados na mesma célula de uma grid
 * (veja .hc-track em catalogo.css) e só o ativo aparece (fade).
 *
 * @typedef {Object} Slide
 * @property {string} imagem        imagem principal
 * @property {string} [imagemMobile] versão para telas pequenas
 * @property {string} alt
 * @property {string} eyebrow
 * @property {string} titulo        HTML (use <em> para a palavra em itálico rosa)
 * @property {string} texto
 * @property {string} botoes        HTML dos botões do slide
 * @property {boolean} [rabisco]    mostra o traço desenhado à mão do slide original
 */

const RABISCO = '<div class="handdrawn"><svg viewBox="0 0 270 50" aria-hidden="true"><path d="M3 30C69 8 115 57 207 20M221 18c-18-21-29 1 5 21 31-31 9-43-5-21"/></svg></div>';

export function HeroCarousel(slides) {
  const varios = slides.length > 1; // com 1 slide só, não há setas, bolinhas nem troca
  return `
  <section class="hc" aria-roledescription="carousel" aria-label="Destaques da loja">
    <div class="hc-track" aria-live="off">
      ${slides.map((s, i) => `
      <article class="hero hc-slide${i === 0 ? ' is-active' : ''}" aria-roledescription="slide" aria-label="${i + 1} de ${slides.length}">
        <picture>${s.imagemMobile ? `<source media="(max-width: 700px)" srcset="${s.imagemMobile}" />` : ''}<img class="hero-image" src="${s.imagem}" alt="${s.alt}"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'} /></picture>
        <div class="hero-shade"></div>
        <div class="hero-content">
          <p class="eyebrow">${s.eyebrow}</p>
          <!-- Só o primeiro título é h1; nos outros slides ele é anunciado como nível 2. -->
          <h1${i === 0 ? '' : ' role="heading" aria-level="2"'}>${s.titulo}</h1>
          ${s.rabisco ? RABISCO : ''}
          <p class="hero-description">${s.texto}</p>
          <div class="hero-buttons">${s.botoes}</div>
        </div>
      </article>`).join('')}
    </div>
    ${varios ? `<button type="button" class="hc-arrow hc-prev" data-hc="-1" aria-label="Slide anterior">${icon('chevron', 'flipped')}</button>
    <button type="button" class="hc-arrow hc-next" data-hc="1" aria-label="Próximo slide">${icon('chevron')}</button>
    <div class="hc-dots">${slides.map((_, i) => `<button type="button" data-dot="${i}" aria-label="Ir para o slide ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')}</div>` : ''}
  </section>`;
}

/** Liga setas, bolinhas e a troca automática (5 s). */
export function iniciarHeroCarousel(raiz, intervalo = 5000) {
  const slides = [...raiz.querySelectorAll('.hc-slide')];
  if (slides.length < 2) return; // nada para girar
  const bolinhas = [...raiz.querySelectorAll('[data-dot]')];
  let atual = 0;
  let timer;

  const ir = i => {
    atual = (i + slides.length) % slides.length;
    slides.forEach((s, j) => {
      const ativo = j === atual;
      s.classList.toggle('is-active', ativo);
      s.inert = !ativo; // slide escondido não recebe foco nem leitor de tela
    });
    bolinhas.forEach((b, j) => b.toggleAttribute('aria-current', j === atual));
  };
  // Troca automática: pausa com o mouse/foco em cima, com a aba escondida ou se o usuário pediu menos movimento.
  const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parar = () => { clearInterval(timer); timer = undefined; };
  const iniciar = () => { if (!reduzMovimento && !timer) timer = setInterval(() => ir(atual + 1), intervalo); };

  raiz.querySelectorAll('[data-hc]').forEach(b => b.addEventListener('click', () => ir(atual + Number(b.dataset.hc))));
  bolinhas.forEach(b => b.addEventListener('click', () => ir(Number(b.dataset.dot))));
  raiz.addEventListener('mouseenter', parar);
  raiz.addEventListener('mouseleave', iniciar);
  raiz.addEventListener('focusin', parar);
  raiz.addEventListener('focusout', iniciar);
  document.addEventListener('visibilitychange', () => (document.hidden ? parar() : iniciar()));

  ir(0);
  iniciar();
}
