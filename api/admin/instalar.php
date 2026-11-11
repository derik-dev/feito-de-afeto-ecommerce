<?php
// instalar.php: cria o PRIMEIRO usuário do painel. Só funciona UMA vez (se já existir usuário, recusa).
// Protegido por uma "chave de instalação" que você escreve no config.php do servidor (veja a chave 'chave_instalacao').
// Depois de criar o usuário, APAGUE este arquivo do servidor.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

function h($t) { return htmlspecialchars((string) $t, ENT_QUOTES, 'UTF-8'); }

$mensagem = '';
$tipo     = 'erro';
$pronto   = false;

$jaTem = (int) $pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn() > 0;

if ($jaTem) {
    $mensagem = 'O painel já está instalado. Por segurança, apague este arquivo (instalar.php) do servidor.';
} elseif ($chaveInstalacao === '' || strlen($chaveInstalacao) < 12) {
    $mensagem = "Falta a chave de instalação. Abra o arquivo config.php do servidor e acrescente a linha  'chave_instalacao' => 'um-texto-longo-e-secreto',  (mínimo 12 letras). Depois recarregue esta página.";
} elseif (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $chave   = (string) ($_POST['chave'] ?? '');
    $usuario = trim((string) ($_POST['usuario'] ?? ''));
    $senha   = (string) ($_POST['senha'] ?? '');
    $senha2  = (string) ($_POST['senha2'] ?? '');

    if (!hash_equals($chaveInstalacao, $chave)) {
        sleep(2); // atrapalha quem tenta adivinhar a chave
        $mensagem = 'Chave de instalação incorreta.';
    } elseif (!preg_match('/^[a-z0-9._-]{3,40}$/', $usuario)) {
        $mensagem = 'O usuário deve ter de 3 a 40 caracteres: letras minúsculas, números, ponto, traço ou sublinhado.';
    } elseif (mb_strlen($senha) < 10) {
        $mensagem = 'A senha precisa ter pelo menos 10 caracteres.';
    } elseif ($senha !== $senha2) {
        $mensagem = 'As duas senhas não são iguais.';
    } else {
        $pdo->prepare('INSERT INTO admins (usuario, senha_hash) VALUES (?, ?)')
            ->execute([$usuario, password_hash($senha, PASSWORD_DEFAULT)]); // a senha NUNCA é guardada: só o "embaralhado" (hash)
        $pronto   = true;
        $tipo     = 'ok';
        $mensagem = 'Usuário criado! Agora APAGUE o arquivo instalar.php do servidor e entre no painel.';
    }
}
$mostrarForm = !$jaTem && !$pronto && $chaveInstalacao !== '' && strlen($chaveInstalacao) >= 12;
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Instalar painel — Feito de Afeto</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fff9fb; color: #14243d; margin: 0; padding: 24px; }
    main { max-width: 440px; margin: 0 auto; background: #fff; border: 1px solid #eadfe5; border-radius: 16px; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    p.d { color: #6f5a68; font-size: 14px; margin: 0 0 18px; }
    label { display: block; font-weight: 600; font-size: 14px; margin: 14px 0 6px; }
    input { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid #e7cbd6; border-radius: 10px; font-size: 16px; }
    button { margin-top: 20px; width: 100%; padding: 13px; border: 0; border-radius: 30px; background: #eb0c59; color: #fff; font-size: 17px; font-weight: 600; cursor: pointer; }
    .msg { padding: 12px 14px; border-radius: 10px; font-size: 14px; margin-bottom: 14px; line-height: 1.45; }
    .erro { background: #fde8ee; color: #9b1239; } .ok { background: #e4f6ec; color: #17623d; }
  </style>
</head>
<body>
<main>
  <h1>Instalar o painel</h1>
  <p class="d">Cria o usuário que vai cadastrar os produtos do site. Isso só pode ser feito uma vez.</p>
  <?php if ($mensagem): ?><div class="msg <?= h($tipo) ?>"><?= h($mensagem) ?></div><?php endif; ?>
  <?php if ($pronto): ?>
    <p><a href="../../admin/">Ir para o painel</a></p>
  <?php endif; ?>
  <?php if ($mostrarForm): ?>
  <form method="post" autocomplete="off">
    <label for="chave">Chave de instalação</label>
    <input id="chave" name="chave" type="password" required>
    <label for="usuario">Usuário (ex.: maria)</label>
    <input id="usuario" name="usuario" required pattern="[a-z0-9._-]{3,40}" autocapitalize="none">
    <label for="senha">Senha (mínimo 10 caracteres)</label>
    <input id="senha" name="senha" type="password" required minlength="10">
    <label for="senha2">Repita a senha</label>
    <input id="senha2" name="senha2" type="password" required minlength="10">
    <button type="submit">Criar usuário</button>
  </form>
  <?php endif; ?>
</main>
</body>
</html>
