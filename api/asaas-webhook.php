<?php
// asaas-webhook.php: o Asaas avisa aqui quando um pagamento é confirmado.
// Configure no Asaas (Integrações > Webhooks) com o MESMO token de 'asaas_webhook_token' do config.php.
define('API_INTERNA', 1);
require __DIR__ . '/conexao.php';
require __DIR__ . '/_loja.php';
require __DIR__ . '/_asaas.php';
tratar_excecoes_publicas();

$esperado = (string) config_extra('asaas_webhook_token');
$recebido = (string) ($_SERVER['HTTP_ASAAS_ACCESS_TOKEN'] ?? '');
if ($esperado === '' || !hash_equals($esperado, $recebido)) {
    http_response_code(401);
    exit;
}
$ev = json_decode((string) file_get_contents('php://input'), true);
$evento = (string) ($ev['event'] ?? '');
$idPag  = (string) ($ev['payment']['id'] ?? '');

if (in_array($evento, ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'], true) && $idPag !== '') {
    $q = $pdo->prepare('SELECT id, valor, status FROM pedidos WHERE asaas_pagamento = ?');
    $q->execute([$idPag]);
    $p = $q->fetch();
    // Confere na própria Asaas antes de liberar (não confiamos só no aviso recebido)
    if ($p && $p['status'] !== 'pago' && pagamento_confirmado_no_asaas($idPag, $p['valor'])) {
        marcar_pago($pdo, $p['id']);
    }
}
http_response_code(200); // sempre 200 para o Asaas não pausar a fila
echo 'ok';
