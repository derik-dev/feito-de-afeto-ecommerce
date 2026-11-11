// Funções PURAS (recebem dados, devolvem dados) para filtrar, ordenar e paginar.
// Ficam separadas da tela para serem fáceis de entender e de testar.

export const ORDENACOES = [
  { valor: 'relevancia', rotulo: 'Mais relevantes' },
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'menor-preco', rotulo: 'Menor preço' },
  { valor: 'maior-preco', rotulo: 'Maior preço' },
  { valor: 'mais-vendidos', rotulo: 'Mais vendidos' },
];

/** Para sort(): produtos novos (cadastrados no painel) antes dos outros, o mais recente primeiro. */
export const novosPrimeiro = (a, b) => (a.novo && b.novo ? (b.recencia ?? 0) - (a.recencia ?? 0) : (b.novo ? 1 : 0) - (a.novo ? 1 : 0));

export const temDesconto = p => p.precoOriginal != null && p.precoOriginal > p.preco;
export const percentualDesconto = p => (temDesconto(p) ? Math.round((1 - p.preco / p.precoOriginal) * 100) : 0);
export const ehMaisVendido = p => p.vendidos >= 1000;

export const FILTROS_VAZIOS = { q: '', categoria: '', subcategoria: '', min: '', max: '', notaMin: 0, comDesconto: false };

const normalizar = s => s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Tira o plural simples para a busca achar "agendas" em "Agenda", "flores" em "flor", "planners" em "planner". */
const raiz = w => (w.length > 3 ? w.replace(/(es|s)$/, '') : w);

/** Aplica todos os filtros ao mesmo tempo (E lógico). */
export function filtrarProdutos(lista, f) {
  const min = f.min === '' ? null : Number(f.min);
  const max = f.max === '' ? null : Number(f.max);
  // A busca quebra o texto em palavras e exige TODAS: "agenda 2027" acha "Agenda Católica 2027".
  const palavras = normalizar(f.q.trim()).split(/\s+/).filter(Boolean);
  return lista.filter(p =>
    (!f.categoria || p.categoria === f.categoria) &&
    (!f.subcategoria || p.subcategoria === f.subcategoria) &&
    (min === null || p.preco >= min) &&
    (max === null || p.preco <= max) &&
    p.nota >= f.notaMin &&
    (!f.comDesconto || temDesconto(p)) &&
    (!palavras.length || (() => { const texto = normalizar(`${p.titulo} ${p.categoria} ${p.subcategoria ?? ''} ${(p.tags ?? []).join(' ')} ${p.descricao ?? ''}`); return palavras.every(w => texto.includes(w) || texto.includes(raiz(w))); })()));
}

export function ordenarProdutos(lista, ordem) {
  const copia = [...lista]; // sort() altera o array; copiamos para não mexer no original
  const relevancia = p => (p.novo ? 1e12 + (p.recencia ?? 0) : 0) + (p.prioridade ?? 0) * 1e8 + (p.destaque ? 1e6 : 0) + p.vendidos * p.nota;
  const regras = {
    'menor-preco': (a, b) => a.preco - b.preco,
    'maior-preco': (a, b) => b.preco - a.preco,
    'mais-vendidos': (a, b) => b.vendidos - a.vendidos,
    recentes: (a, b) => (b.recencia ?? 0) - (a.recencia ?? 0),
    relevancia: (a, b) => relevancia(b) - relevancia(a),
  };
  return copia.sort(regras[ordem] ?? regras.relevancia);
}

export function paginar(lista, pagina, porPagina) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  return { itens: lista.slice((atual - 1) * porPagina, atual * porPagina), pagina: atual, totalPaginas };
}

/** Quantos filtros (fora a busca) estão ativos — mostrado no botão "Filtrar" do celular. */
export const contarFiltrosAtivos = f =>
  [f.categoria, f.subcategoria, f.min !== '', f.max !== '', f.notaMin > 0, f.comDesconto].filter(Boolean).length;
