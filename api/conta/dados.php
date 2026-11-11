<?php
// dados.php: muda o nome ou a senha. POST {nome} ou {senhaAtual, senhaNova}
ini_set('display_errors', '0');
define('API_INTERNA', 1);
require __DIR__ . '/../conexao.php';
require __DIR__ . '/../_cliente.php';
tratar_excecoes_publicas();
exigir_metodo_http('POST');

$c  = exigir_cliente($pdo);
$in = corpo_json_publico();

if (isset($in['senhaNova'])) {
    if (tentativas_recentes($pdo, 'entrar', 15) >= 8) {
        falhar('Muitas tentativas. Aguarde alguns minutos.', 429);
    }
    $q = $pdo->prepare('SELECT senha_hash FROM clientes WHERE id = ?');
    $q->execute([$c['id']]);
    if (!password_verify((string) ($in['senhaAtual'] ?? ''), (string) $q->fetchColumn())) {
        registrar_tentativa($pdo, 'entrar');
        falhar('A senha atual está incorreta.', 403);
    }
    senha_aceitavel((string) $in['senhaNova']);
    $pdo->prepare('UPDATE clientes SET senha_hash = ? WHERE id = ?')->execute([password_hash((string) $in['senhaNova'], PASSWORD_DEFAULT), $c['id']]);
    // Por segurança, sai de todos os OUTROS aparelhos (mantém este)
    $atual = hash('sha256', (string) ($_COOKIE[COOKIE_CLIENTE] ?? ''));
    $pdo->prepare('DELETE FROM cliente_sessoes WHERE cliente_id = ? AND token_hash <> ?')->execute([$c['id'], $atual]);
    responder_json(['ok' => true]);
}
if (isset($in['nome'])) {
    $nome = trim(preg_replace('/\s+/', ' ', (string) $in['nome']));
    if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100) falhar('Digite seu nome.');
    $pdo->prepare('UPDATE clientes SET nome = ? WHERE id = ?')->execute([$nome, $c['id']]);
    responder_json(['ok' => true, 'cliente' => ['nome' => $nome, 'email' => $c['email']]]);
}
falhar('Nada para alterar.');
