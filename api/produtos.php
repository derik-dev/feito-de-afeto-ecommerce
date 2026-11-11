<?php
// produtos.php: devolve os produtos ativos do banco em JSON. SÓ LEITURA (não recebe nem grava nada).
// O formato é o mesmo que o site usa em src/data/produtos.js, então o site não precisa de adaptações.
// Endereço:  /feito-de-afeto/api/produtos.php

header('Content-Type: application/json; charset=utf-8');
define('API_INTERNA', 1);
require __DIR__ . '/conexao.php';   // cria o $pdo (e já responde 500 sozinho se o banco falhar)
require __DIR__ . '/_produtos.php'; // montar_produtos()

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['erro' => 'Método não permitido']);
    exit;
}

try {
    $saida = montar_produtos($pdo, true);
    // Só depois de dar tudo certo: deixa o navegador guardar a resposta por 1 minuto (alivia o servidor).
    header('Cache-Control: public, max-age=60');
    echo json_encode($saida, JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    error_log('[feito-de-afeto] produtos.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['erro' => 'Falha ao ler os produtos']);
}
