// Painel de cadastro (/admin/). Este arquivo monta a "casca" (menu, barra do topo) e troca as telas
// conforme o endereço (#/inicio, #/produtos, #/produtos/novo, #/categorias, #/conta).
// Cada tela mora em src/admin/telas/ e a conversa com o servidor em src/admin/api.js.
import { api, definirCsrf, BASE } from '../admin/api.js';
import { estado, carregarTudo, formulario } from '../admin/estado.js';
import { esc, icone, confirmar } from '../admin/ui.js';
import { montarLogin, avisoIndisponivel } from '../admin/telas/login.js';
import * as inicio from '../admin/telas/inicio.js';
import * as produtos from '../admin/telas/produtos.js';
import * as form from '../admin/telas/form.js';
import * as categorias from '../admin/telas/categorias.js';
import * as conta from '../admin/telas/conta.js';
import * as financeiro from '../admin/telas/financeiro.js';

const app = document.querySelector('#app');
const MARCA = '<svg viewBox="0 0 24 26" width="30" height="32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.500 4.800c-4.300-3.800-9.800.5-10 6.100C6.200 5.100-.8 9.700 2.800 15.200 6.200 20 14.700 24 14.700 24S26.200 9 21.500 4.800Z"/></svg>';

const MENU = [
  { rota: 'inicio', nome: 'Início', ic: 'inicio' },
  { rota: 'produtos', nome: 'Produtos', ic: 'caixa' },
  { rota: 'categorias', nome: 'Categorias', ic: 'pasta' },
  { rota: 'financeiro', nome: 'Financeiro', ic: 'dinheiro' },
  { rota: 'conta', nome: 'Minha conta', ic: 'usuario' },
];

let casca = false;   // a "casca" (menu + barra) já foi desenhada?
let logado = false;  // só troca de tela quando há alguém logado

function desenharCasca() {
  app.innerHTML = `
  <div class="painel">
    <aside class="lateral">
      <a class="marca" href="#/inicio" aria-label="Feito de Afeto, painel da loja"><img src="${BASE}images/logo.webp" alt="Feito de Afeto" width="120" height="80"><small>Painel da loja</small></a>
      <nav aria-label="Menu principal">${MENU.map(m => `<a href="#/${m.rota}" data-menu="${m.rota}">${icone(m.ic, 20)}<span>${m.nome}</span></a>`).join('')}</nav>
      <div class="lateral-fim">
        <a href="${BASE}" target="_blank" rel="noopener">${icone('externo', 20)}<span>Ver o site</span></a>
        <button type="button" data-sair>${icone('sair', 20)}<span>Sair</span></button>
      </div>
    </aside>
    <div class="principal">
      <header class="barra"><div class="barra-esq" id="barra-esq"></div>
        <div class="barra-dir"><a class="ver-site" href="${BASE}" target="_blank" rel="noopener">${icone('externo', 16)} Ver o site</a>
          <a class="avatar" href="#/conta" aria-label="Minha conta" title="${esc(estado.usuario)}">${esc(estado.usuario.slice(0, 1).toUpperCase())}</a>
          <button type="button" class="ib sair-mobile" data-sair aria-label="Sair">${icone('sair', 20)}</button></div></header>
      <main id="conteudo" tabindex="-1"></main>
    </div>
    <nav class="abas" aria-label="Menu principal (celular)">
      <a href="#/inicio" data-menu="inicio">${icone('inicio', 22)}<span>Início</span></a>
      <a href="#/produtos" data-menu="produtos">${icone('caixa', 22)}<span>Produtos</span></a>
      <a class="aba-mais" href="#/produtos/novo" aria-label="Novo produto">${icone('mais', 26)}</a>
      <a href="#/categorias" data-menu="categorias">${icone('pasta', 22)}<span>Categorias</span></a>
      <a href="#/financeiro" data-menu="financeiro">${icone('dinheiro', 22)}<span>Financeiro</span></a>
    </nav>
  </div>`;
  casca = true;
}

function definirTitulo(titulo, { voltar } = {}) {
  document.title = `${titulo} · Painel Feito de Afeto`;
  document.querySelector('#barra-esq').innerHTML = `${voltar ? `<a class="voltar" href="${voltar}" aria-label="Voltar">${icone('voltar', 20)}</a>` : ''}<h1>${esc(titulo)}</h1>`;
}

export function ir(hash) {
  if (location.hash === hash) rotear(); else location.hash = hash;
}

