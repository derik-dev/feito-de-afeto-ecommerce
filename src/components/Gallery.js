import { escapeHtml } from '../lib/format.js';
import { icon } from '../lib/icons.js';

/**
 * Galeria do produto (padrão de loja grande):
 *  - miniaturas à esquerda (computador) e bolinhas + deslizar com o dedo (celular);
 *  - zoom que acompanha o mouse (computador);
 *  - clique/toque na foto abre em tela cheia, com setas e tecla Esc.
 * As fotos ficam lado a lado numa faixa com scroll-snap; as miniaturas e as bolinhas só rolam essa faixa.
 */
export function Gallery(imagens) {
  const varias = imagens.length > 1;
  return `
  <div class="gal${varias ? '' : ' gal--single'}" data-gallery>
    ${varias ? `<ul class="gal-thumbs" aria-label="Miniaturas do produto">
      ${imagens.map((img, i) => `<li><button type="button" class="gal-thumb" data-indice="${i}" aria-label="Ver foto ${i + 1} de ${imagens.length}" aria-current="${i === 0}"><img src="${img.src}" alt="" width="64" height="80" /></button></li>`).join('')}
    </ul>` : ''}
    <div class="gal-main">
      <div class="gal-slides" tabindex="0" aria-label="Fotos do produto">
        ${imagens.map((img, i) => `<figure class="gal-slide"><img src="${img.src}" alt="${escapeHtml(img.alt)}" width="640" height="800"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'} draggable="false" /></figure>`).join('')}
      </div>
      <button type="button" class="gal-expandir" data-expandir aria-label="Ver foto em tela cheia">${icon('search')}<span>Ampliar</span></button>
      ${varias ? `<div class="gal-pontos" aria-hidden="true">${imagens.map((_, i) => `<span${i === 0 ? ' class="on"' : ''}></span>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

export function iniciarGallery(raiz, imagens) {
  const faixa = raiz.querySelector('.gal-slides');
  const miniaturas = [...raiz.querySelectorAll('.gal-thumb')];
  const pontos = [...raiz.querySelectorAll('.gal-pontos span')];
  let atual = 0;

  const marcar = i => {
    atual = i;
    miniaturas.forEach((m, j) => m.setAttribute('aria-current', String(i === j)));
    pontos.forEach((p, j) => p.classList.toggle('on', i === j));
  };
  const irPara = (i, suave = true) => {
    const j = (i + imagens.length) % imagens.length;
    faixa.scrollTo({ left: j * faixa.clientWidth, behavior: suave ? 'smooth' : 'instant' });
    marcar(j);
  };

  miniaturas.forEach((m, i) => {
    m.addEventListener('click', () => irPara(i));
    m.addEventListener('mouseenter', () => irPara(i, false)); // passar o mouse já troca a foto (como no Mercado Livre)
  });
  // Deslizar com o dedo: descobre em qual foto parou
  let espera;
  faixa.addEventListener('scroll', () => {
    clearTimeout(espera);
    espera = setTimeout(() => marcar(Math.round(faixa.scrollLeft / faixa.clientWidth)), 60);
  }, { passive: true });
  faixa.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); irPara(atual + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); irPara(atual - 1); }
  });

  // Zoom que acompanha o mouse (só em telas com mouse).
  // Só liga depois de o mouse ficar parado em cima da foto por ATRASO_ZOOM_MS (2 segundos),
  // para não dar zoom quando a pessoa só passa o mouse por cima. Mude o número abaixo para ajustar.
  const ATRASO_ZOOM_MS = 2000;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const principal = raiz.querySelector('.gal-main');
    let espera = null, pronto = false;
    const mover = e => {
      const img = faixa.children[atual]?.querySelector('img');
      if (!img) return;
      const r = principal.getBoundingClientRect();
      img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      if (pronto) img.classList.add('zoom');
    };
    principal.addEventListener('mouseenter', () => {
      pronto = false;
      clearTimeout(espera);
      espera = setTimeout(() => { pronto = true; faixa.children[atual]?.querySelector('img')?.classList.add('zoom'); }, ATRASO_ZOOM_MS);
    });
    principal.addEventListener('mousemove', mover);
    principal.addEventListener('mouseleave', () => {
      clearTimeout(espera);
      pronto = false;
      faixa.querySelectorAll('img.zoom').forEach(i => i.classList.remove('zoom'));
    });
  }

  // Tela cheia
  const abrir = () => {
    const fundo = document.createElement('div');
    fundo.className = 'lb';
    fundo.setAttribute('role', 'dialog');
    fundo.setAttribute('aria-modal', 'true');
    fundo.setAttribute('aria-label', 'Foto ampliada');
    let i = atual;
    const desenhar = () => {
      fundo.innerHTML = `<button type="button" class="lb-x" data-fechar aria-label="Fechar">${icon('close')}</button>
        ${imagens.length > 1 ? `<button type="button" class="lb-seta lb-ant" data-ant aria-label="Foto anterior">${icon('chevron', 'flipped')}</button><button type="button" class="lb-seta lb-prox" data-prox aria-label="Próxima foto">${icon('chevron')}</button>` : ''}
        <img src="${imagens[i].src}" alt="${escapeHtml(imagens[i].alt)}"><p class="lb-n">${i + 1} / ${imagens.length}</p>`;
      fundo.querySelector('[data-fechar]').focus();
    };
    const fechar = () => { document.removeEventListener('keydown', teclas); fundo.remove(); document.body.classList.remove('modal-open'); irPara(i, false); raiz.querySelector('[data-expandir]').focus(); };
    const teclas = e => {
      if (e.key === 'Escape') fechar();
      if (e.key === 'ArrowRight') { i = (i + 1) % imagens.length; desenhar(); }
      if (e.key === 'ArrowLeft') { i = (i - 1 + imagens.length) % imagens.length; desenhar(); }
    };
    fundo.addEventListener('click', e => {
      if (e.target === fundo || e.target.closest('[data-fechar]')) fechar();
      else if (e.target.closest('[data-prox]')) { i = (i + 1) % imagens.length; desenhar(); }
      else if (e.target.closest('[data-ant]')) { i = (i - 1 + imagens.length) % imagens.length; desenhar(); }
    });
    document.addEventListener('keydown', teclas);
    document.body.append(fundo);
    document.body.classList.add('modal-open');
    desenhar();
  };
  raiz.querySelector('[data-expandir]').addEventListener('click', abrir);
  faixa.addEventListener('click', abrir);
}
