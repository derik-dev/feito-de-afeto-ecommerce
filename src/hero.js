// Um slide contém sua imagem e seu texto: a troca é sempre sincronizada.
export function iniciarHero(intervalo = 12000) {
  const hero = document.querySelector('.hv');
  if (!hero) return;
  const slides = [...hero.querySelectorAll('.hv-slide')];
  if (slides.length < 2) return;
  const status = hero.querySelector('[data-hv-status]');
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)');
  let atual = 0, destino = 0, pedido = 0, timer;
  let pausado = reduzir.matches, foco = false, visivel = true;

  const parar = () => { clearTimeout(timer); timer = undefined; };
  const iniciar = () => {
    parar();
    if (!pausado && !foco && !document.hidden && visivel) {
      timer = setTimeout(() => ir(atual + 1), intervalo);
    }
  };
  const ir = async (indice, manual = false) => {
    parar();
    destino = (indice + slides.length) % slides.length;
    const alvo = destino, versao = ++pedido;
    // A próxima imagem termina de carregar antes de o slide atual desaparecer.
    try {
      const imagem = slides[alvo].querySelector('img');
      imagem.loading = 'eager';
      await imagem.decode();
    }
    catch { if (versao === pedido) iniciar(); return; }
    if (versao !== pedido) return;
    atual = alvo;
    slides.forEach((slide, i) => {
      const ativo = i === atual;
      slide.classList.toggle('is-active', ativo);
      slide.inert = !ativo;
      slide.setAttribute('aria-hidden', String(!ativo));
    });
    if (manual) status.textContent = slides[atual].getAttribute('aria-label');
    iniciar();
  };
  hero.addEventListener('focusin', () => { foco = true; parar(); });
  hero.addEventListener('focusout', e => { foco = hero.contains(e.relatedTarget); iniciar(); });
  hero.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    ir(destino + (e.key === 'ArrowRight' ? 1 : -1), true);
  });
  document.addEventListener('visibilitychange', iniciar);
  reduzir.addEventListener('change', () => {
    pausado = reduzir.matches;
    iniciar();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entrada]) => { visivel = entrada.isIntersecting; iniciar(); }, { threshold: 0.15 }).observe(hero);
  }
  let toque;
  hero.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' && !e.target.closest('a, button')) toque = { x: e.clientX, y: e.clientY };
  });
  hero.addEventListener('pointerup', e => {
    if (!toque || e.pointerType !== 'touch') return;
    const dx = e.clientX - toque.x, dy = e.clientY - toque.y;
    toque = undefined;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) ir(destino + (dx < 0 ? 1 : -1), true);
  });
  hero.addEventListener('pointercancel', () => { toque = undefined; });
  iniciar();
}
