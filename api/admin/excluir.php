<?php
// excluir.php (POST, JSON {id}): apaga um produto e as fotos dele que ficaram sem uso.
// (Para só tirar do site sem apagar, use "ocultar" no painel, que não perde nada.)
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';
require __DIR__ . '/../_arquivos.php';

exigir_metodo('POST');
exigir_login();
exigir_csrf();
$d  = corpo_json();
$id = (int) ($d['id'] ?? 0);
if ($id <= 0) {
    erro('Produto inválido.');
}

$fotos = $pdo->prepare('SELECT arquivo FROM produto_imagens WHERE produto_id = ?');
$fotos->execute([$id]);
$arquivos = array_column($fotos->fetchAll(), 'arquivo');

// PDF do produto (guardamos o nome antes de apagar o produto; se a tabela ainda não existir, segue sem PDF)
$pdfsDoProduto = [];
try {
    $q = $pdo->prepare('SELECT arquivo FROM produto_arquivos WHERE produto_id = ?');
    $q->execute([$id]);
    $pdfsDoProduto = $q->fetchAll(PDO::FETCH_COLUMN);
} catch (PDOException $e) {
    $pdfsDoProduto = [];
}

// tags, fotos e "incluso" são apagados junto (ON DELETE CASCADE nas tabelas)
$apagar = $pdo->prepare('DELETE FROM produtos WHERE id = ?');
$apagar->execute([$id]);
if ($apagar->rowCount() === 0) {
    erro('Produto não encontrado.', 404);
}

remover_fotos_orfas($arquivos);
remover_pdfs_orfaos($pdo, $pdfsDoProduto);
resposta(['ok' => true]);
