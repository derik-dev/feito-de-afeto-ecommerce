// Peças visuais reutilizadas em todas as telas do painel: ícones, avisos (toast) e janelas (modais).
import { escapeHtml } from '../lib/format.js';

export const esc = escapeHtml;

// ── Ícones (traço simples, herdam a cor do texto) ──
const ICONES = {
  inicio: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  caixa: '<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9L12 3Z"/><path d="M12 12 3.800 7.600M12 12l8.200-4.400M12 12v9"/>',
  pasta: '<path d="M3 7.500A2.500 2.500 0 0 1 5.500 5h4l2 2.500h7A2.500 2.500 0 0 1 21 10v7.500A2.500 2.500 0 0 1 18.500 20h-13A2.500 2.500 0 0 1 3 17.500v-10Z"/>',
  usuario: '<circle cx="12" cy="8" r="3.800"/><path d="M4.500 20c.800-3.800 3.800-5.800 7.500-5.800s6.700 2 7.500 5.800"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  editar: '<path d="M4 20h4l10.500-10.500a2.100 2.100 0 0 0-3-3L5 17v3Z"/><path d="m13.500 7.500 3 3"/>',
  copiar: '<rect x="8.500" y="8.500" width="11" height="11" rx="2.200"/><path d="M15.500 8.500V6.700a2.200 2.200 0 0 0-2.200-2.200H6.700a2.200 2.200 0 0 0-2.200 2.200v6.600a2.200 2.200 0 0 0 2.200 2.200h1.800"/>',
  lixo: '<path d="M4.500 7h15M9.500 7V5a1.500 1.500 0 0 1 1.500-1.500h2A1.500 1.500 0 0 1 14.500 5v2M6.500 7l.8 12a1.500 1.500 0 0 0 1.500 1.400h6.400a1.500 1.500 0 0 0 1.500-1.400l.8-12"/><path d="M10 11v5M14 11v5"/>',
  buscar: '<circle cx="11" cy="11" r="6.500"/><path d="m16 16 4.500 4.500"/>',
  imagem: '<rect x="3.500" y="4.500" width="17" height="15" rx="2.500"/><circle cx="9" cy="10" r="1.600"/><path d="m4 17 4.500-4.500 3.500 3.500 2.500-2.500L20 17"/>',
  enviar: '<path d="M12 16V5M7.500 9.500 12 5l4.500 4.500"/><path d="M4.500 15v2.500A2 2 0 0 0 6.500 19.500h11a2 2 0 0 0 2-2V15"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  ok: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
  voltar: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  externo: '<path d="M14 4.500h5.500V10M19.500 4.500 11 13"/><path d="M18 14v3.500a2 2 0 0 1-2 2H6.500a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H10"/>',
  sair: '<path d="M14 4.500H7A2 2 0 0 0 5 6.500v11a2 2 0 0 0 2 2h7"/><path d="M10 12h10M17 8.500l3.500 3.500-3.500 3.500"/>',
  estrela: '<path d="m12 4 2.400 5 5.500.700-4 3.800 1 5.400-4.900-2.700-4.900 2.700 1-5.400-4-3.800 5.500-.700L12 4Z"/>',
  olho: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z"/><circle cx="12" cy="12" r="2.800"/>',
  info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5.500M12 7.800v.2"/>',
  alerta: '<path d="M12 4 3 19.500h18L12 4Z"/><path d="M12 10v4.500M12 17.200v.2"/>',
  cadeado: '<rect x="5" y="10.500" width="14" height="9.500" rx="2.200"/><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500"/>',
  coracao: '<path d="M12 20.500 4.500 13a4.600 4.600 0 0 1 6.500-6.500L12 7.500l1-1A4.600 4.600 0 0 1 19.500 13L12 20.500Z"/>',
  file: '<path d="M6.500 3h8l4.500 4.500V20a1.500 1.500 0 0 1-1.500 1.500h-11A1.500 1.500 0 0 1 5 20V4.500A1.500 1.500 0 0 1 6.500 3Z"/><path d="M14.500 3v4.500H19M8.500 13h7M8.500 16.500h5"/>',
  dinheiro: '<rect x="3" y="6.500" width="18" height="11" rx="2.200"/><circle cx="12" cy="12" r="2.600"/><path d="M6.500 12h.01M17.500 12h.01"/>',
  mover:'<path d="M9 6.500v.01M15 6.500v.01M9 12v.01M15 12v.01M9 17.500v.01M15 17.500v.01" stroke-width="3.200"/>',
};
export const icone = (nome, tam = 20) =>
  `<svg class="ic" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] ?? ''}</svg>`;

