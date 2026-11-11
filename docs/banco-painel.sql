-- Tabelas do painel de cadastro. Importe no phpMyAdmin (aba "Importar"). Pode importar mais de uma vez.
SET NAMES utf8mb4;

-- Ajuste das fotos já importadas: "agendas/x.webp" vira "images/agendas/x.webp" (pode rodar várias vezes)
UPDATE produto_imagens SET arquivo = CONCAT('images/', arquivo) WHERE arquivo NOT LIKE 'images/%' AND arquivo NOT LIKE 'uploads/%';
-- ── Painel de cadastro ──
CREATE TABLE IF NOT EXISTS admins (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario    VARCHAR(40)  NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,   -- a senha NUNCA é guardada: só o "embaralhado" (hash), que não volta ao original
  criado_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admins_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_tentativas (
  id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip     VARCHAR(45)  NOT NULL,
  quando TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tentativas_ip (ip, quando)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categorias e nichos (subcategorias) que o painel gerencia. O produto guarda o NOME da categoria/nicho.
CREATE TABLE IF NOT EXISTS categorias (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome      VARCHAR(60)  NOT NULL,
  criado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categorias_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subcategorias (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id INT UNSIGNED NOT NULL,
  nome         VARCHAR(60)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sub_nome (categoria_id, nome),
  CONSTRAINT fk_sub_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Loja: PDF do produto, pedidos e webhook do Asaas ──
CREATE TABLE IF NOT EXISTS produto_arquivos (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  produto_id    INT UNSIGNED NOT NULL,
  arquivo       VARCHAR(80)  NOT NULL,    -- nome aleatório do PDF na pasta PRIVADA (nunca é link público)
  nome_original VARCHAR(200) NOT NULL,    -- nome que a pessoa deu ao arquivo (aparece só no painel)
  bytes         BIGINT UNSIGNED NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_arquivo_produto (produto_id),
  CONSTRAINT fk_arquivo_produto FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo          CHAR(32)     NOT NULL,   -- código público e aleatório do pedido (vai na URL de acompanhamento)
  produto_id      INT UNSIGNED NULL,
  produto_titulo  VARCHAR(200) NOT NULL,   -- cópia do título na hora da compra
  valor           DECIMAL(10,2) NOT NULL,  -- sempre o preço do BANCO (nunca o que veio do navegador)
  nome            VARCHAR(120) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  ip              VARCHAR(45)  NOT NULL DEFAULT '',
  status          VARCHAR(20)  NOT NULL DEFAULT 'aguardando',   -- aguardando | pago | cancelado
  asaas_cliente   VARCHAR(60)  NULL,
  asaas_pagamento VARCHAR(60)  NULL,
  link_pagamento  VARCHAR(255) NULL,
  token_download  CHAR(48)     NULL,       -- criado só quando o pagamento é confirmado
  downloads       INT UNSIGNED NOT NULL DEFAULT 0,
  ultima_checagem DATETIME     NULL,
  criado_em       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pago_em         DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pedidos_codigo (codigo),
  UNIQUE KEY uk_pedidos_token (token_download),
  KEY idx_pedidos_pagamento (asaas_pagamento),
  KEY idx_pedidos_ip (ip, criado_em),
  CONSTRAINT fk_pedidos_produto FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedido_arquivo_downloads (
  pedido_id INT UNSIGNED NOT NULL,
  arquivo_id INT UNSIGNED NOT NULL,
  downloads INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (pedido_id, arquivo_id),
  CONSTRAINT fk_download_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_download_arquivo FOREIGN KEY (arquivo_id) REFERENCES produto_arquivos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_eventos (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evento     VARCHAR(60)  NOT NULL,
  pagamento  VARCHAR(60)  NOT NULL DEFAULT '',
  resultado  VARCHAR(160) NOT NULL DEFAULT '',
  recebido_em TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_webhook_pagamento (pagamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Contas dos clientes (quem compra) ──
CREATE TABLE IF NOT EXISTS clientes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome       VARCHAR(120) NOT NULL,
  email      VARCHAR(190) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,          -- só o "hash" da senha (nunca a senha em si)
  criado_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_clientes_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cliente_sessoes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64)     NOT NULL,          -- guardamos só o hash do código do cookie
  expira     DATETIME     NOT NULL,
  criado_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sessao_token (token_hash),
  KEY idx_sessao_expira (expira),
  CONSTRAINT fk_sessao_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cliente_favoritos (
  cliente_id INT UNSIGNED NOT NULL,
  produto_id INT UNSIGNED NOT NULL,
  criado_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cliente_id, produto_id),
  CONSTRAINT fk_fav_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_produto FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cliente_pedidos (
  pedido_id  INT UNSIGNED NOT NULL,
  cliente_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (pedido_id),
  KEY idx_cp_cliente (cliente_id),
  CONSTRAINT fk_cp_pedido  FOREIGN KEY (pedido_id)  REFERENCES pedidos (id)  ON DELETE CASCADE,
  CONSTRAINT fk_cp_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Saques do dinheiro das vendas (feitos pelo painel) ──
CREATE TABLE IF NOT EXISTS saques (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id  INT UNSIGNED NOT NULL,
  valor     DECIMAL(10,2) NOT NULL,
  status    VARCHAR(30)  NOT NULL DEFAULT 'processando',   -- processando | PENDING | BANK_PROCESSING | DONE | FAILED | CANCELLED | falhou
  asaas_id  VARCHAR(60)  NULL,
  erro      VARCHAR(255) NULL,
  destino   VARCHAR(80)  NOT NULL DEFAULT '',              -- chave Pix mascarada (só para exibir)
  ip        VARCHAR(45)  NOT NULL DEFAULT '',
  criado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_saques_criado (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cliente_tentativas (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo      VARCHAR(12)  NOT NULL,           -- entrar | cadastrar
  ip        VARCHAR(45)  NOT NULL,
  criado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tent (tipo, ip, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Categorias e nichos que os produtos já usam ──
INSERT IGNORE INTO categorias (nome) SELECT DISTINCT categoria FROM produtos;
INSERT IGNORE INTO subcategorias (categoria_id, nome)
  SELECT DISTINCT c.id, p.subcategoria FROM produtos p JOIN categorias c ON c.nome = p.categoria
  WHERE p.subcategoria IS NOT NULL AND p.subcategoria <> '';
