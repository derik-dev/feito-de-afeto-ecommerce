<?php
// financeiro.php (GET): saldo no Asaas, resumo das vendas e histórico de saques.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';
require __DIR__ . '/_saque.php';

exigir_metodo('GET');
exigir_login();

$saida = [
    'asaas'     => asaas_configurado(),
    'ambiente'  => asaas_ambiente(),
    'saldo'     => null,
    'erroSaldo' => null,
    'destino'   => destino_mascarado(),
];

// Saldo disponível (consulta direta no Asaas)
if ($saida['asaas']) {
    try {
        [$st, $d] = asaas_requisicao('GET', '/finance/balance');
        if ($st === 200 && isset($d['balance'])) {
            $saida['saldo'] = round((float) $d['balance'], 2);
        } else {
            $saida['erroSaldo'] = 'O Asaas não devolveu o saldo (erro ' . $st . ').';
            error_log('[feito-de-afeto] saldo: ' . $st . ' ' . asaas_resumo_erro($d));
        }
    } catch (RuntimeException $e) {
        $saida['erroSaldo'] = 'Não consegui falar com o Asaas agora.';
        error_log('[feito-de-afeto] saldo: ' . $e->getMessage());
    }
}

// Atualiza o status dos saques que ainda estavam em andamento
try {
    $abertos = $pdo->query("SELECT id, asaas_id FROM saques WHERE asaas_id IS NOT NULL AND status IN ('PENDING','BANK_PROCESSING') ORDER BY id DESC LIMIT 5")->fetchAll();
    foreach ($abertos as $a) {
        [$st, $t] = asaas_requisicao('GET', '/transfers/' . rawurlencode($a['asaas_id']));
        if ($st === 200 && !empty($t['status'])) {
            $pdo->prepare('UPDATE saques SET status = ?, erro = ? WHERE id = ?')
                ->execute([substr((string) $t['status'], 0, 30), isset($t['failReason']) ? substr((string) $t['failReason'], 0, 255) : null, $a['id']]);
        }
    }
} catch (Throwable $e) {
    error_log('[feito-de-afeto] saques status: ' . $e->getMessage());
}

// Vendas (do nosso banco)
$tot = $pdo->query("SELECT COUNT(*) n, COALESCE(SUM(valor),0) v FROM pedidos WHERE status = 'pago'")->fetch();
$mes = $pdo->query("SELECT COUNT(*) n, COALESCE(SUM(valor),0) v FROM pedidos WHERE status = 'pago' AND pago_em > (NOW() - INTERVAL 30 DAY)")->fetch();
$ultimas = [];
foreach ($pdo->query("SELECT produto_titulo, valor, nome, pago_em FROM pedidos WHERE status = 'pago' ORDER BY pago_em DESC LIMIT 8")->fetchAll() as $p) {
    $ultimas[] = ['titulo' => $p['produto_titulo'], 'valor' => (float) $p['valor'], 'cliente' => $p['nome'], 'data' => $p['pago_em']];
}
$saida['vendas'] = [
    'total'   => ['qtd' => (int) $tot['n'], 'valor' => (float) $tot['v']],
    'mes'     => ['qtd' => (int) $mes['n'], 'valor' => (float) $mes['v']],
    'ultimas' => $ultimas,
];
$saques = [];
foreach ($pdo->query('SELECT valor, status, destino, erro, criado_em FROM saques ORDER BY id DESC LIMIT 15')->fetchAll() as $s) {
    $saques[] = ['valor' => (float) $s['valor'], 'status' => $s['status'], 'destino' => $s['destino'], 'erro' => $s['erro'], 'data' => $s['criado_em']];
}
$saida['saques'] = $saques;
resposta($saida);
