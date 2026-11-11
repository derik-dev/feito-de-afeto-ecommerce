// Página /entrar/: entrar na conta ou criar uma. Aceita ?voltar=comprar/?produto=x para voltar depois do login.
import { renderHeader, renderFooter, iniciarHeader } from '../components/layout.js';
import { urlSite } from '../lib/format.js';
import { eu, entrar, cadastrar, destinoSeguro } from '../lib/conta.js';

const params = new URLSearchParams(location.search);
const voltar = destinoSeguro(params.get('voltar'));
const irPara = () => { location.href = urlSite(voltar); };

if ((await eu()).logado) irPara();

const app = document.querySelector('#app');
const ehCadastro = params.get('modo') === 'cadastro';
app.innerHTML = `${renderHeader({ barra: false })}
<main class="container" id="conteudo">
  <div class="ac-entrada">
    <div class="ac-abas" role="tablist">
      <button type="button" role="tab" id="aba-entrar" aria-selected="${!ehCadastro}" aria-controls="painel-entrar">Entrar</button>
      <button type="button" role="tab" id="aba-cadastro" aria-selected="${ehCadastro}" aria-controls="painel-cadastro">Criar conta</button>
    </div>

    <form class="ac-card" id="painel-entrar" role="tabpanel" aria-labelledby="aba-entrar" novalidate ${ehCadastro ? 'hidden' : ''}>
      <h1>Que bom te ver de novo</h1>
      <p class="ac-sub">Entre para comprar, baixar seus PDFs e ver seus favoritos.</p>
      <label for="e-email">E-mail</label><input id="e-email" type="email" autocomplete="username" required>
      <label for="e-senha">Senha</label><input id="e-senha" type="password" autocomplete="current-password" required>
      <p class="ac-erro" role="alert"></p>
      <button class="button button-primary ac-btn" type="submit">Entrar</button>
    </form>

    <form class="ac-card" id="painel-cadastro" role="tabpanel" aria-labelledby="aba-cadastro" novalidate ${ehCadastro ? '' : 'hidden'}>
      <h1>Crie sua conta</h1>
      <p class="ac-sub">É rápido. Sua conta guarda seus favoritos e suas compras, e o PDF fica sempre à mão.</p>
      <label for="c-nome">Nome</label><input id="c-nome" autocomplete="name" maxlength="100" required>
      <label for="c-email">E-mail</label><input id="c-email" type="email" autocomplete="email" required>
      <label for="c-senha">Senha (mínimo 8 caracteres)</label><input id="c-senha" type="password" autocomplete="new-password" minlength="8" required>
      <p class="ac-erro" role="alert"></p>
      <button class="button button-primary ac-btn" type="submit">Criar minha conta</button>
    </form>
  </div>
</main>${renderFooter()}`;
iniciarHeader();

const abas = { entrar: document.querySelector('#aba-entrar'), cadastro: document.querySelector('#aba-cadastro') };
function mostrar(qual) {
  for (const [nome, aba] of Object.entries(abas)) {
    aba.setAttribute('aria-selected', String(nome === qual));
    document.querySelector(`#painel-${nome}`).hidden = nome !== qual;
  }
}
abas.entrar.addEventListener('click', () => mostrar('entrar'));
abas.cadastro.addEventListener('click', () => mostrar('cadastro'));

function ligar(form, acao) {
  const erro = form.querySelector('.ac-erro'), botao = form.querySelector('button[type=submit]');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    erro.textContent = '';
    const antes = botao.textContent;
    botao.disabled = true; botao.textContent = 'Aguarde…';
    try { await acao(); irPara(); }
    catch (x) { erro.textContent = x.message; botao.disabled = false; botao.textContent = antes; }
  });
}
const $ = s => document.querySelector(s);
ligar($('#painel-entrar'), async () => {
  const email = $('#e-email').value.trim(), senha = $('#e-senha').value;
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Digite um e-mail válido.');
  if (!senha) throw new Error('Digite sua senha.');
  await entrar(email, senha);
});
ligar($('#painel-cadastro'), async () => {
  const nome = $('#c-nome').value.trim(), email = $('#c-email').value.trim(), senha = $('#c-senha').value;
  if (nome.length < 2) throw new Error('Digite seu nome.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Digite um e-mail válido.');
  if (senha.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
  await cadastrar(nome, email, senha);
});
