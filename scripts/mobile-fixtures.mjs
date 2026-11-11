// Dados exclusivos da conferência visual. Não autentica nem altera o servidor real.
import { PRODUTOS } from '../src/data/produtos.js';

export const produtosQA = PRODUTOS.map(p => ({ ...p, ativo: true, temArquivo: true, pdf: null }));
const cliente = { id: 1, nome: 'Cliente de conferência no celular', email: 'conferencia.responsiva@example.com' };
const categorias = [...new Set(produtosQA.map(p => p.categoria))].map((nome, i) => ({
  id: i + 1, nome, total: produtosQA.filter(p => p.categoria === nome).length,
  subs: [...new Set(produtosQA.filter(p => p.categoria === nome).map(p => p.subcategoria).filter(Boolean))]
    .map((sub, j) => ({ id: i * 10 + j + 1, nome: sub, total: produtosQA.filter(p => p.subcategoria === sub).length })),
}));

export async function instalarFixtures(page, { adminLogado = true } = {}) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') return route.fulfill({ status: 405, json: { erro: 'Conferência visual: gravações desativadas.' } });
    let json;
    if (path.endsWith('/admin/sessao.php')) json = { instalado: true, logado: adminLogado, usuario: 'Administradora de conferência', csrf: 'qa-layout-only' };
    else if (path.endsWith('/admin/produtos.php')) json = { produtos: produtosQA.map(p => ({ ...p, imagens: p.imagens.map(i => ({ ...i, src: i.src.replace(/^\//, '') })) })) };
    else if (path.endsWith('/admin/categorias.php')) json = { categorias };
    else if (path.endsWith('/admin/financeiro.php')) json = {
      asaas: true, ambiente: 'sandbox', saldo: 1750.35, destino: { texto: 'CPF de conferência · final 1234' },
      vendas: { mes: { valor: 1250, qtd: 25 }, total: { valor: 2500, qtd: 50 }, ultimas: [{ titulo: produtosQA[0].titulo, cliente: cliente.nome, data: '2026-11-11 10:00:00', valor: 34.9 }] },
      saques: [{ valor: 100, destino: 'CPF de conferência · final 1234', data: '2026-11-11 10:00:00', status: 'DONE' }],
    };
    else if (path.endsWith('/produtos.php')) json = produtosQA;
    else if (path.endsWith('/conta/eu.php')) json = { logado: !page.url().includes('/entrar/'), cliente, favoritos: ['1', '6'] };
    else if (path.endsWith('/conta/pedidos.php')) json = { pedidos: [
      { codigo: 'a'.repeat(32), produtoId: '1', titulo: produtosQA[0].titulo, valor: produtosQA[0].preco, status: 'pago', data: '2026-11-11 09:00:00', download: 'api/baixar.php?t=' + 'b'.repeat(48) },
      { codigo: 'c'.repeat(32), produtoId: '6', titulo: produtosQA[5].titulo, valor: produtosQA[5].preco, status: 'aguardando', data: '2026-11-11 10:00:00', download: null },
    ] };
    else if (path.endsWith('/pedido.php')) {
      const pago = new URL(request.url()).searchParams.get('c') === 'b'.repeat(32);
      json = {
        status: pago ? 'pago' : 'aguardando', produto: pago ? '2 arquivos digitais Feito de Afeto' : produtosQA[0].titulo,
        valor: pago ? produtosQA[0].preco + produtosQA[1].preco : produtosQA[0].preco,
        download: pago ? 'api/baixar.php?t=' + 'b'.repeat(48) : null,
        itens: produtosQA.slice(0, 2).map((p, i) => ({ id: p.id, titulo: p.titulo, valor: p.preco, download: pago ? 'api/baixar.php?t=' + 'b'.repeat(48) + '&i=' + (i + 1) : null })),
        pix: pago ? null : { imagem: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', codigo: '000201010212'.repeat(20), expira: '2026-11-12' },
      };
    }
    else return route.fulfill({ status: 404, json: { erro: 'Não há dados para esta conferência.' } });
    await route.fulfill({ json });
  });
}
