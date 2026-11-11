<?php
// senha.php (POST, JSON {atual, nova}): troca a senha de quem está logado.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

exigir_metodo('POST');
exigir_login();
exigir_csrf();
$d = corpo_json();

$atual = (string) ($d['atual'] ?? '');
$nova  = (string) ($d['nova'] ?? '');
if (mb_strlen($nova) < 10) {
    erro('A nova senha precisa ter pelo menos 10 caracteres.');
}

$busca = $pdo->prepare('SELECT senha_hash FROM admins WHERE id = ?');
$busca->execute([(int) $_SESSION['admin_id']]);
$hash = $busca->fetchColumn();
if (!$hash || !password_verify($atual, $hash)) {
    erro('A senha atual está incorreta.', 401);
}

$pdo->prepare('UPDATE admins SET senha_hash = ? WHERE id = ?')
    ->execute([password_hash($nova, PASSWORD_DEFAULT), (int) $_SESSION['admin_id']]);
resposta(['ok' => true]);
