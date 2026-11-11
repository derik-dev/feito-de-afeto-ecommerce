<?php
// salvar.php (POST, JSON): cria um produto novo (sem "id") ou atualiza um existente (com "id").
// Valida tudo no servidor (nunca confia só no que a página mandou) e grava em uma transação:
// ou grava o produto inteiro, ou não grava nada.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';
require __DIR__ . '/../_arquivos.php';

exigir_metodo('POST');
exigir_login();
exigir_csrf();
$d = corpo_json();

// ── Funções auxiliares ──
function numero($v)
{
    if (is_int($v) || is_float($v)) {
        return (float) $v;
    }
    $t = str_replace(',', '.', trim((string) $v));
    return is_numeric($t) ? (float) $t : null;
}

function texto_curto($v, $max)
{
    $t = trim((string) $v);
    return mb_strlen($t) > $max ? null : $t;
}

// Cria o endereço amigável a partir do título: "Agenda Cláudia – Rosas" -> "agenda-claudia-rosas"
function gerar_slug($titulo)
{
    $mapa = ['á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
             'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i', 'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
             'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c', 'ñ' => 'n'];
    $s = strtr(mb_strtolower($titulo, 'UTF-8'), $mapa);
    $s = trim(preg_replace('/[^a-z0-9]+/', '-', $s), '-');
    return $s === '' ? 'produto' : substr($s, 0, 100);
}

function lista_de_textos($v, $maxItens, $maxTam, $rotulo)
{
    if (!is_array($v)) {
        return [];
    }
    $saida = [];
    foreach ($v as $item) {
        $t = trim((string) $item);
        if ($t === '') {
            continue;
        }
        if (mb_strlen($t) > $maxTam) {
            erro("Um item de \"$rotulo\" está muito longo (máximo $maxTam letras).");
        }
        if (!in_array($t, $saida, true)) {
            $saida[] = $t;
        }
    }
    if (count($saida) > $maxItens) {
        erro("Em \"$rotulo\" use no máximo $maxItens itens.");
    }
    return $saida;
}

// ── Valida os campos ──
$titulo = texto_curto($d['titulo'] ?? '', 200);
if ($titulo === null || $titulo === '') {
    erro('Escreva o título do produto (até 200 letras).');
}
$categoria = texto_curto($d['categoria'] ?? '', 60);
if ($categoria === null || $categoria === '') {
    erro('Escolha ou escreva a categoria.');
}
$subcategoria = texto_curto($d['subcategoria'] ?? '', 60);
if ($subcategoria === null) {
    erro('O nicho é muito longo (até 60 letras).');
}
$subcategoria = $subcategoria === '' ? null : $subcategoria;

$preco = numero($d['preco'] ?? null);
if ($preco === null || $preco <= 0 || $preco > 99999) {
    erro('Informe um preço válido (maior que zero).');
}
$precoOriginal = (isset($d['precoOriginal']) && trim((string) $d['precoOriginal']) !== '') ? numero($d['precoOriginal']) : null;
if ($precoOriginal !== null && $precoOriginal <= $preco) {
    erro('O "preço de antes" precisa ser MAIOR que o preço atual. Se não há desconto, deixe vazio.');
}

$descricao = trim((string) ($d['descricao'] ?? ''));
if ($descricao === '') {
    erro('Escreva a descrição do produto.');
}
if (mb_strlen($descricao) > 5000) {
    erro('A descrição está muito longa (máximo 5000 letras).');
}

$paginas  = max(1, min(5000, (int) ($d['paginas'] ?? 1)));
$tags     = lista_de_textos($d['tags'] ?? [], 15, 60, 'palavras-chave');
$incluso  = lista_de_textos($d['incluso'] ?? [], 15, 255, 'o que está incluso');
$destaque = !empty($d['destaque']) ? 1 : 0;
$ativo    = !array_key_exists('ativo', $d) || !empty($d['ativo']) ? 1 : 0;

$imagens = [];
foreach (is_array($d['imagens'] ?? null) ? $d['imagens'] : [] as $img) {
    $arquivo = $img['arquivo'] ?? '';
    // Formato antigo (importado do SQL inicial): "agendas/foto.webp" -> "images/agendas/foto.webp"
    if (is_string($arquivo) && $arquivo !== '' && !preg_match('#^(uploads|images)/#', $arquivo)) {
        $arquivo = 'images/' . ltrim($arquivo, '/');
    }
    if (!caminho_de_foto_valido($arquivo)) {
        erro('Uma das fotos é inválida. Envie a foto de novo.');
    }
    $imagens[] = ['arquivo' => $arquivo, 'alt' => mb_strlen(trim((string) ($img['alt'] ?? ''))) > 255 ? '' : trim((string) ($img['alt'] ?? ''))];
}
if (count($imagens) < 1) {
    erro('Envie pelo menos uma foto do produto.');
}
if (count($imagens) > 8) {
    erro('Use no máximo 8 fotos.');
}

