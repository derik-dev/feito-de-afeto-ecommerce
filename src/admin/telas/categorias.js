// Tela "Categorias": criar, renomear e excluir categorias e nichos (subcategorias).
import { api } from '../api.js';
import { estado } from '../estado.js';
import { esc, icone, toast, confirmar, perguntar } from '../ui.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function desenhar(el) {
  const cats = estado.categorias;
  el.querySelector('#lista-cats').innerHTML = cats.length ? cats.map(c => `
    <article class="cat-cartao">
      <header>
        <span class="cat-ic">${icone('pasta', 22)}</span>
        <div><h3>${esc(c.nome)}</h3><span>${plural(c.total, 'produto', 'produtos')} · ${plural(c.subs.length, 'nicho', 'nichos')}</span></div>
        <div class="icones">
          <button type="button" class="ib" data-acao="renomear" data-tipo="categoria" data-id="${c.id}" title="Renomear" aria-label="Renomear a categoria ${esc(c.nome)}">${icone('editar', 18)}</button>
          <button type="button" class="ib perigo${c.total ? ' bloqueado' : ''}" data-acao="excluir" data-tipo="categoria" data-id="${c.id}" title="${c.total ? 'Não dá para excluir: há produtos nela' : 'Excluir'}" aria-label="Excluir a categoria ${esc(c.nome)}">${icone('lixo', 18)}</button>
        </div>
      </header>
      <div class="nichos">
        <h4>Nichos</h4>
        ${c.subs.length ? `<ul>${c.subs.map(s => `
          <li><span class="nicho-nome">${esc(s.nome)}</span><span class="nicho-n">${plural(s.total, 'produto', 'produtos')}</span>
            <button type="button" class="ib peq" data-acao="renomear" data-tipo="sub" data-cat="${c.id}" data-id="${s.id}" title="Renomear" aria-label="Renomear o nicho ${esc(s.nome)}">${icone('editar', 16)}</button>
            <button type="button" class="ib peq perigo${s.total ? ' bloqueado' : ''}" data-acao="excluir" data-tipo="sub" data-cat="${c.id}" data-id="${s.id}" title="${s.total ? 'Não dá para excluir: há produtos nele' : 'Excluir'}" aria-label="Excluir o nicho ${esc(s.nome)}">${icone('lixo', 16)}</button></li>`).join('')}</ul>`
          : '<p class="ajuda">Esta categoria ainda não tem nichos.</p>'}
        <button type="button" class="botao sec peq" data-acao="novo-nicho" data-cat="${c.id}">${icone('mais', 16)} Novo nicho</button>
      </div>
    </article>`).join('')
    : `<div class="vazio largo">${icone('pasta', 36)}<p>Nenhuma categoria ainda.</p><button type="button" class="botao prim" data-acao="nova-categoria">Criar a primeira categoria</button></div>`;
}

export function montar(el, { definirTitulo, ir }) {
  definirTitulo('Categorias');
  el.innerHTML = `
    <div class="topo-tela">
      <p class="sub">As <b>categorias</b> organizam o catálogo do site. Os <b>nichos</b> são grupos dentro de uma categoria (ex.: <i>Unhas</i> dentro de <i>Agendamento</i>).</p>
      <button type="button" class="botao prim" data-acao="nova-categoria">${icone('mais', 18)} Nova categoria</button>
    </div>
    <div class="grade-cats" id="lista-cats"></div>`;
  desenhar(el);

  el.onclick = async e => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const cat = estado.categorias.find(c => c.id === Number(b.dataset.cat ?? b.dataset.id));
    const sub = b.dataset.tipo === 'sub' ? cat?.subs.find(s => s.id === Number(b.dataset.id)) : null;
    const atual = b.dataset.tipo === 'sub' ? sub : estado.categorias.find(c => c.id === Number(b.dataset.id));
    try {
      switch (b.dataset.acao) {
        case 'nova-categoria': {
          const nome = await perguntar({ titulo: 'Nova categoria', rotulo: 'Nome da categoria', exemplo: 'Ex.: Casamento', botao: 'Criar categoria' });
          if (!nome) return;
          estado.categorias = (await api('categoria-salvar.php', { metodo: 'POST', corpo: { tipo: 'categoria', nome } })).categorias;
          toast(`Categoria "${nome}" criada.`);
          break;
        }
        case 'novo-nicho': {
          const nome = await perguntar({ titulo: `Novo nicho em "${cat.nome}"`, rotulo: 'Nome do nicho', exemplo: 'Ex.: Noivas', botao: 'Criar nicho' });
          if (!nome) return;
          estado.categorias = (await api('categoria-salvar.php', { metodo: 'POST', corpo: { tipo: 'sub', categoriaId: cat.id, nome } })).categorias;
          toast(`Nicho "${nome}" criado.`);
          break;
        }
        case 'renomear': {
          const nome = await perguntar({ titulo: `Renomear ${b.dataset.tipo === 'sub' ? 'nicho' : 'categoria'}`, texto: atual.total ? `Os ${atual.total} produto(s) que usam "${atual.nome}" passam a usar o novo nome.` : '', rotulo: 'Novo nome', valor: atual.nome, botao: 'Salvar nome' });
          if (!nome || nome === atual.nome) return;
          const corpo = b.dataset.tipo === 'sub' ? { tipo: 'sub', categoriaId: cat.id, id: atual.id, nome } : { tipo: 'categoria', id: atual.id, nome };
          estado.categorias = (await api('categoria-salvar.php', { metodo: 'POST', corpo })).categorias;
          toast('Nome alterado.');
          break;
        }
        case 'excluir': {
          if (atual.total) return toast(`Não dá para excluir "${atual.nome}": ainda há ${plural(atual.total, 'produto', 'produtos')}. Mude esses produtos para outra categoria primeiro.`, 'erro');
          const sim = await confirmar({ titulo: `Excluir ${b.dataset.tipo === 'sub' ? 'o nicho' : 'a categoria'} "${atual.nome}"?`, texto: b.dataset.tipo === 'sub' ? '' : 'Os nichos dela também serão excluídos.', botao: 'Excluir', perigo: true });
          if (!sim) return;
          estado.categorias = (await api('categoria-excluir.php', { metodo: 'POST', corpo: { tipo: b.dataset.tipo, id: atual.id } })).categorias;
          toast('Excluído.');
          break;
        }
      }
      desenhar(el);
    } catch (erro) {
      if (erro.status === 401) return ir('#/entrar');
      toast(erro.message, 'erro');
    }
  };
}
