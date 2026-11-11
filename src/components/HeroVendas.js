// As artes fornecidas mantêm a proporção 3:1. Cada slide reúne imagem, texto e destino.
import { urlCatalogo, escapeHtml } from '../lib/format.js';
import { icon } from '../lib/icons.js';

const base = `${import.meta.env.BASE_URL}images/`;
const ORNAMENTOS = {
  jardim: '<svg viewBox="0 0 170 24" fill="none"><path d="M4 19C35 18 57 3 88 11s48 7 78-7M35 15C28 3 41 0 46 10M58 9C53 21 67 22 73 10M92 12C94 1 106 2 108 15M120 16C123 5 136 5 139 13"/></svg>',
  agendamento: '<svg viewBox="0 0 170 24" fill="none"><path d="M4 12h61m40 0h61M85 2l4 6 7 4-7 4-4 6-4-6-7-4 7-4 4-6Z"/><circle cx="64" cy="12" r="2"/><circle cx="106" cy="12" r="2"/></svg>',
  religiosas: '<svg viewBox="0 0 170 24" fill="none"><path d="M4 12h52c10 0 11-8 18-8m92 8h-52c-10 0-11-8-18-8M72 12l13-9 13 9-13 9-13-9Z"/><circle cx="85" cy="12" r="2"/></svg>',
};
const SLIDES = [
  {
    tema: 'jardim', categoria: 'Jardim Encantado', imagem: 'hero-jardim-encantado.webp',
    alt: 'Agendas florais Jardim Encantado 2027 com rosas azuis, hortênsias verdes, flores lilás e rosas vermelhas',
    chamada: 'COLEÇÃO FLORAL · 2027',
    titulo: '<span>Jardim</span> <em>Encantado</em>',
    texto: 'Um ano para florescer, com delicadeza em cada página.',
  },
  {
    tema: 'agendamento', categoria: 'Agendamento', imagem: 'hero-agendamentos.webp',
    alt: 'Coleção de agendas de agendamento para profissionais de beleza e nutrição, em capas pretas, douradas e florais',
    chamada: 'AGENDAS PROFISSIONAIS',
    titulo: '<span>Sua rotina,</span> <em>em ordem</em>',
    texto: 'Horários e clientes em ordem. Mais tempo para o seu negócio.',
  },
  {
    tema: 'religiosas', categoria: 'Religiosas', imagem: 'hero-religiosas.webp',
    alt: 'Agendas religiosas 2027 de Nossa Senhora Aparecida e Nossa Senhora de Fátima em cenário com terço e luz de vitral',
    chamada: 'AGENDAS RELIGIOSAS · 2027',
    titulo: '<span>Fé em cada</span> <em>página</em>',
    texto: 'Planeje seus dias com fé, inspiração e gratidão.',
  },
];

function renderSlide(s, i, { total = SLIDES.length, interno = false } = {}) {
  return `
      <article class="hv-slide hv-slide--${s.tema}${i === 0 ? ' is-active' : ''}"
        role="group" aria-roledescription="slide" aria-label="${i + 1} de ${total}: ${escapeHtml(s.categoria)}"
        aria-hidden="${i !== 0}"${i === 0 ? '' : ' inert'}>
        <img class="hv-img" src="${base}${s.imagem}" width="2172" height="724"
          alt="${escapeHtml(s.alt)}" decoding="async" draggable="false"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'} />
        <div class="hv-copy">
          <p class="hv-eyebrow">${s.chamada}</p>
          <h2 class="hv-title">${s.titulo}</h2>
          <div class="hv-flourish" aria-hidden="true">${ORNAMENTOS[s.tema]}</div>
          <p class="hv-sub">${s.texto}</p>
          ${interno ? '' : `<div class="hv-actions">
            <a class="button hv-cta" href="${urlCatalogo({ categoria: s.categoria })}">Ver coleção ${icon('arrow')}</a>
            <button type="button" class="hv-link" data-modal="how">Como funciona?</button>
          </div>`}
        </div>
      </article>`;
}

export function HeroVendas() {
  return `
  <section class="hv hv--home" aria-roledescription="carrossel" aria-labelledby="hv-titulo">
    <h1 class="sr-only" id="hv-titulo">Agendas digitais Feito de Afeto</h1>
    <div class="hv-track">
      ${/* Hero fixo: só o Jardim Encantado (sem troca de slides). Os outros slides seguem no código para as páginas de coleção. */''}
      ${renderSlide(SLIDES[0], 0, { total: 1 })}
    </div>
    <p class="sr-only" role="status" aria-live="polite" data-hv-status></p>
  </section>`;
}

/** Na página interna, apresenta somente a coleção escolhida, com a mesma arte da home. */
export function HeroCategoria(categoria) {
  const slide = SLIDES.find(s => s.categoria === categoria);
  if (!slide) return '';
  return `<section class="hv hv--categoria" aria-label="Coleção ${escapeHtml(slide.categoria)}">
    <div class="hv-track">${renderSlide(slide, 0, { total: 1, interno: true })}</div>
  </section>`;
}
