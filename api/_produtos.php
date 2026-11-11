<?php
// _produtos.php: função compartilhada que lê os produtos do banco e monta o JSON no formato do site.
// Usada por api/produtos.php (público) e api/admin/produtos.php (painel). Não é aberta pelo navegador.
if (!defined('API_INTERNA')) {
    http_response_code(403);
    exit;
}

// Agrupa linhas de uma tabela filha pelo id do produto:  [ 12 => [linha, linha], 13 => [...] ]
function agrupar_linhas($linhas)
{
    $grupos = [];
    foreach ($linhas as $linha) {
        $grupos[(int) $linha['produto_id']][] = $linha;
    }
    return $grupos;
}

// $apenasAtivos = true  -> só o que aparece no site;  false -> tudo (usado pelo painel)
function montar_produtos(PDO $pdo, $apenasAtivos = true, $paraPainel = false)
{
    $filtro   = $apenasAtivos ? 'WHERE ativo = 1' : '';
    $produtos = $pdo->query("SELECT * FROM produtos $filtro ORDER BY id")->fetchAll();
    $tags     = agrupar_linhas($pdo->query('SELECT produto_id, tag FROM produto_tags ORDER BY id')->fetchAll());
    $imagens  = agrupar_linhas($pdo->query('SELECT produto_id, arquivo, alt FROM produto_imagens ORDER BY ordem, id')->fetchAll());
    $incluso  = agrupar_linhas($pdo->query('SELECT produto_id, texto FROM produto_incluso ORDER BY ordem, id')->fetchAll());

    // PDFs: só mostramos se TEM ou NÃO tem arquivo (o nome do arquivo e o caminho nunca saem no site público).
    // Se a tabela ainda não existir (SQL não importado), $arquivos fica null e o campo é omitido.
    try {
        $arquivos = [];
        foreach ($pdo->query('SELECT id, produto_id, nome_original, bytes FROM produto_arquivos ORDER BY id')->fetchAll() as $a) {
            $arquivos[(int) $a['produto_id']][] = $a;
        }
    } catch (PDOException $e) {
        $arquivos = null;
    }

    $saida = [];
    foreach ($produtos as $p) {
        $id = (int) $p['id'];
        $saida[] = [
            'id'            => (string) $id,
            'slug'          => $p['slug'],
            'titulo'        => $p['titulo'],
            'categoria'     => $p['categoria'],
            'subcategoria'  => $p['subcategoria'],                       // null se não tiver
            'preco'         => (float) $p['preco'],
            'precoOriginal' => $p['preco_original'] === null ? null : (float) $p['preco_original'],
            'nota'          => (float) $p['nota'],
            'numAvaliacoes' => (int) $p['num_avaliacoes'],
            'vendidos'      => (int) $p['vendidos'],
            'formato'       => $p['formato'],
            'paginas'       => (int) $p['paginas'],
            'destaque'      => (bool) $p['destaque'],
            'prioridade'    => (int) $p['prioridade'],
            'descricao'     => $p['descricao'],
            'ativo'         => (bool) $p['ativo'],
            'tags'          => array_column($tags[$id] ?? [], 'tag'),
            'incluso'       => array_column($incluso[$id] ?? [], 'texto'),
            // `src` é o caminho dentro do site (ex.: uploads/foto.webp ou images/agendas/foto.webp)
            'imagens'       => array_map(fn($i) => ['src' => $i['arquivo'], 'alt' => $i['alt']], $imagens[$id] ?? []),
        ];
        if ($arquivos !== null) {
            $linha = count($saida) - 1;
            $saida[$linha]['temArquivo'] = isset($arquivos[$id]);
            $saida[$linha]['quantidadeArquivos'] = count($arquivos[$id] ?? []);
            if ($paraPainel) {
                $pdfs = array_map(fn($a) => ['id' => (int) $a['id'], 'nome' => $a['nome_original'], 'bytes' => (int) $a['bytes']], $arquivos[$id] ?? []);
                $saida[$linha]['pdfs'] = $pdfs;
                $saida[$linha]['pdf'] = $pdfs[0] ?? null; // compatibilidade com versões anteriores do painel
            }
        }
    }
    return $saida;
}
