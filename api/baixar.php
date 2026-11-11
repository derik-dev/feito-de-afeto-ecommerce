<?php
// baixar.php?t=<token>: entrega o PDF para quem pagou. Limites: 'max_downloads' (padrão 10) e 'dias_download' (padrão 30).
define('API_INTERNA', 1);
require __DIR__ . '/conexao.php';
require __DIR__ . '/_loja.php';
require __DIR__ . '/_arquivos.php';
require __DIR__ . '/_pedido_itens.php';
tratar_excecoes_publicas();

$t = (string) ($_GET['t'] ?? '');
if (!preg_match('/^[a-f0-9]{48}$/', $t)) falhar('Link inválido.', 404);

$q = $pdo->prepare("SELECT p.id, p.codigo, p.downloads, p.pago_em, p.produto_titulo
    FROM pedidos p
    WHERE p.token_download = ? AND p.status = 'pago'");
$q->execute([$t]);
$p = $q->fetch();
if (!$p) falhar('Link inválido ou expirado.', 404);
$itens = arquivos_do_pedido($pdo, $p['id']);
$itemId = null;
$i = isset($_GET['i']) ? (string) $_GET['i'] : null;
$a = isset($_GET['a']) ? (string) $_GET['a'] : null;
if (($i !== null && !ctype_digit($i)) || ($a !== null && !ctype_digit($a))) falhar('Arquivo inválido.', 404);
$candidatos = array_values(array_filter($itens, function ($item) use ($i, $a) {
    return ($i === null || (string) $item['item_id'] === $i) && ($a === null || (string) $item['arquivo_id'] === $a);
}));
if (!$candidatos) falhar('Arquivo indisponível. Fale com a loja.', 404);
if (count($candidatos) > 1) {
    header('Location: ' . url_do_site() . '/pedido/?c=' . rawurlencode($p['codigo']));
    exit;
}
$selecionado = $candidatos[0];
$itemId = $selecionado['item_id'] ? (int) $selecionado['item_id'] : null;
$p['downloads'] = $selecionado['downloads'];
$p['arquivo'] = $selecionado['arquivo'];
$p['produto_titulo'] = $selecionado['titulo'];

$max  = (int) config_extra('max_downloads', 10);
$dias = (int) config_extra('dias_download', 30);
if (!$selecionado['multiplos_pdfs'] && (int) $p['downloads'] >= $max) falhar('Limite de downloads atingido. Fale com a loja.', 403);
if (strtotime((string) $p['pago_em']) < time() - $dias * 86400) falhar('Este link expirou. Fale com a loja.', 403);

$caminho = caminho_do_pdf($p['arquivo']);
if (!$caminho || !is_file($caminho)) {
    error_log('[feito-de-afeto] PDF ausente para o pedido ' . $p['id']);
    falhar('Arquivo indisponível. Fale com a loja.', 500);
}
if ($selecionado['multiplos_pdfs']) {
    preparar_tabela_downloads($pdo);
    $pdo->prepare('INSERT IGNORE INTO pedido_arquivo_downloads (pedido_id, arquivo_id) VALUES (?, ?)')->execute([$p['id'], $selecionado['arquivo_id']]);
    $contador = $pdo->prepare('UPDATE pedido_arquivo_downloads SET downloads = downloads + 1 WHERE pedido_id = ? AND arquivo_id = ? AND downloads < ?');
    $contador->execute([$p['id'], $selecionado['arquivo_id'], $max]);
} else {
    $contador = $itemId
        ? $pdo->prepare('UPDATE pedido_itens SET downloads = downloads + 1 WHERE id = ? AND pedido_id = ? AND downloads < ?')
        : $pdo->prepare('UPDATE pedidos SET downloads = downloads + 1 WHERE id = ? AND downloads < ?');
    $contador->execute($itemId ? [$itemId, $p['id'], $max] : [$p['id'], $max]);
}
if ($contador->rowCount() !== 1) falhar('Limite de downloads atingido. Fale com a loja.', 403);

$nome = $selecionado['multiplos_pdfs'] ? limpar_nome_de_arquivo($selecionado['nome_original']) : limpar_nome_de_arquivo($p['produto_titulo']) . '.pdf';
if (!preg_match('/\.pdf$/i', $nome)) $nome .= '.pdf';
$ascii = trim(preg_replace('/[^A-Za-z0-9._-]+/', '-', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $nome) ?: 'produto.pdf'), '-');
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . ($ascii ?: 'produto.pdf') . '"; filename*=UTF-8\'\'' . rawurlencode($nome));
header('Content-Length: ' . filesize($caminho));
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
readfile($caminho);