async function mostrarLogin(mensagem = '') {
  casca = false;
  logado = false;
  try { definirCsrf((await api('sessao.php')).csrf); } catch { /* o login mostra o erro se o servidor não responder */ }
  montarLogin(app, { mensagem, aoEntrar: entrarNoPainel });
}

async function entrarNoPainel() {
  casca = false;
  app.innerHTML = '<div class="carregando"><div class="giro"></div><p>Abrindo o painel…</p></div>';
  try { await carregarTudo(); } catch (e) { return e.status === 401 ? mostrarLogin('Sua sessão terminou. Entre de novo.') : avisoIndisponivel(app, 'Não foi possível carregar', e.message); }
  logado = true;
  if (!location.hash || location.hash === '#/entrar') history.replaceState(null, '', '#/inicio');
  rotear();
}

function rotear() {
  const [secao = 'inicio', acao, id] = location.hash.replace(/^#\/?/, '').split('/');
  if (secao === 'entrar') return mostrarLogin('Sua sessão terminou. Entre de novo.');
  if (!casca) desenharCasca();
  const el = document.querySelector('#conteudo');
  const ctx = { definirTitulo, ir };
  el.className = '';
  // Os eventos de uma tela ficam presos ao container: limpamos antes de montar a próxima
  for (const ev of ['onclick', 'oninput', 'onchange', 'onsubmit', 'onkeydown', 'onfocusout', 'ondragstart', 'ondragend', 'ondragover', 'ondragleave', 'ondrop']) el[ev] = null;

  if (secao === 'produtos' && acao === 'novo') form.montar(el, { ...ctx, modo: 'novo' });
  else if (secao === 'produtos' && (acao === 'editar' || acao === 'duplicar') && id) form.montar(el, { ...ctx, modo: acao, id });
  else if (secao === 'produtos') { formulario.sujo = false; produtos.montar(el, ctx); }
  else if (secao === 'categorias') { formulario.sujo = false; categorias.montar(el, ctx); }
  else if (secao === 'financeiro') { formulario.sujo = false; financeiro.montar(el, ctx); }
  else if (secao === 'conta') { formulario.sujo = false; conta.montar(el, ctx); }
  else { formulario.sujo = false; inicio.montar(el, ctx); }

  // No formulário, as abas do celular saem do caminho (a barra "Salvar" fica no lugar delas)
  document.querySelector('.painel').classList.toggle('modo-form', secao === 'produtos' && ['novo', 'editar', 'duplicar'].includes(acao));
  const ativo = secao === 'produtos' || secao === 'categorias' || secao === 'financeiro' || secao === 'conta' ? secao : 'inicio';
  document.querySelectorAll('[data-menu]').forEach(a => (a.dataset.menu === ativo ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  window.scrollTo({ top: 0 });
}

// ── Eventos globais ──
// Sair do painel
document.addEventListener('click', async e => {
  if (!e.target.closest('[data-sair]')) return;
  try { await api('logout.php', { metodo: 'POST' }); } catch { /* sai mesmo assim */ }
  formulario.sujo = false;
  history.replaceState(null, '', location.pathname);
  mostrarLogin();
});

// Antes de sair de um formulário com alterações não salvas: pergunta
document.addEventListener('click', async e => {
  const link = e.target.closest('a[href^="#/"]');
  if (!link || !formulario.sujo) return;
  e.preventDefault();
  if (await confirmar({ titulo: 'Sair sem salvar?', texto: 'O que você preencheu neste produto será perdido.', botao: 'Sair sem salvar', perigo: true })) {
    formulario.sujo = false;
    ir(link.getAttribute('href'));
  }
}, true);
window.addEventListener('beforeunload', e => { if (formulario.sujo) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('hashchange', () => { if (logado || location.hash === '#/entrar') rotear(); });

// ── Início ──
(async function iniciar() {
  app.innerHTML = '<div class="carregando"><div class="giro"></div><p>Carregando…</p></div>';
  try {
    const s = await api('sessao.php');
    definirCsrf(s.csrf);
    if (!s.instalado) return avisoIndisponivel(app, 'Painel ainda não instalado', 'Falta criar o primeiro usuário. Abra api/admin/instalar.php no servidor.');
    if (!s.logado) return montarLogin(app, { aoEntrar: entrarNoPainel });
    estado.usuario = s.usuario;
    await entrarNoPainel();
  } catch (e) {
    avisoIndisponivel(app, 'Não foi possível abrir o painel', e.rede ? 'O painel só funciona no site publicado (precisa do servidor). Se já está no ar, verifique se a pasta api/ foi enviada.' : e.message);
  }
})();
