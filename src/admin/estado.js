// Dados que as telas compartilham (produtos e categorias já carregados do servidor).
import { api } from './api.js';

export const estado = {
  usuario: '',
  produtos: [],
  categorias: [], // [{ id, nome, total, subs: [{ id, nome, total }] }]
};

export async function carregarProdutos() {
  estado.produtos = (await api('produtos.php')).produtos;
}
export async function carregarCategorias() {
  estado.categorias = (await api('categorias.php')).categorias;
}
export async function carregarTudo() {
  await Promise.all([carregarProdutos(), carregarCategorias()]);
}

/** Monta o pacote que o servidor espera para salvar um produto, a partir de um produto já carregado. */
export function dadosDoProduto(p, mudancas = {}) {
  return {
    id: p.id, titulo: p.titulo, categoria: p.categoria, subcategoria: p.subcategoria ?? '', preco: p.preco, precoOriginal: p.precoOriginal ?? '',
    descricao: p.descricao, paginas: p.paginas, tags: p.tags, incluso: p.incluso, destaque: p.destaque, ativo: p.ativo,
    imagens: p.imagens.map(i => ({ arquivo: i.src, alt: i.alt })), ...mudancas,
  };
}

// Guarda se o formulário aberto tem alterações não salvas (a página avisa antes de sair)
export const formulario = { sujo: false };
