// Tela "Minha conta": dados e troca de senha.
import { api } from '../api.js';
import { estado } from '../estado.js';
import { esc, icone, toast } from '../ui.js';

export function montar(el, { definirTitulo, ir }) {
  definirTitulo('Minha conta');
  el.innerHTML = `
    <div class="duas-colunas">
      <section class="bloco">
        <div class="bloco-topo"><h2>Seus dados</h2></div>
        <div class="perfil"><span class="avatar grande">${esc(estado.usuario.slice(0, 1).toUpperCase())}</span><div><b>${esc(estado.usuario)}</b><span>Administradora da loja</span></div></div>
        <div class="dica-caixa">${icone('cadeado', 20)}<p>Por segurança, a sessão termina sozinha depois de 4 horas sem uso. Em computador compartilhado, sempre clique em <b>Sair</b>.</p></div>
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2>Trocar senha</h2></div>
        <form id="form-senha" autocomplete="off" novalidate>
          <p class="erro-geral" id="erro-senha" role="alert" hidden></p>
          <label for="atual">Senha atual</label><input id="atual" type="password" autocomplete="current-password">
          <label for="nova">Nova senha <small>(mínimo 10 caracteres)</small></label><input id="nova" type="password" autocomplete="new-password">
          <div class="forca" aria-hidden="true"><span id="forca-barra"></span></div><small id="forca-texto" class="ajuda"></small>
          <label for="nova2">Repita a nova senha</label><input id="nova2" type="password" autocomplete="new-password">
          <button class="botao prim" type="submit">${icone('ok', 18)} Salvar nova senha</button>
        </form>
      </section>
    </div>`;

  const $ = s => el.querySelector(s);
  el.oninput = e => {
    if (e.target.id !== 'nova') return;
    const s = e.target.value;
    const pontos = Math.min(4, (s.length >= 10) + (s.length >= 14) + (/[A-Z]/.test(s) && /[a-z]/.test(s)) + (/\d/.test(s) && /[^A-Za-z0-9]/.test(s)));
    $('#forca-barra').style.width = `${s ? Math.max(15, pontos * 25) : 0}%`;
    $('#forca-barra').dataset.n = pontos;
    $('#forca-texto').textContent = !s ? '' : s.length < 10 ? 'Muito curta' : ['', 'Aceitável', 'Boa', 'Forte', 'Muito forte'][pontos] || 'Aceitável';
  };
  el.onsubmit = async e => {
    e.preventDefault();
    const erro = $('#erro-senha');
    erro.hidden = true;
    const mostrar = t => { erro.textContent = t; erro.hidden = false; };
    if (!$('#atual').value) return mostrar('Digite a senha atual.');
    if ($('#nova').value.length < 10) return mostrar('A nova senha precisa ter pelo menos 10 caracteres.');
    if ($('#nova').value !== $('#nova2').value) return mostrar('As duas senhas novas não são iguais.');
    const botao = e.submitter; botao.disabled = true;
    try {
      await api('senha.php', { metodo: 'POST', corpo: { atual: $('#atual').value, nova: $('#nova').value } });
      toast('Senha alterada!');
      ir('#/inicio');
    } catch (err) {
      botao.disabled = false;
      if (err.status === 401 && /atual/i.test(err.message) === false) return ir('#/entrar');
      mostrar(err.message);
    }
  };
}
