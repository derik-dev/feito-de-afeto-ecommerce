<?php
// entrar.php: login do cliente. POST {email, senha}
ini_set('display_errors', '0');
define('API_INTERNA', 1);
require __DIR__ . '/../conexao.php';
require __DIR__ . '/../_cliente.php';
tratar_excecoes_publicas();
exigir_metodo_http('POST');

if (tentativas_recentes($pdo, 'entrar', 15) >= 8) {
    falhar('Muitas tentativas. Aguarde alguns minutos e tente de novo.', 429);
}
$in    = corpo_json_publico();
$email = strtolower(trim((string) ($in['email'] ?? '')));
$senha = (string) ($in['senha'] ?? '');

$q = $pdo->prepare('SELECT id, nome, email, senha_hash FROM clientes WHERE email = ?');
$q->execute([$email]);
$c = $q->fetch();
// Confere a senha mesmo quando o e-mail não existe, para a resposta demorar igual (não revela quais e-mails têm conta)
$hash = $c['senha_hash'] ?? password_hash('x', PASSWORD_DEFAULT);
$ok = password_verify($senha, $hash) && $c;
if (!$ok) {
    registrar_tentativa($pdo, 'entrar');
    falhar('E-mail ou senha incorretos.', 401);
}
if (password_needs_rehash($c['senha_hash'], PASSWORD_DEFAULT)) {
    $pdo->prepare('UPDATE clientes SET senha_hash = ? WHERE id = ?')->execute([password_hash($senha, PASSWORD_DEFAULT), $c['id']]);
}
iniciar_sessao_cliente($pdo, (int) $c['id']);
$f = $pdo->prepare('SELECT produto_id FROM cliente_favoritos WHERE cliente_id = ? ORDER BY criado_em DESC');
$f->execute([$c['id']]);
responder_json(['ok' => true, 'cliente' => ['nome' => $c['nome'], 'email' => $c['email']], 'favoritos' => array_map('strval', $f->fetchAll(PDO::FETCH_COLUMN))]);
