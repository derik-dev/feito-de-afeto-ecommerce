import { icon } from '../lib/icons.js';

/** Paginação com "Anterior / 1 2 3 / Seguinte". Os botões levam `data-pagina="<n>"`. */
export function Pagination({ pagina, totalPaginas }) {
  if (totalPaginas <= 1) return '';
  const botao = (n, conteudo, { rotulo, desativado = false, atual = false } = {}) =>
    `<li><button type="button" class="pg-btn${atual ? ' is-current' : ''}" data-pagina="${n}"${desativado ? ' disabled' : ''}${atual ? ' aria-current="page"' : ''} aria-label="${rotulo ?? `Página ${n}`}">${conteudo}</button></li>`;
  const numeros = Array.from({ length: totalPaginas }, (_, i) => i + 1);
  return `<nav class="pg" aria-label="Paginação"><ul>
    ${botao(pagina - 1, `${icon('chevron', 'flipped')}<span>Anterior</span>`, { rotulo: 'Página anterior', desativado: pagina === 1 })}
    ${numeros.map(n => botao(n, n, { atual: n === pagina })).join('')}
    ${botao(pagina + 1, `<span>Seguinte</span>${icon('chevron')}`, { rotulo: 'Próxima página', desativado: pagina === totalPaginas })}
  </ul></nav>`;
}
