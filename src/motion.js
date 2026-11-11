// Efeitos de movimento do site todo (sem biblioteca). O CSS dos efeitos está em src/motion.css.
// Tudo é desligado quando o visitante pede "reduzir movimento" no sistema.

const reduzMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Elementos que "aparecem" ao entrar na tela, e os grupos cujos filhos entram em cascata.
const REVELAR = '.car, .cr, .atelier-banner, .rv, .pd-det, .pd-gal';
const CASCATA = '.car-track, .cr-list, .rv-list, .bb-trust';

/** Numera os filhos (--i) para o CSS atrasar cada um um pouquinho: efeito de cascata. */
export function escalonar(seletor, limite = 8) {
  document.querySelectorAll(seletor).forEach((el, i) => el.style.setProperty('--i', Math.min(i, limite)));
}

/**
 * Liga os efeitos. Chame depois de montar a página.
 * - Adiciona a classe `mv` no <html>: só então o CSS esconde os elementos que vão aparecer ao rolar
 *   (assim, sem JS ou sem movimento, a página fica 100% visível).
 * - IntersectionObserver avisa quando o elemento entra na tela; aí colocamos `is-in` e o CSS anima.
 */
export function iniciarMovimento() {
  if (reduzMovimento() || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('mv');

  document.querySelectorAll(REVELAR).forEach(el => el.setAttribute('data-reveal', ''));
  document.querySelectorAll(CASCATA).forEach(grupo => {
    grupo.setAttribute('data-stagger', '');
    [...grupo.children].forEach((filho, i) => filho.style.setProperty('--i', Math.min(i, 6)));
  });

  const observador = new IntersectionObserver(entradas => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      observador.unobserve(e.target); // anima só na primeira vez
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const alvos = document.querySelectorAll('[data-reveal], [data-stagger]');
  alvos.forEach(el => observador.observe(el));

  // Rede de segurança: se algo não disparar, mostra tudo depois de 4 s (nunca deixa conteúdo invisível).
  setTimeout(() => alvos.forEach(el => el.classList.add('is-in')), 4000);
}