// Ausente = mantém; [] = remove todos; {id} mantém um PDF já cadastrado.
// Aceita também a chave antiga "pdf" para painéis ainda abertos no navegador.
$pdfMudou = array_key_exists('pdfs', $d) || array_key_exists('pdf', $d);
$pdfsEntrada = array_key_exists('pdfs', $d) ? $d['pdfs'] : (isset($d['pdf']) ? [$d['pdf']] : []);
$pdfsNovos = [];
if ($pdfMudou) {
    if (!is_array($pdfsEntrada) || array_values($pdfsEntrada) !== $pdfsEntrada || count($pdfsEntrada) > 1000) {
        erro('Envie uma lista com no máximo 1.000 PDFs.');
    }
    $existente = $pdo->prepare('SELECT id, arquivo, nome_original AS nome, bytes FROM produto_arquivos WHERE id = ? AND produto_id = ?');
    foreach ($pdfsEntrada as $pdf) {
        if (!is_array($pdf)) erro('Um dos PDFs é inválido.');
        if (isset($pdf['id'])) {
            $existente->execute([(int) $pdf['id'], (int) ($d['id'] ?? 0)]);
            $arquivo = $existente->fetch();
            if (!$arquivo) erro('Um dos PDFs não pertence a este produto. Reabra o produto e tente de novo.');
        } else {
            $nomeArquivo = $pdf['arquivo'] ?? '';
            $caminhoNovo = caminho_do_pdf($nomeArquivo);
            if ($caminhoNovo === null) erro('Um PDF enviado não foi encontrado no servidor. Envie o PDF de novo.');
            $arquivo = ['arquivo' => $nomeArquivo, 'nome' => limpar_nome_de_arquivo($pdf['nome'] ?? 'produto.pdf'), 'bytes' => (int) filesize($caminhoNovo)];
        }
        if (isset($pdfsNovos[$arquivo['arquivo']])) erro('O mesmo PDF foi adicionado mais de uma vez.');
        $pdfsNovos[$arquivo['arquivo']] = $arquivo;
    }
}
if ((int) ($d['id'] ?? 0) <= 0 && $ativo && !$pdfsNovos) {
    erro('Envie pelo menos um PDF do produto ou desligue "Mostrar no site" para salvar como rascunho.');
}
if ($pdfMudou) preparar_multiplos_pdfs($pdo);

// ── Categoria e nicho: usa o nome JÁ cadastrado (evita "agendamento" e "Agendamento" virarem dois) ──
// e, se for novo, cadastra na lista de categorias do painel. A comparação ignora maiúsculas e acentos.
$achar = $pdo->prepare('SELECT id, nome FROM categorias WHERE nome = ?');
$achar->execute([$categoria]);
$catExistente = $achar->fetch();
if ($catExistente) {
    $categoria   = $catExistente['nome'];
    $categoriaId = (int) $catExistente['id'];
} else {
    $pdo->prepare('INSERT INTO categorias (nome) VALUES (?)')->execute([$categoria]);
    $categoriaId = (int) $pdo->lastInsertId();
}
if ($subcategoria !== null) {
    $achar = $pdo->prepare('SELECT nome FROM subcategorias WHERE categoria_id = ? AND nome = ?');
    $achar->execute([$categoriaId, $subcategoria]);
    $subExistente = $achar->fetchColumn();
    if ($subExistente !== false) {
        $subcategoria = $subExistente;
    } else {
        $pdo->prepare('INSERT INTO subcategorias (categoria_id, nome) VALUES (?, ?)')->execute([$categoriaId, $subcategoria]);
    }
}

// ── Grava (tudo ou nada) ──
$id = (int) ($d['id'] ?? 0);
$fotosAntigas = [];
$pdfsAntigos = [];

