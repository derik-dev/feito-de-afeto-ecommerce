// Página /conta/: favoritos, compras e dados da pessoa que está logada.
import { renderHeader, renderFooter, iniciarHeader } from '../components/layout.js';
import { ProductCard } from '../components/ProductCard.js';
import { moeda, escapeHtml, urlSite, urlProduto } from '../lib/format.js';
import { favoritos } from '../lib/storage.js';
import { icon } from '../lib/icons.js';
import { toast } from '../lib/toast.js';
import { eu, sair, pedidos, salvarNome, trocarSenha } from '../lib/conta.js';
import { listarProdutos } from '../services/produtos.js';

const app = document.querySelector('#app');
const sessao = await eu(true);
if (!sessao.logado) {
  location.replace(urlSite('entrar/?voltar=conta/'));
  await new Promise(() => {}); // fica parado enquanto redireciona
}

let cliente = sessao.cliente;
let favIds = sessao.favoritos ?? [];
const primeiroNome = () => escapeHtml(cliente.nome.split(' ')[0]);

const ABAS = [['favoritos', 'Favoritos', 'heart'], ['compras', 'Minhas compras', 'download'], ['dados', 'Meus dados', 'user']];

app.innerHTML = `${renderHeader({ barra: false })}
<main class="container" id="conteudo">
  <div class="ac">
    <header class="ac-topo">
      <div><p class="ac-oi">Olá, <b id="ac-nome">${primeiroNome()}</b>!</p><p class="ac-sub">Tudo que é seu, num lugar só.</p></div>
      <button type="button" class="button ac-sair" id="ac-sair">Sair</button>
    </header>
    <nav class="ac-nav" aria-label="Minha conta">${ABAS.map(([id, nome, ic]) => `<a href="#${id}" data-aba="${id}">${icon(ic)}${nome}</a>`).join('')}</nav>
    <section id="ac-palco" aria-live="polite"></section>
  </div>
</main>${renderFooter()}`;
iniciarHeader();

