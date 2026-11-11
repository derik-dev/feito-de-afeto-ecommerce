<?php
// login.php (POST): confere usuário e senha. Tem proteção contra tentativas em massa:
// depois de 5 erros seguidos, aquele endereço (IP) fica 15 minutos sem poder tentar de novo.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

exigir_metodo('POST');
exigir_csrf();
$dados = corpo_json();

$usuario = trim((string) ($dados['usuario'] ?? ''));
$senha   = (string) ($dados['senha'] ?? '');
$ip      = substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45);

// Faxina: tentativas com mais de 1 dia não interessam mais
$pdo->exec('DELETE FROM login_tentativas WHERE quando < (NOW() - INTERVAL 1 DAY)');

$conta = $pdo->prepare('SELECT COUNT(*) FROM login_tentativas WHERE ip = ? AND quando > (NOW() - INTERVAL 15 MINUTE)');
$conta->execute([$ip]);
if ((int) $conta->fetchColumn() >= 5) {
    erro('Muitas tentativas erradas. Espere 15 minutos e tente de novo.', 429);
}

$busca = $pdo->prepare('SELECT id, senha_hash FROM admins WHERE usuario = ?');
$busca->execute([$usuario]);
$admin = $busca->fetch();

if (!$admin || !password_verify($senha, $admin['senha_hash'])) {
    $pdo->prepare('INSERT INTO login_tentativas (ip) VALUES (?)')->execute([$ip]);
    erro('Usuário ou senha incorretos.', 401);
}

// Deu certo: zera as tentativas, troca o identificador da sessão (evita "sequestro de sessão") e entra.
$pdo->prepare('DELETE FROM login_tentativas WHERE ip = ?')->execute([$ip]);
session_regenerate_id(true);
$_SESSION['admin_id'] = (int) $admin['id'];
$_SESSION['usuario']  = $usuario;
$_SESSION['ultimo']   = time();
unset($_SESSION['csrf']); // um código novo para a sessão nova

resposta(['ok' => true, 'usuario' => $usuario, 'csrf' => token_csrf()]);
