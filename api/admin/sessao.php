<?php
// sessao.php (GET): informa se há alguém logado e entrega o código de segurança (CSRF) da sessão.
// O painel chama este arquivo assim que abre.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

exigir_metodo('GET');

$instalado = (int) $pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn() > 0;

resposta([
    'instalado' => $instalado,                          // false = ainda não foi criado nenhum usuário
    'logado'    => admin_logado(),
    'usuario'   => admin_logado() ? ($_SESSION['usuario'] ?? '') : '',
    'csrf'      => token_csrf(),
]);
