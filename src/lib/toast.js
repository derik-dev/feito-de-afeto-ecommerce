import { icon } from './icons.js';

// Mensagem rápida no rodapé (usa a classe .toast que já existe em style.css).
let timer;
export function toast(texto) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.innerHTML = `${icon('check')}<span></span>`;
  el.querySelector('span').textContent = texto; // textContent: seguro contra HTML
  el.classList.add('visible');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('visible'), 3200);
}
