<?php
// pedido.php?c=<codigo>: situação do pedido (a página /pedido/ consulta de poucos em poucos segundos).
// Se o webhook ainda não chegou, confere direto no Asaas (no máximo a cada 5 s por pedido).
define('API_INTERNA', 1);
require __DIR__ . '/conexao.php';
require __DIR__ . '/_loja.php';
require __DIR__ . '/_asaas.php';
require __DIR__ . '/_pedido_itens.php';
tratar_excecoes_publicas();

$c = (string) ($_GET['c'] ?? '');
if (!preg_match('/^[a-f0-9]{32}$/', $c)) falhar('Pedido não encontrado.', 404);

$q = $pdo->prepare('SELECT id, produto_id, produto_titulo, valor, status, asaas_pagamento, link_pagamento, token_download, ultima_checagem FROM pedidos WHERE codigo = ?');
$q->execute([$c]);
$p = $q->fetch();
if (!$p) falhar('Pedido não encontrado.', 404);

if ($p['status'] === 'aguardando' && $p['asaas_pagamento'] && asaas_configurado()) {
    $recente = $p['ultima_checagem'] && strtotime($p['ultima_checagem']) > time() - 5;
    if (!$recente) {
        $pdo->prepare('UPDATE pedidos SET ultima_checagem = NOW() WHERE id = ?')->execute([$p['id']]);
        try {
            if (pagamento_confirmado_no_asaas($p['asaas_pagamento'], $p['valor'])) {
                marcar_pago($pdo, $p['id']);
                $q->execute([$c]);
                $p = $q->fetch();
            }
        } catch (RuntimeException $e) {
            error_log('[feito-de-afeto] pedido: ' . $e->getMessage());
        }
    }
}

$pago = $p['status'] === 'pago' && $p['token_download'];

// Pix: QR Code e "copia e cola" (só quando a página pede, na primeira consulta)
$pix = null;
if ($p['status'] === 'aguardando' && !empty($_GET['pix']) && $p['asaas_pagamento'] && asaas_configurado()) {
    try {
        [$s, $qr] = asaas_requisicao('GET', '/payments/' . rawurlencode($p['asaas_pagamento']) . '/pixQrCode');
        if ($s === 200 && !empty($qr['payload'])) {
            $pix = ['imagem' => (string) ($qr['encodedImage'] ?? ''), 'codigo' => (string) $qr['payload'], 'expira' => $qr['expirationDate'] ?? null];
        }
    } catch (RuntimeException $e) {
        error_log('[feito-de-afeto] pix: ' . $e->getMessage());
    }
}

$linhas = arquivos_do_pedido($pdo, $p['id']);
if (!$linhas) $linhas = [['item_id' => null, 'produto_id' => $p['produto_id'], 'titulo' => $p['produto_titulo'], 'valor' => $p['valor']]];
$itens = array_map(function ($item) use ($p, $pago) {
    return [
        'id' => $item['produto_id'] === null ? null : (string) $item['produto_id'],
        'titulo' => $item['titulo'] . (!empty($item['multiplos_pdfs']) ? ' · ' . $item['nome_original'] : ''), 'valor' => (float) $item['valor'],
        'download' => $pago && isset($item['arquivo_id']) ? 'api/baixar.php?t=' . $p['token_download'] . ($item['item_id'] ? '&i=' . (int) $item['item_id'] : '') . '&a=' . (int) $item['arquivo_id'] : null,
    ];
}, $linhas);
responder_json([
    'pix'       => $pix,
    'status'    => $p['status'],
    'produto'   => $p['produto_titulo'],
    'itens'     => $itens,
    'valor'     => (float) $p['valor'],
    'download'  => $pago ? 'api/baixar.php?t=' . $p['token_download'] : null,
    'pagamento' => $pago ? null : $p['link_pagamento'],
]);
