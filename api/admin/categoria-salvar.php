<?php
// categoria-salvar.php (POST, JSON): cria ou renomeia uma categoria ou um nicho (subcategoria).
//   { "tipo": "categoria", "id": 3 (opcional, só para renomear), "nome": "Casamento" }
//   { "tipo": "sub", "categoriaId": 3, "id": 7 (opcional), "nome": "Noivas" }
// Ao renomear, os produtos que usam o nome antigo passam para o novo (o site acompanha).
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

exigir_metodo('POST');
exigir_login();
exigir_csrf();
$d = corpo_json();

$tipo = $d['tipo'] ?? '';
$nome = trim((string) ($d['nome'] ?? ''));
$id   = (int) ($d['id'] ?? 0);
if ($nome === '' || mb_strlen($nome) > 60) {
    erro('Escreva um nome (até 60 letras).');
}

$pdo->beginTransaction();
try {
    if ($tipo === 'categoria') {
        $igual = $pdo->prepare('SELECT id FROM categorias WHERE nome = ? AND id <> ?');
        $igual->execute([$nome, $id]);
        if ($igual->fetch()) {
            $pdo->rollBack();
            erro('Já existe uma categoria com esse nome.');
        }
        if ($id > 0) {
            $atual = $pdo->prepare('SELECT nome FROM categorias WHERE id = ?');
            $atual->execute([$id]);
            $nomeAntigo = $atual->fetchColumn();
            if ($nomeAntigo === false) {
                $pdo->rollBack();
                erro('Categoria não encontrada.', 404);
            }
            $pdo->prepare('UPDATE categorias SET nome = ? WHERE id = ?')->execute([$nome, $id]);
            $pdo->prepare('UPDATE produtos SET categoria = ? WHERE categoria = ?')->execute([$nome, $nomeAntigo]);
        } else {
            $pdo->prepare('INSERT INTO categorias (nome) VALUES (?)')->execute([$nome]);
            $id = (int) $pdo->lastInsertId();
        }
    } elseif ($tipo === 'sub') {
        $categoriaId = (int) ($d['categoriaId'] ?? 0);
        $cat = $pdo->prepare('SELECT nome FROM categorias WHERE id = ?');
        $cat->execute([$categoriaId]);
        $nomeCategoria = $cat->fetchColumn();
        if ($nomeCategoria === false) {
            $pdo->rollBack();
            erro('Categoria não encontrada.', 404);
        }
        $igual = $pdo->prepare('SELECT id FROM subcategorias WHERE categoria_id = ? AND nome = ? AND id <> ?');
        $igual->execute([$categoriaId, $nome, $id]);
        if ($igual->fetch()) {
            $pdo->rollBack();
            erro('Já existe um nicho com esse nome nessa categoria.');
        }
        if ($id > 0) {
            $atual = $pdo->prepare('SELECT nome FROM subcategorias WHERE id = ? AND categoria_id = ?');
            $atual->execute([$id, $categoriaId]);
            $nomeAntigo = $atual->fetchColumn();
            if ($nomeAntigo === false) {
                $pdo->rollBack();
                erro('Nicho não encontrado.', 404);
            }
            $pdo->prepare('UPDATE subcategorias SET nome = ? WHERE id = ?')->execute([$nome, $id]);
            $pdo->prepare('UPDATE produtos SET subcategoria = ? WHERE categoria = ? AND subcategoria = ?')->execute([$nome, $nomeCategoria, $nomeAntigo]);
        } else {
            $pdo->prepare('INSERT INTO subcategorias (categoria_id, nome) VALUES (?, ?)')->execute([$categoriaId, $nome]);
            $id = (int) $pdo->lastInsertId();
        }
    } else {
        $pdo->rollBack();
        erro('Tipo inválido.');
    }
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}

resposta(['ok' => true, 'id' => $id, 'categorias' => listar_categorias($pdo)]);
