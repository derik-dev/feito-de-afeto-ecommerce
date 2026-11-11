// Tela "Produtos": busca, filtros, ordenação e cartões com ações rápidas.
import { api, enderecoFoto, BASE } from '../api.js';
import { estado, carregarProdutos, carregarCategorias, dadosDoProduto } from '../estado.js';
import { esc, icone, reais, toast, confirmar } from '../ui.js';
import { urlProduto } from '../../lib/format.js';

// Os filtros ficam guardados aqui: ao voltar para a lista, continuam como estavam.
const filtros = { q: '', categoria: '', status: 'todos', ordem: 'recentes' };

const normalizar = s => String(s ?? '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');
const ORDENS = {
  recentes: (a, b) => Number(b.id) - Number(a.id),
  antigos: (a, b) => Number(a.id) - Number(b.id),
  nome: (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'),
  'menor-preco': (a, b) => a.preco - b.preco,
  'maior-preco': (a, b) => b.preco - a.preco,
};

function filtrar() {
  const busca = normalizar(filtros.q).split(/\s+/).filter(Boolean);
  return estado.produtos
    .filter(p => !filtros.categoria || p.categoria === filtros.categoria)
    .filter(p => filtros.status === 'todos' || (filtros.status === 'ativos' ? p.ativo : !p.ativo))
    .filter(p => busca.every(w => normalizar(`${p.titulo} ${p.categoria} ${p.subcategoria ?? ''} ${p.tags.join(' ')}`).includes(w)))
    .sort(ORDENS[filtros.ordem]);
}

function cartao(p) {
  const desconto = p.precoOriginal && p.precoOriginal > p.preco ? Math.round((1 - p.preco / p.precoOriginal) * 100) : 0;
  return `
    <article class="prod${p.ativo ? '' : ' oculto'}">
      <a class="prod-img" href="#/produtos/editar/${p.id}" aria-label="Editar ${esc(p.titulo)}">
        <img src="${enderecoFoto(p.imagens[0]?.src)}" alt="" loading="lazy">
        ${p.destaque ? `<span class="selo-destaque">${icone('estrela', 14)} Destaque</span>` : ''}
        ${p.ativo ? '' : '<span class="selo-oculto">Oculto</span>'}
        ${p.pdf === null ? '<span class="selo-sempdf">Sem PDF</span>' : ''}
      </a>
      <div class="prod-corpo">
        <h3>${esc(p.titulo)}</h3>
        <p class="prod-cat">${esc(p.categoria)}${p.subcategoria ? ' › ' + esc(p.subcategoria) : ''}</p>
        <p class="prod-preco"><b>${reais(p.preco)}</b>${desconto ? `<s>${reais(p.precoOriginal)}</s><span class="off">-${desconto}%</span>` : ''}</p>
        <div class="prod-rodape">
          <button type="button" class="chave" role="switch" aria-checked="${p.ativo}" data-acao="alternar" data-id="${p.id}" title="${p.ativo ? 'Aparece no site: clique para ocultar' : 'Oculto: clique para mostrar no site'}">
            <span class="trilho"><span class="bolinha"></span></span><span>${p.ativo ? 'No site' : 'Oculto'}</span></button>
          <div class="icones">
            <a class="ib" href="#/produtos/editar/${p.id}" title="Editar" aria-label="Editar ${esc(p.titulo)}">${icone('editar', 18)}</a>
            <button type="button" class="ib" data-acao="duplicar" data-id="${p.id}" title="Duplicar (cria uma cópia para você editar)" aria-label="Duplicar ${esc(p.titulo)}">${icone('copiar', 18)}</button>
            ${p.ativo ? `<a class="ib" href="${urlProduto(p.slug)}" target="_blank" rel="noopener" title="Ver no site" aria-label="Ver ${esc(p.titulo)} no site">${icone('externo', 18)}</a>` : ''}
            <button type="button" class="ib perigo" data-acao="excluir" data-id="${p.id}" title="Excluir" aria-label="Excluir ${esc(p.titulo)}">${icone('lixo', 18)}</button>
          </div>
        </div>
      </div>
    </article>`;
}

function desenharLista(el) {
  const lista = filtrar();
  const alvo = el.querySelector('#lista-produtos');
  el.querySelector('#contagem').textContent = `${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'}${lista.length !== estado.produtos.length ? ` de ${estado.produtos.length}` : ''}`;
  alvo.innerHTML = lista.length ? lista.map(cartao).join('')
    : `<div class="vazio largo">${icone('buscar', 36)}<p>${estado.produtos.length ? 'Nenhum produto encontrado com esses filtros.' : 'Você ainda não cadastrou nenhum produto.'}</p>
       ${estado.produtos.length ? '<button type="button" class="botao sec" data-acao="limpar">Limpar filtros</button>' : '<a class="botao prim" href="#/produtos/novo">Cadastrar o primeiro produto</a>'}</div>`;
}

export function montar(el, { definirTitulo, ir }) {
  definirTitulo('Produtos');
  const cats = estado.categorias;
  el.innerHTML = `
    <div class="topo-tela">
      <div><p class="sub" id="contagem"></p></div>
      <a class="botao prim" href="#/produtos/novo">${icone('mais', 18)} Novo produto</a>
    </div>
    <div class="ferramentas">
      <label class="busca">${icone('buscar', 18)}<input id="busca" type="search" placeholder="Buscar por nome, categoria ou palavra-chave" value="${esc(filtros.q)}" aria-label="Buscar produtos"></label>
      <select id="f-cat" aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>${cats.map(c => `<option value="${esc(c.nome)}"${c.nome === filtros.categoria ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>
      <select id="f-ordem" aria-label="Ordenar">
        ${[['recentes', 'Mais recentes'], ['antigos', 'Mais antigos'], ['nome', 'Nome (A a Z)'], ['menor-preco', 'Menor preço'], ['maior-preco', 'Maior preço']].map(([v, t]) => `<option value="${v}"${v === filtros.ordem ? ' selected' : ''}>${t}</option>`).join('')}
      </select>
      <div class="segmento" role="group" aria-label="Situação">
        ${[['todos', 'Todos'], ['ativos', 'No site'], ['ocultos', 'Ocultos']].map(([v, t]) => `<button type="button" data-status="${v}" aria-pressed="${v === filtros.status}">${t}</button>`).join('')}
      </div>
    </div>
    <div class="grade-prod" id="lista-produtos"></div>`;
  desenharLista(el);

  el.oninput = e => { if (e.target.id === 'busca') { filtros.q = e.target.value; desenharLista(el); } };
  el.onchange = e => {
    if (e.target.id === 'f-cat') filtros.categoria = e.target.value;
    if (e.target.id === 'f-ordem') filtros.ordem = e.target.value;
    desenharLista(el);
  };
  el.onclick = async e => {
    const status = e.target.closest('[data-status]');
    if (status) {
      filtros.status = status.dataset.status;
      el.querySelectorAll('[data-status]').forEach(b => b.setAttribute('aria-pressed', String(b === status)));
      return desenharLista(el);
    }
    const botao = e.target.closest('[data-acao]');
    if (!botao) return;
    if (botao.dataset.acao === 'limpar') { Object.assign(filtros, { q: '', categoria: '', status: 'todos' }); return montar(el, { definirTitulo, ir }); }
    const p = estado.produtos.find(x => x.id === botao.dataset.id);
    try {
      if (botao.dataset.acao === 'duplicar') return ir(`#/produtos/duplicar/${p.id}`);
      if (botao.dataset.acao === 'alternar') {
        botao.disabled = true;
        await api('salvar.php', { metodo: 'POST', corpo: dadosDoProduto(p, { ativo: !p.ativo }) });
        await carregarProdutos();
        desenharLista(el);
        toast(p.ativo ? `"${p.titulo}" saiu do site.` : `"${p.titulo}" voltou ao site.`);
      }
      if (botao.dataset.acao === 'excluir') {
        const sim = await confirmar({ titulo: 'Excluir este produto?', texto: `"${p.titulo}" será apagado de vez e não dá para desfazer.\nSe você só quer tirar do site por um tempo, use o botão "No site" para ocultar.`, botao: 'Excluir produto', perigo: true });
        if (!sim) return;
        await api('excluir.php', { metodo: 'POST', corpo: { id: p.id } });
        await Promise.all([carregarProdutos(), carregarCategorias()]);
        desenharLista(el);
        toast('Produto excluído.');
      }
    } catch (erro) {
      if (erro.status === 401) return ir('#/entrar');
      toast(erro.message, 'erro');
      botao.disabled = false;
    }
  };
}
