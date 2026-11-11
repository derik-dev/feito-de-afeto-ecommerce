-- Atualização sem apagar arquivos existentes. Pode executar mais de uma vez.
SET NAMES utf8mb4;

SET @indice_antigo = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'produto_arquivos'
    AND INDEX_NAME = 'uk_arquivo_produto' AND NON_UNIQUE = 0);
SET @atualizar_pdfs = IF(@indice_antigo > 0,
  'ALTER TABLE produto_arquivos ADD KEY idx_arquivo_produto (produto_id), DROP INDEX uk_arquivo_produto',
  'SELECT 1');
PREPARE atualizar_pdfs FROM @atualizar_pdfs;
EXECUTE atualizar_pdfs;
DEALLOCATE PREPARE atualizar_pdfs;

CREATE TABLE IF NOT EXISTS pedido_arquivo_downloads (
  pedido_id INT UNSIGNED NOT NULL,
  arquivo_id INT UNSIGNED NOT NULL,
  downloads INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (pedido_id, arquivo_id),
  CONSTRAINT fk_download_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_download_arquivo FOREIGN KEY (arquivo_id) REFERENCES produto_arquivos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
