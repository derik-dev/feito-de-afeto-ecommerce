// ─────────────────────────────────────────────────────────────────────────────
// CAMADA DE ACESSO AOS DADOS
// As páginas só conhecem estas funções. Os produtos vêm do BANCO, pela API em PHP (api/produtos.php).
// Se a API não responder (ex.: no seu computador, com `npm run dev`, que não roda PHP), o site usa
// os dados locais de src/data/produtos.js como reserva, então nunca fica sem produtos.
// Para saber de onde vieram: no console do navegador, digite  window.__fonteProdutos  ('banco' ou 'local').
// ─────────────────────────────────────────────────────────────────────────────
import { PRODUTOS, CATEGORIAS, SUBCATEGORIAS } from '../data/produtos.js';
import { gerarImagens } from '../data/placeholders.js';
import { AVALIACOES } from '../data/avaliacoes.js';

const BASE = import.meta.env?.BASE_URL ?? '/';
// Produtos que já vinham com o site. Qualquer outro foi cadastrado depois, pelo painel, e é "novo".
const SLUGS_ORIGINAIS = new Set(PRODUTOS.map(p => p.slug));
const URL_API = `${BASE}api/produtos.php`;

/**
 * A API devolve o caminho da foto dentro do site. Exemplos:
 *   "uploads/abc123.webp"           (foto enviada pelo painel)
 *   "images/agendas/foto.webp"      (foto do próprio site)
 *   "agendas/foto.webp"             (formato antigo: relativo a /images/)
 * Aqui vira o endereço completo, respeitando a subpasta do site (/feito-de-afeto/).
 */
function enderecoDaImagem(src) {
  if (/^(https?:|data:|\/)/.test(src)) return src;
  if (/^(uploads|images)\//.test(src)) return `${BASE}${src}`;
  return `${BASE}images/${src}`;
}

/** Garante o formato que as telas esperam (a API manda null onde o site espera "ausente"). */
function normalizar(p) {
  const imagens = (p.imagens ?? []).map(i => ({ src: enderecoDaImagem(i.src), alt: i.alt ?? '' }));
  return {
    ...p,
    novo: !SLUGS_ORIGINAIS.has(p.slug),
    recencia: Number(p.id) || 0, // o id cresce a cada cadastro: maior = mais recente
    subcategoria: p.subcategoria ?? undefined,
    precoOriginal: p.precoOriginal ?? undefined,
    tags: p.tags ?? [],
    incluso: p.incluso ?? [],
    // produto sem foto no banco: usa a ilustração de exemplo, para o card nunca quebrar
    imagens: imagens.length ? imagens : gerarImagens(p.titulo, 340),
  };
}

async function carregar() {
  try {
    const r = await fetch(URL_API, { headers: { Accept: 'application/json' } });
    // No `npm run dev` o servidor devolve uma página HTML no lugar da API: não é JSON, então caímos na reserva.
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error(`resposta inesperada (${r.status})`);
    const dados = await r.json();
    if (!Array.isArray(dados) || !dados.length) throw new Error('o banco não devolveu produtos');
    window.__fonteProdutos = 'banco';
    return dados.map(normalizar);
  } catch (erro) {
    console.warn('[Feito de Afeto] API de produtos indisponível, usando os dados locais:', erro.message);
    window.__fonteProdutos = 'local';
    return PRODUTOS;
  }
}

// A lista é buscada uma vez só por página (as outras funções reaproveitam a mesma resposta).
let cache;
/** @returns {Promise<import('../data/produtos.js').Produto[]>} */
export function listarProdutos() {
  return (cache ??= carregar());
}

/**
 * Categorias com a contagem de produtos e as subcategorias (nichos).
 * As que estão em data/produtos.js vêm primeiro, na ordem de lá; as novas (criadas no painel) entram depois.
 */
export async function listarCategorias() {
  const lista = await listarProdutos();
  const unicos = (itens, preferidos = []) => [...new Set([...preferidos.filter(x => itens.includes(x)), ...itens])];
  const conta = f => lista.filter(f).length;
  return unicos(lista.map(p => p.categoria), CATEGORIAS).map(nome => ({
    nome,
    total: conta(p => p.categoria === nome),
    subs: unicos(lista.filter(p => p.categoria === nome && p.subcategoria).map(p => p.subcategoria), SUBCATEGORIAS[nome] ?? [])
      .map(sub => ({ nome: sub, total: conta(p => p.categoria === nome && p.subcategoria === sub) })),
  }));
}

export async function buscarProdutoPorSlug(slug) {
  return (await listarProdutos()).find(p => p.slug === slug) ?? null;
}

/** Relacionados: mesma categoria primeiro, depois quem divide mais tags, depois os mais vendidos. */
export async function listarRelacionados(produto, limite = 8) {
  const pontos = p => (p.categoria === produto.categoria ? 10 : 0) + p.tags.filter(t => produto.tags.includes(t)).length;
  return (await listarProdutos()).filter(p => p.id !== produto.id)
    .sort((a, b) => pontos(b) - pontos(a) || b.vendidos - a.vendidos)
    .slice(0, limite);
}

/** Mock: cada produto mostra 4 das 6 avaliações de exemplo, em ordem diferente. */
export async function listarAvaliacoes(produto) {
  const inicio = Number(produto.id) % AVALIACOES.length;
  return Array.from({ length: 4 }, (_, i) => AVALIACOES[(inicio + i) % AVALIACOES.length]);
}
