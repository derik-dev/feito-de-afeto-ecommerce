<?php
// categorias.php (GET): lista as categorias e os nichos (subcategorias), com a quantidade de produtos de cada um.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

exigir_metodo('GET');
exigir_login();

// Autocura: se algum produto usa uma categoria/nicho que ainda não está na lista, cadastra agora.
$pdo->exec('INSERT IGNORE INTO categorias (nome) SELECT DISTINCT categoria FROM produtos');
$pdo->exec("INSERT IGNORE INTO subcategorias (categoria_id, nome)
            SELECT DISTINCT c.id, p.subcategoria FROM produtos p JOIN categorias c ON c.nome = p.categoria
            WHERE p.subcategoria IS NOT NULL AND p.subcategoria <> ''");

resposta(['categorias' => listar_categorias($pdo)]);
