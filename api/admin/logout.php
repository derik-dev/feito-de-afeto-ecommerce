<?php
// logout.php (POST): encerra a sessão (sair do painel).
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

exigir_metodo('POST');
exigir_csrf();

$_SESSION = [];
session_destroy();
resposta(['ok' => true]);
