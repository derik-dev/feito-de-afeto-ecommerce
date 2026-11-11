<?php
// upload-pdf.php (POST, multipart "pdf"): recebe o PDF que o cliente vai baixar depois de pagar.
// Confere se é um PDF de verdade (pelo conteúdo, não pelo nome) e guarda numa pasta PRIVADA com nome aleatório.
// O arquivo só passa a "pertencer" a um produto quando o produto é salvo (salvar.php). Até lá é provisório.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';
require __DIR__ . '/../_arquivos.php';

exigir_metodo('POST');
exigir_login();
exigir_csrf();

const PDF_MAX_BYTES = 80 * 1024 * 1024; // 80 MB por PDF

$arq = $_FILES['pdf'] ?? null;
$erro = $arq['error'] ?? UPLOAD_ERR_NO_FILE;
if ($erro !== UPLOAD_ERR_OK) {
    if ($erro === UPLOAD_ERR_INI_SIZE || $erro === UPLOAD_ERR_FORM_SIZE) {
        erro('O PDF é maior do que o servidor aceita (limite de ' . ini_get('upload_max_filesize') . '). Use um arquivo menor ou peça ao suporte da hospedagem para aumentar o limite.');
    }
    erro('Não consegui receber o PDF. Tente de novo.');
}
if ($arq['size'] > PDF_MAX_BYTES) {
    erro('O PDF é grande demais (máximo de 80 MB).');
}
if ($arq['size'] < 100) {
    erro('Esse arquivo está vazio ou quebrado.');
}
if (!is_uploaded_file($arq['tmp_name'])) {
    erro('Envio inválido.');
}

// Todo PDF de verdade começa com "%PDF-". Isso barra outro tipo de arquivo com o nome trocado para .pdf.
$f = @fopen($arq['tmp_name'], 'rb');
$cabecalho = $f ? fread($f, 5) : '';
if ($f) {
    fclose($f);
}
if ($cabecalho !== '%PDF-') {
    erro('Esse arquivo não é um PDF. Envie um arquivo no formato PDF.');
}

$pasta = pasta_privada();

// Faxina: PDFs enviados há mais de 1 dia que nenhum produto usa (ficaram esquecidos) são apagados
try {
    $emUso = array_flip($pdo->query('SELECT arquivo FROM produto_arquivos')->fetchAll(PDO::FETCH_COLUMN));
} catch (PDOException $e) {
    erro('As tabelas da loja ainda não existem no banco. Importe o arquivo docs/banco-painel.sql no phpMyAdmin.', 500);
}
foreach (glob($pasta . '/*.pdf') ?: [] as $velho) {
    if (filemtime($velho) < time() - 86400 && !isset($emUso[basename($velho)])) {
        @unlink($velho);
    }
}

$nome = bin2hex(random_bytes(16)) . '.pdf';
if (!move_uploaded_file($arq['tmp_name'], $pasta . '/' . $nome)) {
    erro('Não consegui salvar o PDF no servidor.', 500);
}
@chmod($pasta . '/' . $nome, 0640);

resposta([
    'ok'      => true,
    'arquivo' => $nome,
    'nome'    => limpar_nome_de_arquivo($arq['name'] ?? 'produto.pdf'),
    'bytes'   => (int) $arq['size'],
]);
