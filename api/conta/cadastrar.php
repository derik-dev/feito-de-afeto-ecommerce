<?php
// cadastrar.php: cria a conta do cliente e já deixa a pessoa logada. POST {nome, email, senha}
ini_set('display_errors', '0');
define('API_INTERNA', 1);
require __DIR__ . '/../conexao.php';
require __DIR__ . '/../_cliente.php';
tratar_excecoes_publicas();
exigir_metodo_http('POST');

if (tentativas_recentes($pdo, 'cadastrar', 60) >= 5) {
    falhar('Muitas contas criadas por aqui. Tente de novo mais tarde.', 429);
}
$in    = corpo_json_publico();
$nome  = trim(preg_replace('/\s+/', ' ', (string) ($in['nome'] ?? '')));
$email = strtolower(trim((string) ($in['email'] ?? '')));
$senha = (string) ($in['senha'] ?? '');

if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100) falhar('Digite seu nome.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) falhar('Digite um e-mail válido.');
senha_aceitavel($senha);

$q = $pdo->prepare('SELECT id FROM clientes WHERE email = ?');
$q->execute([$email]);
if ($q->fetch()) {
    falhar('Já existe uma conta com este e-mail. Entre na sua conta.', 409);
}
registrar_tentativa($pdo, 'cadastrar');
$pdo->prepare('INSERT INTO clientes (nome, email, senha_hash) VALUES (?, ?, ?)')
    ->execute([$nome, $email, password_hash($senha, PASSWORD_DEFAULT)]);
$id = (int) $pdo->lastInsertId();
iniciar_sessao_cliente($pdo, $id);
responder_json(['ok' => true, 'cliente' => ['nome' => $nome, 'email' => $email], 'favoritos' => []]);
