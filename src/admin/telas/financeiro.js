// Tela "Financeiro": saldo, vendas e saque por Pix para a chave cadastrada no servidor.
import { api } from '../api.js';
import { esc, icone, toast, confirmar, reais, numero } from '../ui.js';

const dataBR = iso => { const d = new Date(String(iso).replace(' ', 'T')); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };
const STATUS = {
  DONE: ['Concluído', 'ok'], PENDING: ['Em andamento', 'espera'], BANK_PROCESSING: ['Em andamento', 'espera'], processando: ['Em andamento', 'espera'],
  FAILED: ['Falhou', 'falha'], CANCELLED: ['Cancelado', 'falha'], falhou: ['Falhou', 'falha'],
};

export async function montar(el, { definirTitulo }) {
  definirTitulo('Financeiro');
  el.innerHTML = '<div class="carregando"><div class="giro"></div><p>Consultando o Asaas…</p></div>';
  let d;
  try { d = await api('financeiro.php'); }
  catch (e) { el.innerHTML = `<section class="bloco"><p class="erro-geral">${esc(e.message)}</p></section>`; return; }

  const prontoParaSacar = d.asaas && d.destino && d.saldo != null;
  el.innerHTML = `
    ${d.ambiente === 'sandbox' ? `<div class="dica-caixa">${icone('alerta', 20)}<p><b>Modo de testes (sandbox).</b> O dinheiro aqui não é real. Para vender de verdade, o servidor precisa estar em produção.</p></div>` : ''}
    <section class="stats" aria-label="Resumo financeiro">
      <div class="stat verde"><span class="stat-ic">${icone('ok', 22)}</span><div><strong>${d.saldo == null ? '—' : reais(d.saldo)}</strong><span>Saldo disponível</span><small>${d.erroSaldo ? esc(d.erroSaldo) : 'Já com as taxas do Asaas descontadas'}</small></div></div>
      <div class="stat rosa"><span class="stat-ic">${icone('estrela', 22)}</span><div><strong>${reais(d.vendas.mes.valor)}</strong><span>Vendas em 30 dias</span><small>${d.vendas.mes.qtd} ${d.vendas.mes.qtd === 1 ? 'venda' : 'vendas'}</small></div></div>
      <div class="stat azul"><span class="stat-ic">${icone('caixa', 22)}</span><div><strong>${reais(d.vendas.total.valor)}</strong><span>Vendas no total</span><small>${d.vendas.total.qtd} ${d.vendas.total.qtd === 1 ? 'venda' : 'vendas'}</small></div></div>
    </section>

    <div class="duas-colunas">
      <section class="bloco">
        <div class="bloco-topo"><h2>Sacar dinheiro</h2></div>
        ${!d.asaas ? '<p class="ajuda">O Asaas ainda não está configurado no servidor.</p>'
          : !d.destino ? `<div class="dica-caixa">${icone('info', 20)}<p>Falta dizer para onde o dinheiro vai. No <b>config.php</b> do servidor, acrescente <code>'saque_tipo'</code> (CPF, CNPJ, EMAIL, PHONE ou EVP) e <code>'saque_chave'</code> (sua chave Pix).</p></div>`
          : `<form id="f-saque" novalidate autocomplete="off">
              <p class="ajuda">O dinheiro vai para: <b>${esc(d.destino.texto)}</b>. Esse destino só pode ser mudado no servidor, por segurança.</p>
              <label for="s-valor">Quanto você quer sacar?</label>
              <div class="linha-valor"><input id="s-valor" inputmode="decimal" placeholder="0,00" ${prontoParaSacar ? '' : 'disabled'}><button type="button" class="botao sec" id="s-tudo" ${prontoParaSacar ? '' : 'disabled'}>Sacar tudo</button></div>
              <label for="s-senha">Sua senha do painel</label><input id="s-senha" type="password" autocomplete="current-password">
              <p class="erro-geral" id="s-erro" role="alert" hidden></p>
              <button class="botao prim" type="submit" ${prontoParaSacar ? '' : 'disabled'}>${icone('enviar', 18)} Sacar por Pix</button>
              <p class="ajuda">O Pix costuma cair na hora. Valor mínimo: R$ 1,00.</p>
            </form>`}
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2>Últimas vendas</h2></div>
        ${d.vendas.ultimas.length ? `<ul class="lista-fin">${d.vendas.ultimas.map(v => `<li><div><b>${esc(v.titulo)}</b><small>${esc(v.cliente)} · ${dataBR(v.data)}</small></div><strong>${reais(v.valor)}</strong></li>`).join('')}</ul>` : '<p class="ajuda">Nenhuma venda paga ainda.</p>'}
      </section>
    </div>

    <section class="bloco">
      <div class="bloco-topo"><h2>Histórico de saques</h2></div>
      ${d.saques.length ? `<ul class="lista-fin">${d.saques.map(s => { const [rot, tom] = STATUS[s.status] ?? [s.status, 'espera']; return `<li><div><b>${reais(s.valor)}</b><small>${dataBR(s.data)} · ${esc(s.destino)}${s.erro ? ` · ${esc(s.erro)}` : ''}</small></div><span class="selo-fin ${tom}">${rot}</span></li>`; }).join('')}</ul>` : '<p class="ajuda">Você ainda não fez nenhum saque.</p>'}
    </section>`;

  const $ = s => el.querySelector(s);
  $('#s-tudo')?.addEventListener('click', () => { $('#s-valor').value = d.saldo.toFixed(2).replace('.', ','); });
  el.onsubmit = async e => {
    if (e.target.id !== 'f-saque') return;
    e.preventDefault();
    const erro = $('#s-erro'); erro.hidden = true;
    const falha = t => { erro.textContent = t; erro.hidden = false; };
    const valor = numero($('#s-valor').value);
    if (!valor || valor < 1) return falha('Digite um valor de pelo menos R$ 1,00.');
    if (valor > d.saldo) return falha(`O valor é maior que o saldo disponível (${reais(d.saldo)}).`);
    if (!$('#s-senha').value) return falha('Digite sua senha para confirmar.');
    const ok = await confirmar({ titulo: `Sacar ${reais(valor)}?`, texto: `O valor será enviado por Pix para ${d.destino.texto}.`, botao: 'Sim, sacar' });
    if (!ok) return;
    const botao = e.submitter; botao.disabled = true;
    try {
      await api('sacar.php', { metodo: 'POST', corpo: { valor, senha: $('#s-senha').value } });
      toast('Saque enviado!');
      montar(el, { definirTitulo });
    } catch (x) { botao.disabled = false; falha(x.message); }
  };
}
