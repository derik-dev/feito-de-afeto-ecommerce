<?php
// categoria-excluir.php (POST, JSON {tipo, id}): apaga uma categoria ou um nicho, mas SÓ se nenhum produto usar.
// (Assim ninguém perde produto sem querer: primeiro mude os produtos para outra categoria.)
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

exigir_metodo('POST');
exigir_login();
exigir_csrf();
$d = corpo_json();

$tipo = $d['tipo'] ?? '';
$id   = (int) ($d['id'] ?? 0);
if ($id <= 0) {
    erro('Item inválido.');
}

if ($tipo === 'categoria') {
    $busca = $pdo->prepare('SELECT nome FROM categorias WHERE id = ?');
    $busca->execute([$id]);
    $nome = $busca->fetchColumn();
    if ($nome === false) {
        erro('Categoria não encontrada.', 404);
    }
    $usa = $pdo->prepare('SELECT COUNT(*) FROM produtos WHERE categoria = ?');
    $usa->execute([$nome]);
    if ((int) $usa->fetchColumn() > 0) {
        erro('Ainda há produtos nessa categoria. Mude esses produtos para outra categoria antes de excluir.');
    }
    $pdo->prepare('DELETE FROM categorias WHERE id = ?')->execute([$id]); // os nichos dela saem junto (ON DELETE CASCADE)
} elseif ($tipo === 'sub') {
    $busca = $pdo->prepare('SELECT s.nome, c.nome AS categoria FROM subcategorias s JOIN categorias c ON c.id = s.categoria_id WHERE s.id = ?');
    $busca->execute([$id]);
    $linha = $busca->fetch();
    if (!$linha) {
        erro('Nicho não encontrado.', 404);
    }
    $usa = $pdo->prepare('SELECT COUNT(*) FROM produtos WHERE categoria = ? AND subcategoria = ?');
    $usa->execute([$linha['categoria'], $linha['nome']]);
    if ((int) $usa->fetchColumn() > 0) {
        erro('Ainda há produtos nesse nicho. Mude esses produtos antes de excluir.');
    }
    $pdo->prepare('DELETE FROM subcategorias WHERE id = ?')->execute([$id]);
} else {
    erro('Tipo inválido.');
}

resposta(['ok' => true, 'categorias' => listar_categorias($pdo)]);
