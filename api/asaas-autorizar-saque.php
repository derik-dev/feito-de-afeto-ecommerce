<?php
// asaas-autorizar-saque.php: o Asaas pergunta aqui "posso liberar este saque?" (mecanismo de validação de saque via webhook).
// Resposta: {"status":"APPROVED"} ou {"status":"REFUSED","refuseReason":"..."}.
//
// REGRA DE SEGURANÇA: só aprova um saque que a GENTE mesmo pediu pelo painel (registrado na tabela 'saques'),
// com o mesmo valor e a mesma chave Pix do config.php. Qualquer outra coisa é recusada.
// Token: 'asaas_saque_token' no config.php (o mesmo texto cadastrado em Integrações > Mecanismos de segurança).
ini_set('display_errors', '0');
define('API_INTERNA', 1);
define('ADMIN_API', 1); // reaproveita as peças do financeiro (destino do saque)
require __DIR__ . '/conexao.php';
require __DIR__ . '/_loja.php';
require __DIR__ . '/admin/_saque.php';

function decidir($aprovado, $motivo = '')
{
    http_response_code(200);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($aprovado ? ['status' => 'APPROVED'] : ['status' => 'REFUSED', 'refuseReason' => mb_substr($motivo, 0, 200)], JSON_UNESCAPED_UNICODE);
    if (!$aprovado) {
        error_log('[feito-de-afeto] saque RECUSADO na autorização: ' . $motivo);
    }
    exit;
}

$esperado = (string) config_extra('asaas_saque_token');
$recebido = (string) ($_SERVER['HTTP_ASAAS_ACCESS_TOKEN'] ?? '');
if ($esperado === '' || !hash_equals($esperado, $recebido)) {
    http_response_code(401);
    exit;
}

try {
    $ev = json_decode((string) file_get_contents('php://input', false, null, 0, 50001), true);
    if (!is_array($ev) || ($ev['type'] ?? '') !== 'TRANSFER' || !is_array($ev['transfer'] ?? null)) {
        decidir(false, 'Operação não reconhecida (só saques feitos pelo painel da loja são aprovados).');
    }
    $t   = $ev['transfer'];
    $id  = (string) ($t['id'] ?? '');
    $destino = destino_saque();
    if ($id === '' || !$destino) {
        decidir(false, 'Saque sem identificação ou destino não configurado.');
    }

    // O registro do saque pode levar um instante para ficar pronto (o Asaas pergunta ~5 s depois do pedido)
    $saque = false;
    for ($i = 0; $i < 4 && !$saque; $i++) {
        $q = $pdo->prepare('SELECT id, valor, status, criado_em FROM saques WHERE asaas_id = ?');
        $q->execute([$id]);
        $saque = $q->fetch();
        if (!$saque) {
            sleep(1);
        }
    }
    if (!$saque) {
        decidir(false, 'Saque desconhecido (não foi pedido pelo painel da loja).');
    }
    if (!in_array($saque['status'], ['processando', 'PENDING', 'BANK_PROCESSING'], true)) {
        decidir(false, 'Saque já finalizado ou cancelado.');
    }
    if (strtotime((string) $saque['criado_em']) < time() - 600) {
        decidir(false, 'Saque antigo demais para ser aprovado.');
    }
    if (abs((float) ($t['value'] ?? 0) - (float) $saque['valor']) >= 0.01) {
        decidir(false, 'O valor não confere com o saque pedido.');
    }

    // A chave Pix de destino tem que ser exatamente a do config.php
    [$tipo, $chave] = $destino;
    $enviada = (string) ($t['bankAccount']['pixAddressKey'] ?? '');
    if ($tipo === 'EMAIL' || $tipo === 'EVP') {
        $confere = strtolower(trim($enviada)) === strtolower($chave);
    } else {
        $confere = preg_replace('/\D/', '', $enviada) === $chave || preg_replace('/\D/', '', $enviada) === '55' . $chave;
    }
    if ($enviada === '' || !$confere) {
        decidir(false, 'A chave Pix de destino não confere com a cadastrada no servidor.');
    }

    error_log('[feito-de-afeto] saque ' . $saque['id'] . ' APROVADO na autorização.');
    decidir(true);
} catch (Throwable $e) {
    error_log('[feito-de-afeto] autorizar-saque: ' . $e->getMessage());
    decidir(false, 'Erro interno ao validar o saque.');
}
