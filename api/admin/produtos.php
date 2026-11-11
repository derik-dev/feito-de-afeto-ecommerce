<?php
// produtos.php do painel (GET): lista TODOS os produtos (inclusive os ocultos) e as categorias já usadas.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

exigir_metodo('GET');
exigir_login();

$produtos = montar_produtos($pdo, false, true);

// Categorias e nichos que já existem, para o formulário oferecer como opções
$categorias = [];
foreach ($produtos as $p) {
    $c = $p['categoria'];
    if (!isset($categorias[$c])) {
        $categorias[$c] = [];
    }
    if ($p['subcategoria'] && !in_array($p['subcategoria'], $categorias[$c], true)) {
        $categorias[$c][] = $p['subcategoria'];
    }
}
$lista = [];
foreach ($categorias as $nome => $subs) {
    $lista[] = ['nome' => $nome, 'subs' => $subs];
}

resposta(['produtos' => $produtos, 'categorias' => $lista]);
