// Gera o arquivo SQL com as tabelas e os produtos, a partir de src/data/produtos.js.
// Uso:  npm run banco:sql      → cria/atualiza  docs/banco-feito-de-afeto.sql
// Depois importe esse arquivo no phpMyAdmin (aba "Importar") dentro do seu banco na Hostinger.
// Pode importar de novo quando quiser: ele atualiza os produtos pelo "slug" (não duplica).
import { writeFileSync } from 'node:fs';
import { PRODUTOS } from '../src/data/produtos.js';

// Escreve um valor em SQL: texto entre aspas (com escape), número puro, ou NULL.
const q = v => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? '1' : '0') : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`);

// Tabelas do painel de cadastro (usuários e controle de tentativas de login).
const tabelasPainel = `
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
`;

// Preenchimento inicial: cadastra as categorias e nichos que os produtos já usam (pode rodar várias vezes).
const seedCategorias = `
-- ── Categorias e nichos que os produtos já usam ──
INSERT IGNORE INTO categorias (nome) SELECT DISTINCT categoria FROM produtos;
INSERT IGNORE INTO subcategorias (categoria_id, nome)
  SELECT DISTINCT c.id, p.subcategoria FROM produtos p JOIN categorias c ON c.nome = p.categoria
  WHERE p.subcategoria IS NOT NULL AND p.subcategoria <> '';
`;

// Tabelas da LOJA: PDF de cada produto, pedidos (Asaas) e o registro dos avisos (webhook) do Asaas.
const tabelasLoja = `
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
`;

const estrutura = `-- ═══════════════════════════════════════════════════════════════════════════
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
${tabelasPainel}${tabelasLoja}`;

const blocos = PRODUTOS.map(p => {
  const id = `(SELECT id FROM produtos WHERE slug = ${q(p.slug)})`;
  const linhas = [`-- ${p.titulo}`];
  linhas.push(
    `INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES (` +
    [p.slug, p.titulo, p.categoria, p.subcategoria ?? null, p.preco, p.precoOriginal ?? null, p.nota, p.numAvaliacoes, p.vendidos, p.formato, p.paginas, !!p.destaque, p.prioridade ?? 0, p.descricao, true].map(q).join(', ') +
    `) ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), categoria = VALUES(categoria), subcategoria = VALUES(subcategoria), preco = VALUES(preco), preco_original = VALUES(preco_original), nota = VALUES(nota), num_avaliacoes = VALUES(num_avaliacoes), vendidos = VALUES(vendidos), formato = VALUES(formato), paginas = VALUES(paginas), destaque = VALUES(destaque), prioridade = VALUES(prioridade), descricao = VALUES(descricao), ativo = VALUES(ativo);`);
  // Tabelas filhas: apaga as linhas antigas do produto e grava de novo (assim reimportar nunca duplica).
  for (const t of ['produto_tags', 'produto_imagens', 'produto_incluso']) linhas.push(`DELETE FROM ${t} WHERE produto_id = ${id};`);
  p.tags.forEach(tag => linhas.push(`INSERT INTO produto_tags (produto_id, tag) SELECT id, ${q(tag)} FROM produtos WHERE slug = ${q(p.slug)};`));
  p.imagens.forEach((img, i) => {
    if (img.src.startsWith('data:')) { console.warn(`  (ignorada imagem de exemplo sem arquivo em "${p.slug}")`); return; }
    const arquivo = img.src.replace(/^\//, ''); // "/images/agendas/x.webp" -> "images/agendas/x.webp" (caminho dentro do site)
    linhas.push(`INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) SELECT id, ${q(arquivo)}, ${q(img.alt)}, ${i} FROM produtos WHERE slug = ${q(p.slug)};`);
  });
  p.incluso.forEach((texto, i) => linhas.push(`INSERT INTO produto_incluso (produto_id, texto, ordem) SELECT id, ${q(texto)}, ${i} FROM produtos WHERE slug = ${q(p.slug)};`));
  return linhas.join('\n');
});

const arquivo = new URL('../docs/banco-feito-de-afeto.sql', import.meta.url);
writeFileSync(arquivo, `${estrutura}\n-- ── Produtos ──────────────────────────────────────────────────────────────\n${blocos.join('\n\n')}\n${seedCategorias}`);
console.log(`OK: ${PRODUTOS.length} produtos -> docs/banco-feito-de-afeto.sql`);

// Arquivo menor, só com as tabelas do painel (para quem já importou o principal e só precisa destas).
writeFileSync(new URL('../docs/banco-painel.sql', import.meta.url), `-- Tabelas do painel de cadastro. Importe no phpMyAdmin (aba "Importar"). Pode importar mais de uma vez.\nSET NAMES utf8mb4;\n${tabelasPainel}${tabelasLoja}${seedCategorias}`);
console.log('OK: docs/banco-painel.sql');
