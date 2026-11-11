<?php
// teste.php: confere se o PHP consegue falar com o banco. Abra /feito-de-afeto/api/teste.php no navegador.
// Depois que funcionar, APAGUE este arquivo do servidor (não precisa ficar no ar).
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/conexao.php';

try {
    $pdo->query('SELECT 1'); // pergunta simples só para provar que o banco responde
    echo json_encode(['status' => 'conectado!']);
} catch (PDOException $e) {
    error_log('[feito-de-afeto] teste.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['erro' => 'Conectou, mas o banco não respondeu']);
}