// ── Avisos rápidos no canto da tela ──
let temporizador;
export function toast(texto, tipo = 'ok') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.className = `toast ${tipo}`;
  el.innerHTML = `${icone(tipo === 'erro' ? 'alerta' : 'ok', 18)}<span></span>`;
  el.querySelector('span').textContent = texto;
  requestAnimationFrame(() => el.classList.add('visivel'));
  clearTimeout(temporizador);
  temporizador = setTimeout(() => el.classList.remove('visivel'), 4200);
}

// ── Janelas (modais) ──
// Cria a janela, devolve uma Promise e cuida de foco, tecla Esc e clique fora.
function abrirModal(html, aoAbrir) {
  const anterior = document.activeElement;
  return new Promise(resolver => {
    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.append(fundo);
    document.body.classList.add('modal-aberto');
    const fechar = valor => {
      document.removeEventListener('keydown', teclas);
      fundo.remove();
      document.body.classList.remove('modal-aberto');
      anterior?.focus?.();
      resolver(valor);
    };
    const teclas = e => {
      if (e.key === 'Escape') fechar(null);
      if (e.key === 'Tab') { // mantém o foco dentro da janela
        const foco = [...fundo.querySelectorAll('button, input, select, textarea, a[href]')].filter(x => !x.disabled);
        if (!foco.length) return;
        if (e.shiftKey && document.activeElement === foco[0]) { e.preventDefault(); foco.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === foco.at(-1)) { e.preventDefault(); foco[0].focus(); }
      }
    };
    document.addEventListener('keydown', teclas);
    fundo.addEventListener('mousedown', e => { if (e.target === fundo) fechar(null); });
    aoAbrir(fundo, fechar);
  });
}

/** Pergunta "tem certeza?". Devolve true (confirmou) ou false. */
export function confirmar({ titulo, texto = '', botao = 'Confirmar', perigo = false }) {
  return abrirModal(`<h2>${esc(titulo)}</h2>${texto ? `<p>${esc(texto).replace(/\n/g, '<br>')}</p>` : ''}
    <div class="modal-botoes"><button type="button" class="botao sec" data-r="nao">Cancelar</button><button type="button" class="botao ${perigo ? 'perigo-cheio' : 'prim'}" data-r="sim">${esc(botao)}</button></div>`,
  (fundo, fechar) => {
    fundo.addEventListener('click', e => { const r = e.target.closest('[data-r]')?.dataset.r; if (r) fechar(r === 'sim'); });
    fundo.querySelector(perigo ? '[data-r=nao]' : '[data-r=sim]').focus(); // em ações perigosas o foco começa em "Cancelar"
  }).then(v => v === true);
}

/** Pede um texto (nome de categoria etc.). Devolve o texto digitado ou null se cancelou. */
export function perguntar({ titulo, texto = '', rotulo, valor = '', botao = 'Salvar', exemplo = '', maximo = 60 }) {
  return abrirModal(`<h2>${esc(titulo)}</h2>${texto ? `<p>${esc(texto)}</p>` : ''}
    <form><label for="modal-campo">${esc(rotulo)}</label><input id="modal-campo" type="text" maxlength="${maximo}" value="${esc(valor)}" placeholder="${esc(exemplo)}" autocomplete="off">
    <p class="erro-campo" id="modal-erro" hidden>Escreva um nome.</p>
    <div class="modal-botoes"><button type="button" class="botao sec" data-r="nao">Cancelar</button><button type="submit" class="botao prim">${esc(botao)}</button></div></form>`,
  (fundo, fechar) => {
    const campo = fundo.querySelector('#modal-campo');
    campo.focus(); campo.select();
    fundo.querySelector('[data-r=nao]').addEventListener('click', () => fechar(null));
    fundo.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const v = campo.value.trim();
      if (!v) { fundo.querySelector('#modal-erro').hidden = false; return campo.focus(); }
      fechar(v);
    });
  });
}

// ── Pequenos ajudantes de formato ──
export const numero = t => { const s = String(t ?? '').trim(); if (s === '') return null; const n = Number(s.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
export const paraCampo = n => (n == null || n === '' ? '' : Number(n).toFixed(2).replace('.', ','));   // 39.9 -> "39,90"
export const reais = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** 1536000 -> "1,5 MB" */
export const tamanho = b => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
