<?php
// upload.php (POST, multipart "foto"): recebe UMA foto, confere se é imagem de verdade, corrige a rotação
// (fotos de celular), recorta no formato vertical 4:5 (800x1000) e salva leve em WebP na pasta uploads/.
// A foto é RECRIADA do zero pelo servidor (GD), então nenhum código escondido dentro do arquivo sobrevive.
define('ADMIN_API', 1);
require __DIR__ . '/_comum.php';

exigir_metodo('POST');
exigir_login();
exigir_csrf();
@ini_set('memory_limit', '256M'); // fotos grandes de celular precisam de memória na hora de redimensionar

if (!function_exists('imagecreatetruecolor')) {
    erro('O servidor não tem suporte a imagens (GD). Fale com o suporte da hospedagem.', 500);
}

$arq = $_FILES['foto'] ?? null;
if (!$arq || ($arq['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $limite = in_array($arq['error'] ?? 0, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
    erro($limite ? 'A foto é grande demais. Use uma de até 8 MB.' : 'Não consegui receber a foto. Tente de novo.');
}
if ($arq['size'] > 8 * 1024 * 1024) {
    erro('A foto é grande demais. Use uma de até 8 MB.');
}

// Confere o conteúdo real (não só a extensão do nome)
$info = @getimagesize($arq['tmp_name']);
if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
    erro('Envie uma foto nos formatos JPG, PNG ou WebP.');
}
[$larg, $alt] = $info;
if ($larg < 200 || $alt < 200) {
    erro('A foto é pequena demais (mínimo 200 pixels). Use uma maior.');
}
if ($larg * $alt > 40000000) {
    erro('A foto tem pixels demais. Use uma menor (até uns 40 megapixels).');
}

switch ($info[2]) {
    case IMAGETYPE_JPEG: $origem = @imagecreatefromjpeg($arq['tmp_name']); break;
    case IMAGETYPE_PNG:  $origem = @imagecreatefrompng($arq['tmp_name']);  break;
    default:             $origem = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($arq['tmp_name']) : false;
}
if (!$origem) {
    erro('Não consegui abrir essa foto. Tente salvá-la de novo como JPG.');
}

// Fotos de celular guardam a rotação em um "rótulo" (EXIF): aplica para não ficar deitada
if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
    $exif = @exif_read_data($arq['tmp_name']);
    $giro = [3 => 180, 6 => -90, 8 => 90][(int) ($exif['Orientation'] ?? 1)] ?? 0;
    if ($giro !== 0) {
        $girada = imagerotate($origem, $giro, 0);
        if ($girada) {
            $origem = $girada;
            $larg = imagesx($origem);
            $alt  = imagesy($origem);
        }
    }
}

// Recorte 4:5 (vertical), centralizado na horizontal e um pouco acima do meio na vertical
$proporcao = 0.8;
if ($larg / $alt > $proporcao) {
    $sh = $alt;
    $sw = (int) round($alt * $proporcao);
    $sx = (int) floor(($larg - $sw) / 2);
    $sy = 0;
} else {
    $sw = $larg;
    $sh = (int) round($larg / $proporcao);
    $sx = 0;
    $sy = (int) floor(($alt - $sh) * 0.4);
}
$final = imagecreatetruecolor(800, 1000);
imagefill($final, 0, 0, imagecolorallocate($final, 255, 255, 255)); // fundo branco (PNG com transparência)
imagecopyresampled($final, $origem, 0, 0, $sx, $sy, 800, 1000, $sw, $sh);
imagedestroy($origem);

// Pasta uploads/ (fica FORA da dist: atualizar o site nunca apaga as fotos enviadas)
$pasta = pasta_site() . '/uploads';
if (!is_dir($pasta)) {
    if (!@mkdir($pasta, 0755, true)) {
        erro('Não consegui criar a pasta de fotos no servidor.', 500);
    }
    // Trava: nunca executa nada de PHP aqui dentro. E um index.html vazio evita listar os arquivos.
    @file_put_contents($pasta . '/.htaccess', "# Só fotos: nenhum PHP roda nesta pasta\n<FilesMatch \"\\.(php|phtml|php[0-9]|phar)$\">\n  <IfModule mod_authz_core.c>\n    Require all denied\n  </IfModule>\n  <IfModule !mod_authz_core.c>\n    Order deny,allow\n    Deny from all\n  </IfModule>\n</FilesMatch>\n");
    @file_put_contents($pasta . '/index.html', '');
}

// Faxina: fotos enviadas há mais de 1 dia que nenhum produto usa (ficaram esquecidas) são apagadas
$emUso = array_flip($pdo->query('SELECT arquivo FROM produto_imagens')->fetchAll(PDO::FETCH_COLUMN));
foreach (glob($pasta . '/*.{webp,jpg}', GLOB_BRACE) ?: [] as $velho) {
    if (filemtime($velho) < time() - 86400 && !isset($emUso['uploads/' . basename($velho)])) {
        @unlink($velho);
    }
}

// Nome aleatório (ninguém consegue adivinhar nem sobrescrever). WebP se o servidor suportar, senão JPG.
$nome = bin2hex(random_bytes(10));
if (function_exists('imagewebp')) {
    $arquivo = "uploads/$nome.webp";
    $gravou  = imagewebp($final, pasta_site() . '/' . $arquivo, 82);
} else {
    $arquivo = "uploads/$nome.jpg";
    $gravou  = imagejpeg($final, pasta_site() . '/' . $arquivo, 85);
}
imagedestroy($final);
if (!$gravou) {
    erro('Não consegui salvar a foto no servidor.', 500);
}

resposta(['ok' => true, 'arquivo' => $arquivo]);