$pdo->beginTransaction();
try {
    if ($id > 0) {
        $existe = $pdo->prepare('SELECT id FROM produtos WHERE id = ?');
        $existe->execute([$id]);
        if (!$existe->fetch()) {
            $pdo->rollBack();
            erro('Produto não encontrado.', 404);
        }
        $velhas = $pdo->prepare('SELECT arquivo FROM produto_imagens WHERE produto_id = ?');
        $velhas->execute([$id]);
        $fotosAntigas = array_column($velhas->fetchAll(), 'arquivo');

        $pdo->prepare('UPDATE produtos SET titulo = ?, categoria = ?, subcategoria = ?, preco = ?, preco_original = ?, paginas = ?, destaque = ?, prioridade = ?, descricao = ?, ativo = ? WHERE id = ?')
            ->execute([$titulo, $categoria, $subcategoria, $preco, $precoOriginal, $paginas, $destaque, $destaque, $descricao, $ativo, $id]);
        // as listas são regravadas do zero
        foreach (['produto_tags', 'produto_imagens', 'produto_incluso'] as $tabela) {
            $pdo->prepare("DELETE FROM $tabela WHERE produto_id = ?")->execute([$id]);
        }
        $slug = null;
    } else {
        // slug único: se já existir "agenda-x", vira "agenda-x-2", "agenda-x-3"...
        $base = gerar_slug($titulo);
        $slug = $base;
        $n = 2;
        $confere = $pdo->prepare('SELECT COUNT(*) FROM produtos WHERE slug = ?');
        while (true) {
            $confere->execute([$slug]);
            if ((int) $confere->fetchColumn() === 0) {
                break;
            }
            $slug = $base . '-' . $n++;
        }
        $pdo->prepare('INSERT INTO produtos (slug, titulo, categoria, subcategoria, preco, preco_original, nota, num_avaliacoes, vendidos, formato, paginas, destaque, prioridade, descricao, ativo) VALUES (?, ?, ?, ?, ?, ?, 5.0, 0, 0, \'PDF\', ?, ?, ?, ?, ?)')
            ->execute([$slug, $titulo, $categoria, $subcategoria, $preco, $precoOriginal, $paginas, $destaque, $destaque, $descricao, $ativo]);
        $id = (int) $pdo->lastInsertId();
    }

    $inserirTag = $pdo->prepare('INSERT INTO produto_tags (produto_id, tag) VALUES (?, ?)');
    foreach ($tags as $t) {
        $inserirTag->execute([$id, $t]);
    }
    $inserirFoto = $pdo->prepare('INSERT INTO produto_imagens (produto_id, arquivo, alt, ordem) VALUES (?, ?, ?, ?)');
    foreach ($imagens as $i => $img) {
        $inserirFoto->execute([$id, $img['arquivo'], $img['alt'], $i]);
    }
    $inserirIncluso = $pdo->prepare('INSERT INTO produto_incluso (produto_id, texto, ordem) VALUES (?, ?, ?)');
    foreach ($incluso as $i => $t) {
        $inserirIncluso->execute([$id, $t, $i]);
    }

    // Preserva os IDs dos PDFs mantidos, para os links de download continuarem válidos.
    if ($pdfMudou) {
        $antigo = $pdo->prepare('SELECT id, arquivo FROM produto_arquivos WHERE produto_id = ? FOR UPDATE');
        $antigo->execute([$id]);
        $linhasAntigas = $antigo->fetchAll();
        $pdfsAntigos = array_column($linhasAntigas, 'arquivo');
        $remover = $pdo->prepare('DELETE FROM produto_arquivos WHERE id = ? AND produto_id = ?');
        foreach ($linhasAntigas as $a) {
            if (!isset($pdfsNovos[$a['arquivo']])) $remover->execute([$a['id'], $id]);
        }
        $inserirPdf = $pdo->prepare('INSERT INTO produto_arquivos (produto_id, arquivo, nome_original, bytes) VALUES (?, ?, ?, ?)');
        foreach ($pdfsNovos as $pdf) {
            if (!in_array($pdf['arquivo'], $pdfsAntigos, true)) {
                $inserirPdf->execute([$id, $pdf['arquivo'], $pdf['nome'], $pdf['bytes']]);
            }
        }
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e; // o tratador geral registra no log e responde "Erro no servidor"
}

// Fotos que ela removeu deste produto e que ninguém mais usa: apaga do servidor
remover_fotos_orfas($fotosAntigas);

// PDF antigo que foi trocado ou removido: apaga do disco (só depois de tudo salvo com sucesso)
remover_pdfs_orfaos($pdo, $pdfsAntigos);

$slugFinal = $slug ?? $pdo->query('SELECT slug FROM produtos WHERE id = ' . (int) $id)->fetchColumn();
resposta(['ok' => true, 'id' => (string) $id, 'slug' => $slugFinal]);
