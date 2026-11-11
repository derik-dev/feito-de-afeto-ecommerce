// Página /comprar/?produto=slug: dados do cliente + escolha Pix ou cartão, tudo aqui no site.
// CARTÃO: os dados só existem nos campos da tela e na requisição para o servidor.
// Nada vai para localStorage/sessionStorage/URL/cookie, e os campos são apagados logo após o envio.
import { iniciarMovimento } from '../motion.js';
import { renderHeader, renderFooter, iniciarHeader } from '../components/layout.js';
import { moeda, escapeHtml, urlSite, urlProduto } from '../lib/format.js';
import { buscarProdutoPorSlug, listarProdutos } from '../services/produtos.js';
import { carrinho } from '../lib/storage.js';
import { eu } from '../lib/conta.js';

const app = document.querySelector('#app');
const params = new URLSearchParams(location.search);
const slug = params.get('produto') ?? '';
const modoCarrinho = params.get('carrinho') === '1';
const todos = modoCarrinho ? await listarProdutos() : [];
const linhas = modoCarrinho ? carrinho.listar() : [];
const selecionados = modoCarrinho ? linhas.map(l => todos.find(p => String(p.id) === l.id)) : [await buscarProdutoPorSlug(slug)];
const produto = selecionados[0];
const itensCompra = selecionados.filter(Boolean);
const total = itensCompra.reduce((s, p) => s + Math.round(p.preco * 100), 0) / 100;
const voltarCompra = modoCarrinho ? 'comprar/?carrinho=1' : `comprar/?produto=${encodeURIComponent(slug)}`;

const moldura = miolo => `${renderHeader({ barra: false })}<main class="container" id="conteudo">${miolo}</main>${renderFooter()}`;

const soNumeros = t => t.replace(/\D/g, '');
function luhn(n) {
  n = soNumeros(n);
  if (n.length < 13 || n.length > 19) return false;
  let soma = 0;
  for (let i = 0; i < n.length; i++) {
    let d = +n[n.length - 1 - i];
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    soma += d;
  }
  return soma % 10 === 0;
}

