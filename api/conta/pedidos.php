<?php
// pedidos.php: as compras do cliente logado. GET
ini_set('display_errors', '0');
define('API_INTERNA', 1);
require __DIR__ . '/../conexao.php';
require __DIR__ . '/../_cliente.php';
require __DIR__ . '/../_pedido_itens.php';
tratar_excecoes_publicas();
exigir_metodo_http('GET');

$c = exigir_cliente($pdo);
$q = $pdo->prepare("SELECT p.id, p.codigo, p.produto_id, p.produto_titulo, p.valor, p.status, p.token_download, p.criado_em, p.pago_em
    FROM pedidos p JOIN cliente_pedidos cp ON cp.pedido_id = p.id
    WHERE cp.cliente_id = ? AND p.status <> 'cancelado' ORDER BY p.id DESC LIMIT 100");
$q->execute([$c['id']]);
$saida = [];
foreach ($q->fetchAll() as $p) {
    $pago = $p['status'] === 'pago' && $p['token_download'];
    $quantidade = max(1, count(arquivos_do_pedido($pdo, $p['id'])));
    $saida[] = [
        'codigo'   => $p['codigo'],
        'produtoId' => $p['produto_id'] === null ? null : (string) $p['produto_id'],
        'titulo'   => $p['produto_titulo'],
        'quantidade' => $quantidade,
        'valor'    => (float) $p['valor'],
        'status'   => $p['status'],
        'data'     => $p['pago_em'] ?: $p['criado_em'],
        'download' => $pago ? ($quantidade > 1 ? 'pedido/?c=' . $p['codigo'] : 'api/baixar.php?t=' . $p['token_download']) : null,
    ];
}
responder_json(['pedidos' => $saida]);
