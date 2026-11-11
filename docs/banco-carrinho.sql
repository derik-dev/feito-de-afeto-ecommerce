-- Aplicação opcional antecipada. A aplicação também cria esta tabela, se necessário,
-- antes de processar o primeiro pedido com vários arquivos (nenhuma cobrança antes disso).
CREATE TABLE IF NOT EXISTS pedido_itens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT UNSIGNED NOT NULL,
  produto_id INT UNSIGNED NULL,
  titulo VARCHAR(200) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  downloads INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uk_pedido_item (pedido_id, produto_id),
  CONSTRAINT fk_item_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
