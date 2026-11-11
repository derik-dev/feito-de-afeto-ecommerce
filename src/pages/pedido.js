// Página /pedido/?c=codigo: mostra o Pix (QR Code + copia e cola), acompanha o pagamento e libera o PDF.
import { renderHeader, renderFooter, iniciarHeader } from '../components/layout.js';
import { moeda, escapeHtml, urlSite } from '../lib/format.js';
import { carrinho } from '../lib/storage.js';

const app = document.querySelector('#app');
const codigo = new URLSearchParams(location.search).get('c') ?? '';

app.innerHTML = `${renderHeader({ barra: false })}<main class="container" id="conteudo"><div class="ck-centro" id="palco" aria-live="polite"></div></main>${renderFooter()}`;
iniciarHeader();
const palco = document.querySelector('#palco');

let vista = '';      // qual tela está desenhada (para não redesenhar o QR Code a cada consulta)
let pix = null;      // QR Code guardado só na memória desta página
let timer;

function desenhar(chave, html, depois) {
  if (vista === chave) return;
  vista = chave;
  palco.innerHTML = html;
  depois?.();
}

async function copiar(texto, botao) {
  try { await navigator.clipboard.writeText(texto); }
  catch { const t = document.querySelector('#pix-codigo'); t.select(); document.execCommand('copy'); }
  const antes = botao.textContent;
  botao.textContent = 'Código copiado!';
  setTimeout(() => { botao.textContent = antes; }, 2200);
}

async function checar(primeira = false) {
  try {
    const r = await fetch(`${urlSite('api/pedido.php')}?c=${encodeURIComponent(codigo)}${primeira ? '&pix=1' : ''}`, { cache: 'no-store' });
    if (r.status === 404) return desenhar('nao-achou', `<div class="ck-icone">?</div><h1>Pedido não encontrado</h1><p class="ck-sub">Confira o link recebido por e-mail.</p><a class="button button-primary" href="${urlSite('catalogo/')}">Ver catálogo</a>`);
    const p = await r.json();
    if (p.pix) pix = p.pix;

    if (p.status === 'pago' && p.download) {
      const arquivos = p.itens?.filter(i => i.download) ?? [];
      if (arquivos.length) carrinho.removerComprados(arquivos.map(i => i.id).filter(Boolean));
      return desenhar('pago', `<div class="ck-icone ok">✓</div><h1>Pagamento confirmado!</h1>
        <p class="ck-sub"><b>${escapeHtml(p.produto)}</b> está liberado. Também enviamos o link para o seu e-mail.</p>
        ${arquivos.length > 1 ? `<ul class="ck-downloads">${arquivos.map(i => `<li><span>${escapeHtml(i.titulo)}</span><a class="button button-primary" href="${escapeHtml(urlSite(i.download))}">Baixar PDF</a></li>`).join('')}</ul>` : `<a class="button button-primary" href="${escapeHtml(urlSite(p.download))}">Baixar o meu PDF</a>`}
        <p class="ck-nota">O link é só seu: não compartilhe.</p>`);
    }
    if (p.status === 'cancelado') {
      return desenhar('cancelado', `<div class="ck-icone">!</div><h1>Pagamento não concluído</h1><p class="ck-sub">Esse pedido foi cancelado. Você pode tentar de novo.</p><a class="button button-primary" href="${urlSite('catalogo/')}">Voltar ao catálogo</a>`);
    }

    if (pix) {
      desenhar('pix', `<h1>Pague com Pix</h1>
        <p class="ck-sub"><b>${escapeHtml(p.produto)}</b> · ${moeda(p.valor)}</p>
        <div class="ck-pix">
          ${pix.imagem ? `<img src="data:image/png;base64,${pix.imagem}" alt="QR Code do Pix" width="220" height="220">` : ''}
          <ol class="ck-passos-pix"><li>Abra o app do seu banco e escolha <b>Pix</b>.</li><li>Leia o QR Code ou use o <b>Pix copia e cola</b>.</li><li>Confirme. O PDF aparece aqui sozinho.</li></ol>
          <label class="ck-label" for="pix-codigo">Pix copia e cola</label>
          <textarea id="pix-codigo" readonly rows="3">${escapeHtml(pix.codigo)}</textarea>
          <button type="button" class="button button-primary" id="pix-copiar">Copiar código Pix</button>
          <p class="ck-espera"><span class="ck-bolinha"></span>Aguardando o pagamento…</p>
        </div>`, () => {
        const b = document.querySelector('#pix-copiar');
        b.addEventListener('click', () => copiar(pix.codigo, b));
      });
    } else {
      desenhar('espera', `<div class="ck-icone">⏳</div><h1>Aguardando a confirmação</h1>
        <p class="ck-sub">${escapeHtml(p.produto)} · ${moeda(p.valor)}. Assim que o pagamento for confirmado, o download aparece aqui sozinho.</p>`);
    }
    timer = setTimeout(() => checar(false), 4000);
  } catch {
    timer = setTimeout(() => checar(!pix), 6000);
  }
}

if (!codigo) desenhar('sem', `<h1>Nenhum pedido informado</h1><a class="button button-primary" href="${urlSite('catalogo/')}">Ver catálogo</a>`);
else checar(true);
addEventListener('pagehide', () => clearTimeout(timer));
