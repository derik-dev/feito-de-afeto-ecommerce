// Sugestões de produtos enquanto a pessoa digita na busca do topo (vale em todas as páginas da loja).
// Mostra até 6 produtos (foto, nome, preço) e um link "Ver todos os resultados". Teclado: setas, Enter e Esc.
import { filtrarProdutos, FILTROS_VAZIOS } from '../lib/filtros.js';
import { listarProdutos } from '../services/produtos.js';
import { moeda, escapeHtml, urlProduto, urlCatalogo } from '../lib/format.js';

const MAX_SUGESTOES = 6;
const MINIMO_LETRAS = 2;
const ESPERA_MS = 120; // espera a pessoa parar um instante de digitar antes de buscar

export function iniciarBuscaAoVivo() {
  const form = document.querySelector('.hd-search');
  const campo = form?.querySelector('#busca-header');
  if (!form || !campo) return;

  const caixa = document.createElement('div');
  caixa.className = 'bs';
  caixa.id = 'bs-lista';
  caixa.setAttribute('role', 'listbox');
  caixa.setAttribute('aria-label', 'Sugestões de produtos');
  caixa.hidden = true;
  form.append(caixa);
  campo.setAttribute('role', 'combobox');
  campo.setAttribute('aria-autocomplete', 'list');
  campo.setAttribute('aria-controls', 'bs-lista');
  campo.setAttribute('aria-expanded', 'false');

  let ativo = -1, temporizador, produtos = null;
  const opcoes = () => [...caixa.querySelectorAll('[role=option]')];

  const fechar = () => {
    caixa.hidden = true;
    ativo = -1;
    campo.setAttribute('aria-expanded', 'false');
    campo.removeAttribute('aria-activedescendant');
  };
  const marcar = i => {
    const lista = opcoes();
    if (!lista.length) return;
    ativo = (i + lista.length) % lista.length;
    lista.forEach((o, j) => o.setAttribute('aria-selected', String(j === ativo)));
    campo.setAttribute('aria-activedescendant', lista[ativo].id);
    lista[ativo].scrollIntoView({ block: 'nearest' });
  };

  const desenhar = (q, achados) => {
    const lista = achados.slice(0, MAX_SUGESTOES);
    caixa.innerHTML = lista.length
      ? `${lista.map((p, i) => `<a class="bs-item" role="option" id="bs-op-${i}" aria-selected="false" href="${urlProduto(p.slug)}">
          <img src="${escapeHtml(p.imagens[0].src)}" alt="" width="40" height="50" loading="lazy">
          <span class="bs-info"><b>${escapeHtml(p.titulo)}</b><small>${escapeHtml(p.categoria)}</small></span>
          <strong>${moeda(p.preco)}</strong></a>`).join('')}
        <a class="bs-todos" href="${urlCatalogo({ q })}">Ver todos os resultados para “${escapeHtml(q)}”${achados.length > lista.length ? ` (${achados.length})` : ''}</a>`
      : `<p class="bs-vazio">Nenhum produto encontrado para “${escapeHtml(q)}”.</p><a class="bs-todos" href="${urlCatalogo({})}">Ver todo o catálogo</a>`;
    caixa.hidden = false;
    ativo = -1;
    campo.setAttribute('aria-expanded', 'true');
  };

  const buscar = async () => {
    const q = campo.value.trim();
    if (q.length < MINIMO_LETRAS) return fechar();
    produtos ??= await listarProdutos();
    if (campo.value.trim() !== q) return; // a pessoa já digitou mais: essa resposta ficou velha
    const norm = s => s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');
    const nq = norm(q);
    const achados = filtrarProdutos(produtos, { ...FILTROS_VAZIOS, q })
      // quem tem a palavra no TÍTULO vem antes de quem só tem na descrição ou nas etiquetas
      .sort((a, b) => Number(norm(b.titulo).includes(nq)) - Number(norm(a.titulo).includes(nq)));
    desenhar(q, achados);
  };

  campo.addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(buscar, ESPERA_MS); });
  campo.addEventListener('focus', () => { if (campo.value.trim().length >= MINIMO_LETRAS) buscar(); });
  campo.addEventListener('keydown', e => {
    if (caixa.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); marcar(ativo + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(ativo - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); fechar(); } // só fecha a lista (o navegador apagaria o texto)
    else if (e.key === 'Enter' && ativo >= 0) { e.preventDefault(); location.href = opcoes()[ativo].href; }
  });
  document.addEventListener('click', e => { if (!form.contains(e.target)) fechar(); });
  form.addEventListener('submit', fechar);
}
