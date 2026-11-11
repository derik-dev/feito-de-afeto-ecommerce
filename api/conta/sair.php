<?php
// sair.php: encerra o login deste navegador. POST
ini_set('display_errors', '0');
define('API_INTERNA', 1);
require __DIR__ . '/../conexao.php';
require __DIR__ . '/../_cliente.php';
tratar_excecoes_publicas();
exigir_metodo_http('POST');

encerrar_sessao_cliente($pdo);
responder_json(['ok' => true]);
