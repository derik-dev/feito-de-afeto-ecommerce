import { renderHeader, renderFooter, iniciarHeader } from '../components/layout.js';
import { carrinho } from '../lib/storage.js';
import { listarProdutos } from '../services/produtos.js';
import { moeda, escapeHtml, urlSite, urlProduto } from '../lib/format.js';
import { icon } from '../lib/icons.js';

const produtos = await listarProdutos();
const app = document.querySelector('#app');
document.body.classList.add('pagina-carrinho');
app.innerHTML = `${renderHeader()}<main class="container ct" id="conteudo">
  <header class="ct-head"><div><p class="ct-eyebrow">ESCOLHIDOS COM CARINHO</p><h1>Meu carrinho</h1><p>Seus próximos projetos começam aqui.</p></div><a class="ct-voltar" href="${urlSite('catalogo/')}">Continuar escolhendo ${icon('arrow')}</a></header>
  <div id="ct-conteudo"></div><p class="sr-only" role="status" id="ct-status"></p>
</main>${renderFooter()}<div class="ct-mobile" id="ct-mobile" hidden></div>`;
iniciarHeader();

function desenhar() {
  const linhas = carrinho.listar();
  const itens = linhas.map(l => produtos.find(p => String(p.id) === l.id)).filter(Boolean);
  const disponiveis = itens.filter(p => p.temArquivo !== false);
  const pendencias = linhas.length - disponiveis.length;
  const podeComprar = disponiveis.length > 0 && !pendencias;
  const total = disponiveis.reduce((s, p) => s + Math.round(p.preco * 100), 0) / 100;
  const resumo = `${disponiveis.length} ${disponiveis.length === 1 ? 'arquivo digital' : 'arquivos digitais'}`;
  const checkout = urlSite('comprar/?carrinho=1');
  const area = document.querySelector('#ct-conteudo');
  const barra = document.querySelector('#ct-mobile');
  document.body.classList.toggle('ct-com-itens', disponiveis.length > 0);
  barra.hidden = !disponiveis.length;
  if (!linhas.length) {
    area.innerHTML = `<section class="ct-empty">${icon('bag')}<h2>Um carrinho cheio de possibilidades</h2><p>Escolha seus arquivos favoritos e adicione-os por aqui.</p><a class="button button-primary" href="${urlSite('catalogo/')}">Explorar o catálogo ${icon('arrow')}</a></section>`;
    barra.innerHTML = '';
    return;
  }
  area.innerHTML = `<div class="ct-layout"><section aria-label="Arquivos no carrinho">
    ${pendencias ? `<p class="ct-aviso" role="status">${pendencias === 1 ? 'Um arquivo não está disponível para compra.' : 'Alguns arquivos não estão disponíveis para compra.'} <button type="button" data-ct-indisponiveis>Remover itens indisponíveis</button></p>` : ''}
    <ul class="ct-lista">${itens.map(p => `<li class="ct-item" data-ct-item="${escapeHtml(p.id)}">
      <a class="ct-foto" href="${urlProduto(p.slug)}" tabindex="-1" aria-hidden="true"><img src="${escapeHtml(p.imagens[0].src)}" alt="" width="84" height="105" /></a>
      <div class="ct-info"><span class="ct-categoria">${escapeHtml(p.categoria)}</span><h2><a href="${urlProduto(p.slug)}">${escapeHtml(p.titulo)}</a></h2><p>${p.temArquivo === false ? 'Indisponível para compra' : `${p.quantidadeArquivos ?? 1} ${(p.quantidadeArquivos ?? 1) === 1 ? 'arquivo PDF' : 'arquivos PDF'} · download digital`}</p><button type="button" class="ct-remover" data-ct-remover="${escapeHtml(p.id)}" aria-label="Remover ${escapeHtml(p.titulo)}">${icon('close')} Remover</button></div>
      <strong class="ct-preco">${moeda(p.preco)}</strong>
    </li>`).join('')}</ul>
    <p class="ct-digital">${icon('file')}<span>Produtos digitais em PDF. Você recebe os arquivos para imprimir; nenhum produto físico é enviado.</span></p>
  </section><aside class="ct-resumo" aria-label="Resumo do carrinho"><h2>Resumo do pedido</h2><p class="ct-linha"><span>${resumo}</span><strong>${moeda(total)}</strong></p><p class="ct-linha ct-total"><span>Total</span><strong>${moeda(total)}</strong></p>
    ${podeComprar ? `<a class="button button-primary ct-finalizar" href="${checkout}">Finalizar compra ${icon('arrow')}</a>` : '<p class="ct-aviso">Remova os itens indisponíveis para continuar.</p>'}
    <p class="ct-seguro">${icon('shield')} Compra segura com Pix ou cartão</p><p class="ct-pequeno">Uma cópia de cada arquivo, sem itens duplicados.</p>
  </aside></div>`;
  barra.innerHTML = `<div><span>${resumo}</span><strong>${moeda(total)}</strong></div>${podeComprar ? `<a class="button button-primary" href="${checkout}">Continuar ${icon('arrow')}</a>` : '<button class="button button-primary" disabled>Revisar itens</button>'}`;
}
document.addEventListener('click', e => {
  const remover = e.target.closest('[data-ct-remover]');
  if (remover) {
    const id = remover.dataset.ctRemover;
    const ids = carrinho.listar().map(i => i.id), index = ids.indexOf(id);
    carrinho.remover(id);
    document.querySelector('#ct-status').textContent = 'Arquivo removido do carrinho.';
    const proximo = document.querySelectorAll('[data-ct-remover]')[Math.min(index, carrinho.total() - 1)];
    (proximo || document.querySelector('[data-ct-indisponiveis]') || document.querySelector('.ct-empty a'))?.focus();
  }
  if (e.target.closest('[data-ct-indisponiveis]')) {
    const ids = carrinho.listar().filter(l => !produtos.some(p => String(p.id) === l.id && p.temArquivo !== false)).map(l => l.id);
    carrinho.removerComprados(ids);
  }
});
addEventListener('afeto:carrinho', desenhar);
desenhar();
