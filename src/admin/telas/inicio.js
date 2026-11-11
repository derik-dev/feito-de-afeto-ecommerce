// Tela "Início": resumo da loja e atalhos.
import { estado } from '../estado.js';
import { enderecoFoto, BASE } from '../api.js';
import { esc, icone, reais } from '../ui.js';

const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

export function montar(el, { definirTitulo }) {
  definirTitulo('Início');
  const { produtos, categorias } = estado;
  const noSite = produtos.filter(p => p.ativo).length;
  const ocultos = produtos.length - noSite;
  const nichos = categorias.reduce((s, c) => s + c.subs.length, 0);
  const recentes = produtos.slice(-5).reverse();
  // p.pdf === null = o servidor informou que o produto NÃO tem PDF (undefined = servidor antigo, não sabemos)
  const semPdf = produtos.filter(p => p.pdf === null);

  const card = (rotulo, valor, nota, ic, cor, rota) => `
    <a class="stat ${cor}" href="#/${rota}"><span class="stat-ic">${icone(ic, 22)}</span><div><strong>${valor}</strong><span>${rotulo}</span>${nota ? `<small>${nota}</small>` : ''}</div></a>`;

  el.innerHTML = `
    <section class="boas-vindas">
      <div><h2>${saudacao()}, ${esc(estado.usuario)}! <span aria-hidden="true">👋</span></h2><p>Aqui você cuida dos produtos da loja. Tudo que salvar aparece no site em até 1 minuto.</p></div>
      <a class="botao prim" href="#/produtos/novo">${icone('mais', 18)} Cadastrar produto</a>
    </section>

    ${semPdf.length ? `<div class="dica-caixa aviso-pdf" role="alert">${icone('alerta', 22)}<p><b>${semPdf.length} ${semPdf.length === 1 ? 'produto está' : 'produtos estão'} sem PDF.</b> O cliente não consegue comprar um produto sem PDF, porque não haveria o que baixar. Abra o produto e envie o arquivo: <a class="link" href="#/produtos/editar/${semPdf[0].id}">${esc(semPdf[0].titulo)}</a>${semPdf.length > 1 ? ` e mais ${semPdf.length - 1}` : ''}.</p></div>` : ''}

    <section class="stats" aria-label="Resumo">
      ${card('Produtos no site', noSite, ocultos ? `${ocultos} oculto${ocultos > 1 ? 's' : ''}` : 'Todos visíveis', 'caixa', 'rosa', 'produtos')}
      ${card('Categorias', categorias.length, '', 'pasta', 'azul', 'categorias')}
      ${card('Nichos', nichos, 'Grupos dentro das categorias', 'estrela', 'ouro', 'categorias')}
      ${card('Total cadastrado', produtos.length, '', 'imagem', 'verde', 'produtos')}
    </section>

    <div class="duas-colunas">
      <section class="bloco">
        <div class="bloco-topo"><h2>Últimos produtos</h2><a class="link" href="#/produtos">Ver todos</a></div>
        ${recentes.length ? `<ul class="recentes">${recentes.map(p => `
          <li><a href="#/produtos/editar/${p.id}"><img src="${enderecoFoto(p.imagens[0]?.src)}" alt="" loading="lazy">
            <div><b>${esc(p.titulo)}</b><span>${esc(p.categoria)}${p.subcategoria ? ' › ' + esc(p.subcategoria) : ''}</span></div>
            <div class="dir"><b>${reais(p.preco)}</b><span class="selo-st ${p.ativo ? 'on' : 'off'}">${p.ativo ? 'No site' : 'Oculto'}</span></div></a></li>`).join('')}</ul>`
          : `<div class="vazio">${icone('caixa', 36)}<p>Você ainda não cadastrou nenhum produto.</p><a class="botao prim" href="#/produtos/novo">Cadastrar o primeiro</a></div>`}
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2>Atalhos</h2></div>
        <div class="atalhos">
          <a href="#/produtos/novo">${icone('mais')}<div><b>Novo produto</b><span>Cadastre com fotos, preço e descrição</span></div></a>
          <a href="#/financeiro">${icone('dinheiro')}<div><b>Financeiro</b><span>Veja o saldo e saque por Pix</span></div></a>
          <a href="#/categorias">${icone('pasta')}<div><b>Categorias e nichos</b><span>Organize o catálogo do site</span></div></a>
          <a href="${BASE}" target="_blank" rel="noopener">${icone('externo')}<div><b>Ver o site</b><span>Abre a loja em outra aba</span></div></a>
        </div>
        <div class="dica-caixa">${icone('info', 20)}<p><b>Dica:</b> fotos na vertical (como a capa de uma agenda) ficam melhores. O painel recorta e deixa leve sozinho.</p></div>
      </section>
    </div>`;
}
