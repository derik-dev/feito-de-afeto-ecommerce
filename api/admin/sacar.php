<?php
// sacar.php (POST, JSON {valor, senha}): transfere saldo do Asaas para a chave Pix FIXA do config.php.
// Travas: login + CSRF + senha digitada de novo + limite de tentativas + 1 saque por vez + destino só no servidor.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';
require __DIR__ . '/_saque.php';

exigir_metodo('POST');
exigir_login();
exigir_csrf();
$d = corpo_json();

if (!asaas_configurado()) erro('O Asaas ainda não está configurado no servidor.', 503);
$destino = destino_saque();
if (!$destino) erro('Falta configurar a chave Pix de destino no servidor (saque_chave e saque_tipo no config.php).', 503);

$valor = round((float) ($d['valor'] ?? 0), 2);
if ($valor < 1) erro('O valor mínimo do saque é R$ 1,00.');

// Senha de novo (proteção extra para uma ação com dinheiro) + limite de erros
$ip = substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
$q = $pdo->prepare('SELECT COUNT(*) FROM login_tentativas WHERE ip = ? AND quando > (NOW() - INTERVAL 15 MINUTE)');
$q->execute([$ip]);
if ((int) $q->fetchColumn() >= 5) erro('Muitas tentativas. Aguarde alguns minutos.', 429);
$q = $pdo->prepare('SELECT senha_hash FROM admins WHERE id = ?');
$q->execute([(int) $_SESSION['admin_id']]);
$hash = $q->fetchColumn();
if (!$hash || !password_verify((string) ($d['senha'] ?? ''), $hash)) {
    $pdo->prepare('INSERT INTO login_tentativas (ip) VALUES (?)')->execute([$ip]);
    erro('Senha incorreta.', 403);
}

// Só um saque por vez (evita clique duplo)
$q = $pdo->query("SELECT COUNT(*) FROM saques WHERE status = 'processando' AND criado_em > (NOW() - INTERVAL 2 MINUTE)");
if ((int) $q->fetchColumn() > 0) erro('Já existe um saque sendo processado. Aguarde um instante.', 409);

$saqueId = 0;
try {
    [$st, $saldo] = asaas_requisicao('GET', '/finance/balance');
    if ($st !== 200 || !isset($saldo['balance'])) erro('Não consegui conferir o saldo no Asaas. Tente de novo.', 502);
    if ($valor > round((float) $saldo['balance'], 2)) erro('O valor é maior que o saldo disponível.');

    $pdo->prepare("INSERT INTO saques (admin_id, valor, status, destino, ip) VALUES (?, ?, 'processando', ?, ?)")
        ->execute([(int) $_SESSION['admin_id'], $valor, destino_mascarado()['texto'], $ip]);
    $saqueId = (int) $pdo->lastInsertId();

    [$st, $t] = asaas_requisicao('POST', '/transfers', [
        'value'             => $valor,
        'operationType'     => 'PIX',
        'pixAddressKey'     => $destino[1],
        'pixAddressKeyType' => $destino[0],
        'description'       => 'Saque Feito de Afeto',
    ]);
    if ($st !== 200 || empty($t['id'])) {
        $motivo = asaas_resumo_erro($t);
        error_log('[feito-de-afeto] saque recusado: ' . $st . ' ' . $motivo);
        $pdo->prepare("UPDATE saques SET status = 'falhou', erro = ? WHERE id = ?")->execute([substr($motivo, 0, 255), $saqueId]);
        erro('O Asaas recusou o saque: ' . $motivo, 502);
    }
    $pdo->prepare('UPDATE saques SET asaas_id = ?, status = ? WHERE id = ?')
        ->execute([substr((string) $t['id'], 0, 60), substr((string) ($t['status'] ?? 'PENDING'), 0, 30), $saqueId]);
    resposta(['ok' => true, 'status' => $t['status'] ?? 'PENDING']);
} catch (RuntimeException $e) {
    error_log('[feito-de-afeto] sacar: ' . $e->getMessage());
    if ($saqueId) {
        $pdo->prepare("UPDATE saques SET status = 'falhou', erro = 'Sem conexão com o Asaas' WHERE id = ?")->execute([$saqueId]);
    }
    erro('Não consegui falar com o Asaas. Confira o painel do Asaas antes de tentar de novo.', 502);
}
