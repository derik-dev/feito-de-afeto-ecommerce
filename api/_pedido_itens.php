<?php
// Itens de um pagamento com vários PDFs. Pedidos antigos continuam funcionando sem esta tabela.
if (!defined('API_INTERNA')) { http_response_code(403); exit; }

function preparar_tabela_itens(PDO $pdo)
{
    try { $pdo->query('SELECT id FROM pedido_itens LIMIT 0'); return; }
    catch (PDOException $e) { if ($e->getCode() !== '42S02') throw $e; }
    $pdo->exec("CREATE TABLE IF NOT EXISTS pedido_itens (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        pedido_id INT UNSIGNED NOT NULL,
        produto_id INT UNSIGNED NULL,
        titulo VARCHAR(200) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        downloads INT UNSIGNED NOT NULL DEFAULT 0,
        UNIQUE KEY uk_pedido_item (pedido_id, produto_id),
        CONSTRAINT fk_item_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
        CONSTRAINT fk_item_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function itens_do_pedido(PDO $pdo, $pedidoId)
{
    static $ausente = false;
    if ($ausente) return [];
    try {
        $q = $pdo->prepare('SELECT id AS item_id, produto_id, titulo, valor, downloads
            FROM pedido_itens WHERE pedido_id = ? ORDER BY id');
        $q->execute([(int) $pedidoId]);
        return $q->fetchAll();
    } catch (PDOException $e) {
        if ($e->getCode() === '42S02') { $ausente = true; return []; }
        throw $e;
    }
}

/** PDFs de cada produto do pedido, incluindo compras antigas sem pedido_itens. */
function arquivos_do_pedido(PDO $pdo, $pedidoId)
{
    $itens = itens_do_pedido($pdo, $pedidoId);
    if (!$itens) {
        $q = $pdo->prepare('SELECT NULL AS item_id, produto_id, produto_titulo AS titulo, valor, downloads FROM pedidos WHERE id = ?');
        $q->execute([(int) $pedidoId]);
        $itens = $q->fetchAll();
    }
    $q = $pdo->prepare('SELECT id AS arquivo_id, arquivo, nome_original FROM produto_arquivos WHERE produto_id = ? ORDER BY id');
    $saida = [];
    foreach ($itens as $item) {
        $q->execute([$item['produto_id']]);
        $pdfs = $q->fetchAll();
        foreach ($pdfs as $pdf) {
            $saida[] = array_merge($item, $pdf, ['multiplos_pdfs' => count($pdfs) > 1]);
        }
    }
    return $saida;
}

/** O limite de downloads é independente para cada PDF de um produto com vários arquivos. */
function preparar_tabela_downloads(PDO $pdo)
{
    try { $pdo->query('SELECT pedido_id FROM pedido_arquivo_downloads LIMIT 0'); return; }
    catch (PDOException $e) { if ($e->getCode() !== '42S02') throw $e; }
    $pdo->exec("CREATE TABLE IF NOT EXISTS pedido_arquivo_downloads (
        pedido_id INT UNSIGNED NOT NULL,
        arquivo_id INT UNSIGNED NOT NULL,
        downloads INT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (pedido_id, arquivo_id),
        CONSTRAINT fk_download_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
        CONSTRAINT fk_download_arquivo FOREIGN KEY (arquivo_id) REFERENCES produto_arquivos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