const palco = document.querySelector('#ac-palco');
const dataBR = iso => { const d = new Date(String(iso).replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR'); };

async function abaFavoritos() {
  palco.innerHTML = '<p class="ac-carregando">Carregando…</p>';
  const todos = await listarProdutos();
  const itens = favIds.map(id => todos.find(p => p.id === id)).filter(Boolean);
  palco.innerHTML = itens.length
    ? `<div class="cat-grid" id="ac-grade">${itens.map(p => ProductCard(p, { favorito: true })).join('')}</div>`
    : `<div class="ac-vazio">${icon('heart')}<h2>Você ainda não favoritou nada</h2><p>Toque no coração dos produtos para guardá-los aqui.</p><a class="button button-primary" href="${urlSite('catalogo/')}">Ver o catálogo</a></div>`;
}

const ROTULO = { pago: ['Pago', 'ok'], aguardando: ['Aguardando pagamento', 'espera'] };
async function abaCompras() {
  palco.innerHTML = '<p class="ac-carregando">Carregando…</p>';
  let lista;
  try { lista = (await pedidos()).pedidos; } catch { palco.innerHTML = '<p class="ac-erro">Não consegui carregar suas compras. Tente de novo.</p>'; return; }
  const todos = lista.length ? await listarProdutos() : [];
  palco.innerHTML = lista.length ? `<ul class="ac-lista">${lista.map(p => {
    const prod = todos.find(x => x.id === p.produtoId);
    const [rotulo, tom] = ROTULO[p.status] ?? [p.status, 'espera'];
    return `<li class="ac-item">
      ${prod?.imagens?.[0] ? `<img src="${escapeHtml(prod.imagens[0].src)}" alt="" loading="lazy">` : '<span class="ac-sem-foto"></span>'}
      <div class="ac-item-info"><b>${escapeHtml(p.titulo)}</b><small>${dataBR(p.data)} · ${moeda(p.valor)}</small><span class="ac-selo ${tom}">${rotulo}</span></div>
      <div class="ac-item-acao">${p.download
        ? `<a class="button button-primary" href="${urlSite(p.download)}">${p.quantidade > 1 ? 'Ver arquivos' : 'Baixar PDF'}</a>`
        : `<a class="button" href="${urlSite(`pedido/?c=${p.codigo}`)}">Ver pedido</a>`}</div>
    </li>`; }).join('')}</ul>`
    : `<div class="ac-vazio">${icon('download')}<h2>Nenhuma compra ainda</h2><p>Quando você comprar, o PDF aparece aqui para baixar quando quiser.</p><a class="button button-primary" href="${urlSite('catalogo/')}">Ver o catálogo</a></div>`;
}

function abaDados() {
  palco.innerHTML = `<div class="ac-dados">
    <form class="ac-card" id="f-nome" novalidate>
      <h2>Seus dados</h2>
      <label for="d-nome">Nome</label><input id="d-nome" value="${escapeHtml(cliente.nome)}" maxlength="100" autocomplete="name">
      <label for="d-email">E-mail</label><input id="d-email" value="${escapeHtml(cliente.email)}" readonly>
      <p class="ac-nota">O PDF das suas compras é enviado para este e-mail.</p>
      <p class="ac-erro" role="alert"></p>
      <button class="button button-primary ac-btn" type="submit">Salvar</button>
    </form>
    <form class="ac-card" id="f-senha" novalidate>
      <h2>Trocar senha</h2>
      <label for="s-atual">Senha atual</label><input id="s-atual" type="password" autocomplete="current-password">
      <label for="s-nova">Nova senha (mínimo 8 caracteres)</label><input id="s-nova" type="password" autocomplete="new-password">
      <p class="ac-erro" role="alert"></p>
      <button class="button button-primary ac-btn" type="submit">Trocar senha</button>
    </form></div>`;
  const ligar = (id, acao, ok) => {
    const f = document.querySelector(id), erro = f.querySelector('.ac-erro'), b = f.querySelector('button');
    f.addEventListener('submit', async e => {
      e.preventDefault(); erro.textContent = ''; b.disabled = true;
      try { await acao(); toast(ok); } catch (x) { erro.textContent = x.message; } finally { b.disabled = false; }
    });
  };
  ligar('#f-nome', async () => {
    const nome = document.querySelector('#d-nome').value.trim();
    if (nome.length < 2) throw new Error('Digite seu nome.');
    cliente = (await salvarNome(nome)).cliente;
    document.querySelector('#ac-nome').textContent = cliente.nome.split(' ')[0];
  }, 'Dados salvos!');
  ligar('#f-senha', async () => {
    const atual = document.querySelector('#s-atual').value, nova = document.querySelector('#s-nova').value;
    if (!atual) throw new Error('Digite sua senha atual.');
    if (nova.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
    await trocarSenha(atual, nova);
    document.querySelector('#s-atual').value = ''; document.querySelector('#s-nova').value = '';
  }, 'Senha trocada!');
}

async function mostrar() {
  const id = ABAS.some(a => a[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'favoritos';
  document.querySelectorAll('[data-aba]').forEach(a => (a.dataset.aba === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  if (id === 'favoritos') await abaFavoritos(); else if (id === 'compras') await abaCompras(); else abaDados();
}
addEventListener('hashchange', mostrar);
mostrar();

// Tirar o coração aqui remove o produto da lista
document.addEventListener('click', e => {
  const b = e.target.closest('[data-favorite]');
  if (!b) return;
  const id = b.dataset.favorite;
  favoritos.alternar(id);
  favIds = favIds.filter(x => x !== id);
  b.closest('.car-item, .pc')?.remove();
  if (!document.querySelector('#ac-grade .pc')) abaFavoritos();
});

document.querySelector('#ac-sair').addEventListener('click', async () => {
  await sair();
  location.href = urlSite();
});
