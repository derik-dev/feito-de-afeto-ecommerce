<?php
// _arquivos.php: onde ficam os PDFs vendidos (a "pasta privada") e como achar o PDF de um produto.
// Regra de ouro: o PDF NUNCA pode ser aberto por um link público. Só api/baixar.php entrega, e só para pedido pago.
if (!defined('API_INTERNA')) {
    http_response_code(403);
    exit;
}

/**
 * Devolve a pasta (já criada e protegida) onde os PDFs são guardados. Tenta, nesta ordem:
 *   1) a pasta definida em 'pasta_arquivos' no config.php (opcional)
 *   2) FORA da public_html:  .../feito-de-afeto-arquivos   (o melhor lugar: não tem endereço na internet)
 *   3) dentro de api/_privado (plano B, protegido por .htaccess)
 */
function pasta_privada()
{
    static $achada = null;
    if ($achada !== null) {
        return $achada;
    }
    $candidatos = [];
    $configurada = config_extra('pasta_arquivos');
    if ($configurada !== '') {
        $candidatos[] = rtrim((string) $configurada, '/\\');
    }
    $candidatos[] = dirname(__DIR__, 3) . '/feito-de-afeto-arquivos';
    $candidatos[] = __DIR__ . '/_privado';

    $raizPublica = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: '';
    foreach ($candidatos as $pasta) {
        if (!is_dir($pasta)) {
            @mkdir($pasta, 0750, true);
        }
        if (!is_dir($pasta) || !is_writable($pasta)) {
            continue;
        }
        $real = realpath($pasta);
        // Se a pasta ficou DENTRO da área pública, põe uma trava que nega qualquer acesso pelo navegador
        if ($raizPublica !== '' && $real !== false && strpos($real, $raizPublica . DIRECTORY_SEPARATOR) === 0) {
            if (!is_file($real . '/.htaccess')) {
                @file_put_contents($real . '/.htaccess', "# PDFs vendidos: ninguém abre pelo navegador\n<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order deny,allow\n  Deny from all\n</IfModule>\n");
            }
            if (!is_file($real . '/index.html')) {
                @file_put_contents($real . '/index.html', '');
            }
        }
        return $achada = $real !== false ? $real : $pasta;
    }
    throw new RuntimeException('Não consegui criar a pasta privada dos PDFs. Tentei: ' . implode(' | ', $candidatos));
}

/** O nome guardado no banco precisa ter o formato exato que nós geramos (32 letras/números + .pdf). */
function nome_de_pdf_valido($nome)
{
    return is_string($nome) && preg_match('/^[a-f0-9]{32}\.pdf$/', $nome) === 1;
}

/** Caminho completo do PDF no disco, ou null se o nome for inválido ou o arquivo não existir. */
function caminho_do_pdf($nome)
{
    if (!nome_de_pdf_valido($nome)) {
        return null;
    }
    $caminho = pasta_privada() . '/' . $nome;
    return is_file($caminho) ? $caminho : null;
}

/** Apaga um PDF do disco (só se o nome for válido; nunca apaga outra coisa). */
function apagar_pdf($nome)
{
    $caminho = caminho_do_pdf($nome);
    if ($caminho !== null) {
        @unlink($caminho);
    }
}

/** Atualiza instalações antigas sem apagar PDFs. DDL precisa ficar fora da transação de salvar. */
function preparar_multiplos_pdfs(PDO $pdo)
{
    $indices = $pdo->query('SHOW INDEX FROM produto_arquivos')->fetchAll();
    foreach ($indices as $indice) {
        if ($indice['Key_name'] === 'uk_arquivo_produto' && (int) $indice['Non_unique'] === 0) {
            $pdo->exec('ALTER TABLE produto_arquivos ADD KEY idx_arquivo_produto (produto_id), DROP INDEX uk_arquivo_produto');
            break;
        }
    }
}

/** Só remove do disco arquivos que nenhum produto usa mais. */
function remover_pdfs_orfaos(PDO $pdo, array $nomes)
{
    $q = $pdo->prepare('SELECT COUNT(*) FROM produto_arquivos WHERE arquivo = ?');
    foreach (array_unique($nomes) as $nome) {
        $q->execute([$nome]);
        if ((int) $q->fetchColumn() === 0) apagar_pdf($nome);
    }
}

/** Nome do arquivo para mostrar: sem caracteres de controle nem barras, no máximo 150 letras. */
function limpar_nome_de_arquivo($nome)
{
    $nome = preg_replace('/[\x00-\x1f\x7f\\\\\/]+/u', ' ', (string) $nome);
    $nome = trim(preg_replace('/\s+/u', ' ', $nome));
    if ($nome === '' || $nome === null) {
        return 'produto.pdf';
    }
    return function_exists('mb_substr') ? mb_substr($nome, 0, 150, 'UTF-8') : substr($nome, 0, 150);
}
