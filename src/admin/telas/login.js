// Tela de entrada (login) e avisos de painel indisponível.
import { api, definirCsrf, BASE } from '../api.js';
import { estado } from '../estado.js';
import { esc, icone } from '../ui.js';

const MARCA = `<svg viewBox="0 0 24 26" width="44" height="46" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.500 4.800c-4.300-3.800-9.800.5-10 6.100C6.200 5.100-.8 9.700 2.800 15.200 6.200 20 14.700 24 14.700 24S26.200 9 21.500 4.800Z"/></svg>`;

const moldura = miolo => `
  <div class="entrada">
    <aside class="entrada-marca"><div><img class="entrada-logo" src="${BASE}images/logo.webp" alt="Feito de Afeto" width="260" height="174"><h1 class="sr-only">Feito de Afeto</h1><p>Painel da loja</p></div>
      <ul><li>${icone('caixa', 20)} Cadastre produtos com fotos</li><li>${icone('pasta', 20)} Organize categorias e nichos</li><li>${icone('olho', 20)} Mostre ou oculte quando quiser</li></ul></aside>
    <main class="entrada-form">${miolo}</main>
  </div>`;

export function avisoIndisponivel(app, titulo, texto) {
  app.innerHTML = moldura(`<div class="entrada-cartao"><h2>${esc(titulo)}</h2><p class="sub">${esc(texto)}</p></div>`);
}

/** Desenha o login. `aoEntrar` roda depois que a senha for aceita. */
export function montarLogin(app, { mensagem = '', aoEntrar }) {
  app.innerHTML = moldura(`
    <form class="entrada-cartao" id="form-login" novalidate>
      <h2>Entrar</h2><p class="sub">Use o usuário e a senha que você criou.</p>
      ${mensagem ? `<p class="erro-geral" role="alert">${esc(mensagem)}</p>` : ''}
      <label for="usuario">Usuário</label>
      <input id="usuario" type="text" autocomplete="username" autocapitalize="none" spellcheck="false">
      <label for="senha">Senha</label>
      <div class="senha-campo"><input id="senha" type="password" autocomplete="current-password"><button type="button" id="ver-senha" aria-label="Mostrar a senha" aria-pressed="false">${icone('olho', 20)}</button></div>
      <button class="botao prim largo" type="submit">Entrar</button>
    </form>`);
  const $ = s => app.querySelector(s);
  $('#usuario').focus();
  $('#ver-senha').onclick = e => {
    const mostrar = $('#senha').type === 'password';
    $('#senha').type = mostrar ? 'text' : 'password';
    e.currentTarget.setAttribute('aria-pressed', String(mostrar));
    e.currentTarget.setAttribute('aria-label', mostrar ? 'Esconder a senha' : 'Mostrar a senha');
  };
  $('#form-login').onsubmit = async e => {
    e.preventDefault();
    const botao = e.submitter;
    if (!$('#usuario').value.trim() || !$('#senha').value) return montarLogin(app, { mensagem: 'Digite o usuário e a senha.', aoEntrar });
    botao.disabled = true; botao.textContent = 'Entrando…';
    try {
      const r = await api('login.php', { metodo: 'POST', corpo: { usuario: $('#usuario').value.trim(), senha: $('#senha').value } });
      definirCsrf(r.csrf);
      estado.usuario = r.usuario;
      aoEntrar();
    } catch (erro) { montarLogin(app, { mensagem: erro.message, aoEntrar }); }
  };
}