if (!produto || selecionados.some(p => !p || p.temArquivo === false)) {
  app.innerHTML = moldura(modoCarrinho
    ? `<div class="ck-centro"><h1>${linhas.length ? 'Revise seu carrinho' : 'Seu carrinho está vazio'}</h1><p class="ck-sub">${linhas.length ? 'Um dos arquivos não está disponível. Remova-o do carrinho para continuar.' : 'Escolha seus arquivos favoritos antes de continuar.'}</p><a class="button button-primary" href="${urlSite(linhas.length ? 'carrinho/' : 'catalogo/')}">${linhas.length ? 'Voltar ao carrinho' : 'Ver catálogo'}</a></div>`
    : `<div class="ck-centro"><h1>Produto indisponível</h1><p class="ck-sub">Esse arquivo não está à venda no momento.</p><a class="button button-primary" href="${urlSite('catalogo/')}">Ver catálogo</a></div>`);
  iniciarHeader();
} else {
  // Só compra quem está logado: se não estiver, vai entrar/criar conta e volta para cá
  const sessao = await eu(true);
  if (!sessao.logado) {
    location.replace(urlSite(`entrar/?voltar=${encodeURIComponent(voltarCompra)}`));
    await new Promise(() => {});
  }
  const foto = produto.imagens?.[0];
  app.innerHTML = moldura(`
    <div class="ck">
      <form class="ck-card" id="form" novalidate autocomplete="on">
        <h1>Finalizar compra</h1>
        <p class="ck-sub">Preencha seus dados e escolha como pagar. O PDF é liberado na hora em que o pagamento é confirmado.</p>
        <label for="nome">Nome</label><input id="nome" name="nome" value="${escapeHtml(sessao.cliente.nome)}" readonly>
        <label for="email">E-mail (o link do PDF também vai para ele)</label><input id="email" name="email" value="${escapeHtml(sessao.cliente.email)}" readonly>
        <p class="ck-nota">Comprando como <b>${escapeHtml(sessao.cliente.nome)}</b>. Para mudar, acesse <a href="${urlSite('conta/#dados')}">Minha conta</a>.</p>
        <label for="cpf">CPF ou CNPJ</label><input id="cpf" name="cpf" inputmode="numeric" autocomplete="off" required>

        <p class="ck-label">Forma de pagamento</p>
        <div class="ck-metodos" role="radiogroup" aria-label="Forma de pagamento">
          <label class="ck-metodo"><input type="radio" name="metodo" value="pix" checked><span><b>Pix</b><small>Aprovação na hora</small></span></label>
          <label class="ck-metodo"><input type="radio" name="metodo" value="cartao"><span><b>Cartão de crédito</b><small>À vista</small></span></label>
        </div>

        <div id="area-cartao" hidden>
          <label for="c-numero">Número do cartão</label><input id="c-numero" inputmode="numeric" autocomplete="cc-number" maxlength="23" placeholder="0000 0000 0000 0000">
          <label for="c-nome">Nome impresso no cartão</label><input id="c-nome" autocomplete="cc-name" maxlength="60">
          <div class="ck-duas">
            <div><label for="c-validade">Validade</label><input id="c-validade" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/AA"></div>
            <div><label for="c-cvv">Código (CVV)</label><input id="c-cvv" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="123"></div>
          </div>
          <div class="ck-duas">
            <div><label for="c-cep">CEP</label><input id="c-cep" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000"></div>
            <div><label for="c-end">Nº do endereço</label><input id="c-end" autocomplete="off" maxlength="10"></div>
          </div>
          <label for="c-tel">Celular com DDD</label><input id="c-tel" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="15" placeholder="(11) 90000-0000">
          <p class="ck-seguro">🔒 Os dados do cartão vão direto para o Asaas, que processa o pagamento. <b>Não ficam salvos</b> em nenhum lugar do nosso site.</p>
        </div>

        <p class="ck-erro" id="erro" role="alert"></p>
        <button class="button button-primary ck-btn" id="ir" type="submit">Gerar Pix</button>
      </form>
      <aside class="ck-card">
        ${modoCarrinho ? `<h2 class="ck-resumo-titulo">Seus arquivos</h2><ul class="ck-itens">${itensCompra.map(p => `<li><img src="${escapeHtml(p.imagens[0].src)}" alt="" width="48" height="60"><div><b>${escapeHtml(p.titulo)}</b><span>${moeda(p.preco)}</span></div></li>`).join('')}</ul>` : `<div class="ck-resumo">
          ${foto ? `<img src="${escapeHtml(foto.src)}" alt="">` : ''}
          <div><b>${escapeHtml(produto.titulo)}</b><small>${escapeHtml(produto.formato ?? 'PDF')} · download digital</small></div>
        </div>`}
        <p class="ck-total"><span>Total</span><strong>${moeda(total)}</strong></p>
        <p class="ck-nota"><a href="${modoCarrinho ? urlSite('carrinho/') : urlProduto(produto.slug)}">${modoCarrinho ? '← Revisar carrinho' : '← Voltar ao produto'}</a></p>
      </aside>
    </div>`);
  iniciarHeader();
  iniciarMovimento();

  const $ = s => document.querySelector(s);
  const form = $('#form'), erro = $('#erro'), botao = $('#ir'), areaCartao = $('#area-cartao');
  const metodo = () => form.elements.metodo.value;
  const rotuloBotao = () => (metodo() === 'cartao' ? `Pagar ${moeda(total)}` : 'Gerar Pix');

  const mascara = (el, fn) => el.addEventListener('input', () => { el.value = fn(el.value); });
  mascara($('#cpf'), v => { const n = soNumeros(v).slice(0, 14); return n.length <= 11 ? n.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, a, b, c, d) => [a, b, c].filter(Boolean).join('.') + (d ? '-' + d : '')) : n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5'); });
  mascara($('#c-numero'), v => soNumeros(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '));
  mascara($('#c-validade'), v => { const n = soNumeros(v).slice(0, 4); return n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n; });
  mascara($('#c-cvv'), v => soNumeros(v).slice(0, 4));
  mascara($('#c-cep'), v => { const n = soNumeros(v).slice(0, 8); return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n; });
  mascara($('#c-tel'), v => { const n = soNumeros(v).slice(0, 11); return n.length > 6 ? `(${n.slice(0, 2)}) ${n.slice(2, n.length - 4)}-${n.slice(-4)}` : n.length > 2 ? `(${n.slice(0, 2)}) ${n.slice(2)}` : n; });

  form.addEventListener('change', e => {
    if (e.target.name !== 'metodo') return;
    areaCartao.hidden = metodo() !== 'cartao';
    botao.textContent = rotuloBotao();
    erro.textContent = '';
  });

  const limparCartao = () => ['#c-numero', '#c-nome', '#c-validade', '#c-cvv'].forEach(s => { $(s).value = ''; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    erro.textContent = '';
    const falha = t => { erro.textContent = t; return null; };
    const nome = $('#nome').value.trim(), email = $('#email').value.trim(), cpf = $('#cpf').value;
    if (![11, 14].includes(soNumeros(cpf).length)) return falha('Digite um CPF ou CNPJ válido.');

    const corpo = { ...(modoCarrinho ? { itens: itensCompra.map(p => p.slug) } : { slug: produto.slug }), nome, email, cpf, metodo: metodo() };
    if (metodo() === 'cartao') {
      const val = soNumeros($('#c-validade').value);
      const mes = +val.slice(0, 2), ano = 2000 + +val.slice(2, 4);
      const agora = new Date();
      if (!luhn($('#c-numero').value)) return falha('Número do cartão inválido.');
      if ($('#c-nome').value.trim().length < 3) return falha('Digite o nome como está no cartão.');
      if (val.length !== 4 || mes < 1 || mes > 12 || ano < agora.getFullYear() || (ano === agora.getFullYear() && mes < agora.getMonth() + 1)) return falha('Validade do cartão inválida.');
      if (!/^\d{3,4}$/.test($('#c-cvv').value)) return falha('Código de segurança (CVV) inválido.');
      if (soNumeros($('#c-cep').value).length !== 8) return falha('Digite o CEP (8 números).');
      if (!$('#c-end').value.trim()) return falha('Digite o número do endereço.');
      if (![10, 11].includes(soNumeros($('#c-tel').value).length)) return falha('Digite o celular com DDD.');
      corpo.cartao = { numero: $('#c-numero').value, nome: $('#c-nome').value.trim(), validade: $('#c-validade').value, cvv: $('#c-cvv').value };
      corpo.cep = $('#c-cep').value; corpo.numeroEndereco = $('#c-end').value.trim(); corpo.telefone = $('#c-tel').value;
    }

    botao.disabled = true; botao.textContent = metodo() === 'cartao' ? 'Processando o pagamento…' : 'Gerando o Pix…';
    try {
      const r = await fetch(urlSite('api/comprar.php'), { method: 'POST', cache: 'no-store', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { location.href = urlSite(`entrar/?voltar=${encodeURIComponent(voltarCompra)}`); return; }
      if (!r.ok || !j.codigo) throw new Error(j.erro || 'Não foi possível iniciar o pagamento.');
      limparCartao();
      location.href = urlSite(`pedido/?c=${j.codigo}`);
    } catch (x) {
      erro.textContent = x.message;
      botao.disabled = false; botao.textContent = rotuloBotao();
    } finally {
      delete corpo.cartao; // não deixa o cartão em memória mais tempo que o necessário
    }
  });
}
