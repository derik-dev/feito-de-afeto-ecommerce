<?php
// favoritos.php: guarda os favoritos na conta. POST {acao:'alternar', produto, ligado} ou {acao:'mesclar', produtos:[...]}
ini_set('display_errors', '0');
define('API_INTERNA', 1);
require __DIR__ . '/../conexao.php';
require __DIR__ . '/../_cliente.php';
tratar_excecoes_publicas();
exigir_metodo_http('POST');

$c  = exigir_cliente($pdo);
$in = corpo_json_publico();

/** Só ids que existem de verdade na tabela de produtos. */
function ids_existentes(PDO $pdo, array $ids)
{
    $ids = array_values(array_unique(array_filter(array_map('intval', array_filter($ids, fn($x) => is_scalar($x) && preg_match('/^\d{1,10}$/', (string) $x))))));
    $ids = array_slice($ids, 0, 500);
    if (!$ids) {
        return [];
    }
    $q = $pdo->prepare('SELECT id FROM produtos WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')');
    $q->execute($ids);
    return array_map('intval', $q->fetchAll(PDO::FETCH_COLUMN));
}

$acao = (string) ($in['acao'] ?? '');
if ($acao === 'alternar') {
    $ids = ids_existentes($pdo, [$in['produto'] ?? null]);
    if (!$ids) falhar('Produto não encontrado.', 404);
    if (!empty($in['ligado'])) {
        $pdo->prepare('INSERT IGNORE INTO cliente_favoritos (cliente_id, produto_id) VALUES (?, ?)')->execute([$c['id'], $ids[0]]);
    } else {
        $pdo->prepare('DELETE FROM cliente_favoritos WHERE cliente_id = ? AND produto_id = ?')->execute([$c['id'], $ids[0]]);
    }
} elseif ($acao === 'mesclar') {
    $lista = is_array($in['produtos'] ?? null) ? $in['produtos'] : [];
    $ins = $pdo->prepare('INSERT IGNORE INTO cliente_favoritos (cliente_id, produto_id) VALUES (?, ?)');
    foreach (ids_existentes($pdo, $lista) as $id) {
        $ins->execute([$c['id'], $id]);
    }
} else {
    falhar('Ação inválida.');
}
$f = $pdo->prepare('SELECT produto_id FROM cliente_favoritos WHERE cliente_id = ? ORDER BY criado_em DESC');
$f->execute([$c['id']]);
responder_json(['ok' => true, 'favoritos' => array_map('strval', $f->fetchAll(PDO::FETCH_COLUMN))]);
