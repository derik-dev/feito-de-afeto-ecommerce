-- ═══════════════════════════════════════════════════════════════════════════
-- Banco do Feito de Afeto. Gerado por: npm run banco:sql  (não edite à mão; edite src/data/produtos.js)
-- Como usar: phpMyAdmin > escolha o seu banco > aba "Importar" > selecione este arquivo > Executar.
-- Pode importar de novo: as tabelas só são criadas se não existirem e os produtos são atualizados pelo slug.
-- ═══════════════════════════════════════════════════════════════════════════
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS produtos (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug           VARCHAR(120) NOT NULL,
  titulo         VARCHAR(200) NOT NULL,
  categoria      VARCHAR(60)  NOT NULL,
  subcategoria   VARCHAR(60)  NULL,
  preco          DECIMAL(10,2) NOT NULL,
  preco_original DECIMAL(10,2) NULL,
  nota           DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  num_avaliacoes INT UNSIGNED NOT NULL DEFAULT 0,
  vendidos       INT UNSIGNED NOT NULL DEFAULT 0,
  formato        VARCHAR(10)  NOT NULL DEFAULT 'PDF',
  paginas        INT UNSIGNED NOT NULL DEFAULT 1,
  destaque       TINYINT(1)   NOT NULL DEFAULT 0,
  prioridade     INT          NOT NULL DEFAULT 0,
  descricao      TEXT         NOT NULL,
  ativo          TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_produtos_slug (slug),
  KEY idx_produtos_categoria (categoria, subcategoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS produto_tags (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  produto_id INT UNSIGNED NOT NULL,
  tag        VARCHAR(60)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_tags_produto (produto_id),
  CONSTRAINT fk_tags_produto FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS produto_imagens (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  produto_id INT UNSIGNED NOT NULL,
  arquivo    VARCHAR(255) NOT NULL,   -- caminho dentro do site, ex.: images/agendas/foto.webp ou uploads/abc.webp
  alt        VARCHAR(255) NOT NULL DEFAULT '',
  ordem      INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_imagens_produto (produto_id),
  CONSTRAINT fk_imagens_produto FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS produto_incluso (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  produto_id INT UNSIGNED NOT NULL,
  texto      VARCHAR(255) NOT NULL,   -- cada linha da lista "O que está incluso"
  ordem      INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_incluso_produto (produto_id),
  CONSTRAINT fk_incluso_produto FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- ── Produtos ──────────────────────────────────────────────────────────────
-- Agenda Manoela Leal – Nutricionista
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-manoela-leal-nutricionista', 'Agenda Manoela Leal – Nutricionista', 'Agendamento', 'Saúde e Nutrição', 34.9, 44.9, 4.9, 64, 210, 'PDF', 160, 1, 1, 'Agenda de agendamentos 2027 para nutricionistas, com capa em verde e vinho com folhas e a frase "Equilíbrio para uma vida melhor". Horários, pacientes e retornos em um só lugar.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista');
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'agendamento' FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'nutricionista' FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'saúde' FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2027' FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'verde e vinho' FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-manoela-leal-nutricionista.webp', 'Capa da agenda de agendamentos 2027 de Manoela Leal, nutricionista, em verde e vinho com folhas', 0 FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa em alta resolução', 0 FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Agenda de horários por dia e por semana', 1 FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Ficha de clientes e histórico de atendimentos', 2 FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Controle de serviços, valores e pagamentos', 3 FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-manoela-leal-nutricionista';

-- Agenda Beatriz – Nail Designer
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-beatriz-nail-designer', 'Agenda Beatriz – Nail Designer', 'Agendamento', 'Unhas', 29.9, NULL, 4.8, 52, 180, 'PDF', 140, 1, 1, 'Agenda de agendamentos para nail designers, com capa preta e dourada e monograma personalizado. Controle horários, serviços e clientes.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-beatriz-nail-designer');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-beatriz-nail-designer');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-beatriz-nail-designer');
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'agendamento' FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'unhas' FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'nail designer' FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'preta e dourada' FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-beatriz-nail-designer.webp', 'Capa preta e dourada da agenda de Beatriz, nail designer', 0 FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa em alta resolução', 0 FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Agenda de horários por dia e por semana', 1 FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Ficha de clientes e histórico de atendimentos', 2 FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Controle de serviços, valores e pagamentos', 3 FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-beatriz-nail-designer';

-- Agenda Cris Haulerich – Unhas
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-cris-haulerich-unhas', 'Agenda Cris Haulerich – Unhas', 'Agendamento', 'Unhas', 32.9, 39.9, 4.9, 71, 240, 'PDF', 150, 1, 1, 'Agendamentos 2026/2027 para manicures e nail designers, em tons de bege e dourado com delicados detalhes florais.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas');
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'agendamento' FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'unhas' FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2026' FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2027' FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'floral' FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'bege e dourado' FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-cris-haulerich-unhas.webp', 'Capa bege com flores douradas da agenda de agendamentos 2026/2027 de Cris Haulerich, unhas', 0 FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa em alta resolução', 0 FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Agenda de horários por dia e por semana', 1 FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Ficha de clientes e histórico de atendimentos', 2 FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Controle de serviços, valores e pagamentos', 3 FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-cris-haulerich-unhas';

-- Agenda Kayllaine Gabriele – Lash Designer
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-kayllaine-gabriele-lash-designer', 'Agenda Kayllaine Gabriele – Lash Designer', 'Agendamento', 'Cílios e Lash', 29.9, NULL, 4.8, 47, 150, 'PDF', 140, 1, 1, 'Agenda para lash designers e studios de beleza, com capa preta e dourada. Organize atendimentos, manutenções e retornos.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer');
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'agendamento' FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'cílios' FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'lash designer' FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'studio de beleza' FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'preta e dourada' FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-kayllaine-gabriele-lash-designer.webp', 'Capa preta e dourada da agenda de Kayllaine Gabriele, lash designer', 0 FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa em alta resolução', 0 FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Agenda de horários por dia e por semana', 1 FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Ficha de clientes e histórico de atendimentos', 2 FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Controle de serviços, valores e pagamentos', 3 FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-kayllaine-gabriele-lash-designer';

-- Agenda Fernanda Nogueira – Salão de Beleza
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-fernanda-nogueira-salao-de-beleza', 'Agenda Fernanda Nogueira – Salão de Beleza', 'Agendamento', 'Salão de Beleza', 34.9, NULL, 4.9, 58, 195, 'PDF', 160, 1, 1, 'Agenda de agendamentos para salões de beleza e cabeleireiras, com capa preta e dourada com tesoura, pente e secador.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza');
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'agendamento' FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'salão' FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'cabelo' FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'cabeleireira' FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'preta e dourada' FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-fernanda-nogueira-salao-de-beleza.webp', 'Capa preta e dourada da agenda do Salão de Beleza de Fernanda Nogueira', 0 FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa em alta resolução', 0 FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Agenda de horários por dia e por semana', 1 FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Ficha de clientes e histórico de atendimentos', 2 FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Controle de serviços, valores e pagamentos', 3 FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-fernanda-nogueira-salao-de-beleza';

-- Agenda Elaine – Rosas Azuis
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-elaine-rosas-azuis', 'Agenda Elaine – Rosas Azuis', 'Jardim Encantado', NULL, 42.9, 52.9, 4.9, 83, 260, 'PDF', 220, 1, 1, 'Agenda 2027 com rosas azuis e gipsófila em aquarela, detalhes dourados e nome personalizado na capa.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis');
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2027' FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'jardim' FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'floral' FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'rosas azuis' FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'azul e dourado' FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-elaine-rosas-azuis.webp', 'Capa da Agenda 2027 de Elaine, com rosas azuis, gipsófila e detalhes dourados', 0 FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa ilustrada em alta resolução', 0 FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Calendário anual e planejamento mensal', 1 FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Páginas semanais e diárias com detalhes florais', 2 FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Folhas de notas, metas e hábitos', 3 FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-elaine-rosas-azuis';

-- Agenda Cláudia – Hortênsias Verdes
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-claudia-hortensias-verdes', 'Agenda Cláudia – Hortênsias Verdes', 'Jardim Encantado', NULL, 39.9, NULL, 4.8, 61, 190, 'PDF', 220, 1, 1, 'Agenda 2027 em tons de verde e creme, com hortênsias, folhagens e moldura dourada. Nome personalizado na capa.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes');
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2027' FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'jardim' FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'floral' FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'hortênsias' FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'verde' FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-claudia-hortensias-verdes.webp', 'Capa da Agenda 2027 de Cláudia, com hortênsias verdes e folhagens em fundo creme', 0 FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa ilustrada em alta resolução', 0 FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Calendário anual e planejamento mensal', 1 FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Páginas semanais e diárias com detalhes florais', 2 FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Folhas de notas, metas e hábitos', 3 FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-claudia-hortensias-verdes';

-- Agenda Lígia Maria – Nutricionista
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-ligia-maria-nutricionista', 'Agenda Lígia Maria – Nutricionista', 'Jardim Encantado', NULL, 44.9, 54.9, 4.9, 57, 170, 'PDF', 220, 1, 1, 'Agenda 2027 para nutricionista, com hortênsias lilás e azuis, logo personalizada e acabamento dourado.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista');
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2027' FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'jardim' FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'floral' FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'hortênsias' FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'lilás' FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'nutricionista' FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-ligia-maria-nutricionista.webp', 'Capa da Agenda 2027 de Lígia Maria, nutricionista, com hortênsias lilás e azuis', 0 FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa ilustrada em alta resolução', 0 FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Calendário anual e planejamento mensal', 1 FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Páginas semanais e diárias com detalhes florais', 2 FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Folhas de notas, metas e hábitos', 3 FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-ligia-maria-nutricionista';

-- Agenda Patrícia – Rosas e Margaridas
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-patricia-rosas-e-margaridas', 'Agenda Patrícia – Rosas e Margaridas', 'Jardim Encantado', NULL, 39.9, 49.9, 4.9, 94, 310, 'PDF', 220, 1, 1, 'Agenda 2027 com rosas, margaridas e borboletas em tons de rosa e dourado. Nome personalizado em letra caligráfica.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas');
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2027' FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'jardim' FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'floral' FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'rosas' FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'margaridas' FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'borboletas' FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-patricia-rosas-e-margaridas.webp', 'Capa da Agenda 2027 de Patrícia, com rosas, margaridas e borboletas em rosa e dourado', 0 FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa ilustrada em alta resolução', 0 FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Calendário anual e planejamento mensal', 1 FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Páginas semanais e diárias com detalhes florais', 2 FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Folhas de notas, metas e hábitos', 3 FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-patricia-rosas-e-margaridas';

-- Agenda Suzane – Hortênsias Lilás
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-suzane-hortensias-lilas', 'Agenda Suzane – Hortênsias Lilás', 'Jardim Encantado', NULL, 39.9, NULL, 4.8, 49, 160, 'PDF', 220, 1, 1, 'Agenda 2027 com hortênsias lilás e azuis, moldura delicada e nome personalizado na capa.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas');
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2027' FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'jardim' FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'floral' FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'hortênsias' FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'lilás' FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-suzane-hortensias-lilas.webp', 'Capa da Agenda 2027 de Suzane, com hortênsias lilás e azuis', 0 FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa ilustrada em alta resolução', 0 FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Calendário anual e planejamento mensal', 1 FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Páginas semanais e diárias com detalhes florais', 2 FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Folhas de notas, metas e hábitos', 3 FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-suzane-hortensias-lilas';

-- Agenda Nossa Senhora de Fátima 2027
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-nossa-senhora-de-fatima-2027', 'Agenda Nossa Senhora de Fátima 2027', 'Religiosas', 'Católicas', 39.9, 49.9, 4.9, 112, 420, 'PDF', 240, 1, 1, 'Agenda católica 2027 com capa de Nossa Senhora de Fátima ao pôr do sol, entre rosas e o santuário.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027');
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2027' FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'católica' FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'nossa senhora' FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'fátima' FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-nossa-senhora-de-fatima-2027.webp', 'Capa da Agenda 2027 com Nossa Senhora de Fátima, rosas e o santuário ao pôr do sol', 0 FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa em alta resolução', 0 FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Calendário anual com datas e tempos litúrgicos', 1 FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Páginas semanais com espaço para oração e gratidão', 2 FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Folhas de notas, metas e intenções', 3 FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-nossa-senhora-de-fatima-2027';

-- Agenda Nossa Senhora Aparecida 2027
INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES ('agenda-nossa-senhora-aparecida-2027', 'Agenda Nossa Senhora Aparecida 2027', 'Religiosas', 'Católicas', 39.9, NULL, 4.9, 135, 520, 'PDF', 240, 1, 1, 'Agenda católica 2027 com capa de Nossa Senhora Aparecida, em azul e dourado.', 1) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);
DELETE FROM produto_tags WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027');
DELETE FROM produto_imagens WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027');
DELETE FROM produto_incluso WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027');
INSERT INTO produto_tags (produto_id, tag) SELECT id, '2027' FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'católica' FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'nossa senhora' FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';
INSERT INTO produto_tags (produto_id, tag) SELECT id, 'aparecida' FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';
INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, 'images/agendas/agenda-nossa-senhora-aparecida-2027.webp', 'Capa da Agenda 2027 com Nossa Senhora Aparecida, em azul e dourado', 0 FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Capa em alta resolução', 0 FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Calendário anual com datas e tempos litúrgicos', 1 FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Páginas semanais com espaço para oração e gratidão', 2 FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Folhas de notas, metas e intenções', 3 FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';
INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, 'Guia rápido de impressão e encadernação', 4 FROM produtos WHERE slug = 'agenda-nossa-senhora-aparecida-2027';

-- ── Categorias e nichos que os produtos já usam ──
INSERT IGNORE INTO categorias (nome) SELECT DISTINCT categoria FROM produtos;
INSERT IGNORE INTO subcategorias (categoria_id, nome)
  SELECT DISTINCT c.id, p.subcategoria FROM produtos p JOIN categorias c ON c.nome = p.categoria
  WHERE p.subcategoria IS NOT NULL AND p.subcategoria <> '';
