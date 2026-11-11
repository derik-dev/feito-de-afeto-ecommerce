import { icon } from '../lib/icons.js';
import { moeda } from '../lib/format.js';
import { temDesconto, percentualDesconto } from '../lib/filtros.js';

export const PARCELAS = 3;

/** Texto "em 3x de R$ 13,30 sem juros" (usado no BuyBox, nos cards e na coluna central). */
export const textoParcelamento = preco => `em ${PARCELAS}x de ${moeda(preco / PARCELAS)} sem juros`;

/** Caixa de compra (coluna da direita). O CSS a deixa "sticky" no computador. */
export function BuyBox(p) {
  const desconto = temDesconto(p);
  return `
  <aside class="bb" aria-label="Comprar este produto">
    ${desconto ? `<p class="bb-economia"><span>${percentualDesconto(p)}% OFF</span> Você economiza ${moeda(p.precoOriginal - p.preco)}</p>` : ''}
    ${desconto ? `<p class="bb-old"><s>${moeda(p.precoOriginal)}</s></p>` : ''}
    <p class="bb-price"><strong>${moeda(p.preco)}</strong></p>
    <p class="bb-inst">${textoParcelamento(p.preco)}</p>
    <ul class="bb-info">
      <li>${icon('download')}<span><b>Download imediato</b> assim que o pagamento for confirmado</span></li>
      <li>${icon('printer')}<span>Arquivo <b>${p.formato}</b> com ${p.paginas} ${p.paginas === 1 ? 'página' : 'páginas'}, pronto para imprimir</span></li>
    </ul>
    <div class="bb-actions">
      ${p.temArquivo === false
        ? '<button type="button" class="button button-primary" disabled>Disponível em breve</button>'
        : `<button type="button" class="button button-primary" data-comprar="${p.id}">Comprar agora</button>`}
      <button type="button" class="button bb-secondary" data-adicionar="${p.id}">${icon('cart')}Adicionar ao carrinho</button>
    </div>
    <ul class="bb-trust">
      <li>${icon('shield')}<span><b>Compra segura</b> com seus dados protegidos</span></li>
      <li>${icon('file')}<span><b>Produto digital:</b> nenhum item físico é enviado</span></li>
    </ul>
    <button type="button" class="bb-share" data-compartilhar>${icon('mail')}Compartilhar este produto</button>
  </aside>`;
}

/** Barra de compra fixa no rodapé do celular (aparece quando a caixa de compra sai da tela). */
export function BarraCompraMobile(p) {
  return `
  <div class="bm" data-barra-mobile aria-hidden="true">
    <div><strong>${moeda(p.preco)}</strong><span>${textoParcelamento(p.preco)}</span></div>
    <button type="button" class="button button-primary" data-comprar="${p.id}" tabindex="-1">Comprar agora</button>
  </div>`;
}
