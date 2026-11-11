<?php
// _comum.php: peças compartilhadas pelos arquivos do painel (sessão, segurança, respostas JSON, fotos).
// Não é aberto pelo navegador (o .htaccess bloqueia arquivos que começam com "_") e só funciona incluído.
if (!defined('ADMIN_API')) {
    http_response_code(403);
    exit;
}
define('API_INTERNA', 1);
require __DIR__ . '/../conexao.php';   // cria $pdo e $chaveInstalacao
require __DIR__ . '/../_produtos.php'; // montar_produtos()

// ── Compatibilidade: se o servidor não tiver a extensão mbstring, usa versões simples ──
if (!function_exists('mb_strlen')) {
    function mb_strlen($s) { return strlen(utf8_decode($s)); }
}
if (!function_exists('mb_strtolower')) {
    function mb_strtolower($s) { return strtolower($s); }
}

// ── Respostas JSON ──
function resposta($dados, $codigo = 200)
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store'); // respostas do painel nunca ficam guardadas
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}
function erro($mensagem, $codigo = 400)
{
    resposta(['erro' => $mensagem], $codigo);
}

// Qualquer erro inesperado vira uma mensagem simples (o detalhe vai só para o log do servidor).
set_exception_handler(function ($e) {
    error_log('[feito-de-afeto] admin: ' . $e->getMessage() . ' em ' . $e->getFile() . ':' . $e->getLine());
    erro('Erro no servidor. Tente de novo em instantes.', 500);
});

// ── Sessão (o "crachá" do login) ──
function iniciar_sessao()
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https   = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    // O cookie só vale para a pasta do site (ex.: /feito-de-afeto), sem vazar para outros sites do mesmo domínio.
    $caminho = dirname($_SERVER['SCRIPT_NAME'] ?? '/', 3);
    if ($caminho === '.' || $caminho === '\\' || $caminho === '') {
        $caminho = '/';
    }
    session_name('feito_admin');
    session_set_cookie_params([
        'lifetime' => 0,          // some quando fecha o navegador
        'path'     => $caminho,
        'secure'   => $https,     // só viaja por HTTPS
        'httponly' => true,       // o JavaScript da página não consegue ler o cookie
        'samesite' => 'Strict',   // não é enviado quando o pedido vem de outro site
    ]);
    session_start();
}

function admin_logado()
{
    iniciar_sessao();
    if (empty($_SESSION['admin_id'])) {
        return false;
    }
    // Sai sozinho depois de 4 horas sem usar
    if (time() - (int) ($_SESSION['ultimo'] ?? 0) > 4 * 3600) {
        $_SESSION = [];
        session_destroy();
        return false;
    }
    $_SESSION['ultimo'] = time();
    return true;
}

function exigir_login()
{
    if (!admin_logado()) {
        erro('Faça login para continuar.', 401);
    }
}

// ── Proteção contra CSRF (alguém induzir o navegador logado a fazer pedidos sem querer) ──
function token_csrf()
{
    iniciar_sessao();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function exigir_csrf()
{
    iniciar_sessao();
    // 1) o pedido precisa vir do próprio site (se o navegador informar a origem)
    $origem = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origem !== '') {
        $hostOrigem = parse_url($origem, PHP_URL_HOST);
        $hostSite   = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''); // tira a porta, se houver
        if ($hostOrigem !== $hostSite) {
            erro('Pedido recusado.', 403);
        }
    }
    // 2) e precisa trazer o código secreto da sessão
    $enviado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if ($enviado === '' || !hash_equals($_SESSION['csrf'] ?? '', $enviado)) {
        erro('Sua sessão expirou. Recarregue a página e entre de novo.', 403);
    }
}

function exigir_metodo($metodo)
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $metodo) {
        header('Allow: ' . $metodo);
        erro('Método não permitido.', 405);
    }
}

function corpo_json()
{
    $bruto = file_get_contents('php://input', false, null, 0, 1048577);
    if ($bruto === false || strlen($bruto) > 1048576) {
        erro('Dados grandes demais.', 413);
    }
    $dados = json_decode($bruto, true);
    if (!is_array($dados)) {
        erro('Dados inválidos.');
    }
    return $dados;
}

// ── Categorias e nichos ──
// Lista as categorias (com os nichos de cada uma) e quantos produtos usam cada uma.
// A contagem compara sem diferenciar maiúsculas, igual ao banco faz (por isso o mb_strtolower).
function listar_categorias(PDO $pdo)
{
    $categorias = $pdo->query('SELECT id, nome FROM categorias ORDER BY nome')->fetchAll();
    $nichos     = $pdo->query('SELECT id, categoria_id, nome FROM subcategorias ORDER BY nome')->fetchAll();

    $totalCat = [];
    foreach ($pdo->query('SELECT categoria, COUNT(*) AS n FROM produtos GROUP BY categoria') as $l) {
        $totalCat[mb_strtolower($l['categoria'], 'UTF-8')] = (int) $l['n'];
    }
    $totalSub = [];
    foreach ($pdo->query('SELECT categoria, subcategoria, COUNT(*) AS n FROM produtos WHERE subcategoria IS NOT NULL GROUP BY categoria, subcategoria') as $l) {
        $totalSub[mb_strtolower($l['categoria'] . "\0" . $l['subcategoria'], 'UTF-8')] = (int) $l['n'];
    }

    $porCategoria = [];
    foreach ($nichos as $n) {
        $porCategoria[(int) $n['categoria_id']][] = $n;
    }

    $saida = [];
    foreach ($categorias as $c) {
        $subs = [];
        foreach ($porCategoria[(int) $c['id']] ?? [] as $n) {
            $subs[] = [
                'id'    => (int) $n['id'],
                'nome'  => $n['nome'],
                'total' => $totalSub[mb_strtolower($c['nome'] . "\0" . $n['nome'], 'UTF-8')] ?? 0,
            ];
        }
        $saida[] = [
            'id'    => (int) $c['id'],
            'nome'  => $c['nome'],
            'total' => $totalCat[mb_strtolower($c['nome'], 'UTF-8')] ?? 0,
            'subs'  => $subs,
        ];
    }
    return $saida;
}

// ── Fotos ──
// Pasta raiz do site no servidor. Este arquivo está em .../feito-de-afeto/api/admin/
function pasta_site()
{
    return dirname(__DIR__, 2);
}

// Aceita só caminhos simples dentro de uploads/ ou images/ (nada de "..", http:// ou arquivos soltos)
function caminho_de_foto_valido($arquivo)
{
    return is_string($arquivo) && strlen($arquivo) <= 255 && strpos($arquivo, '..') === false
        && preg_match('#^(uploads|images)/[A-Za-z0-9_./-]+$#', $arquivo) === 1;
}

// Apaga do servidor as fotos de uploads/ que nenhum produto usa mais
function remover_fotos_orfas(array $arquivos)
{
    global $pdo;
    $pastaUploads = realpath(pasta_site() . '/uploads');
    if (!$pastaUploads) {
        return;
    }
    $usa = $pdo->prepare('SELECT COUNT(*) FROM produto_imagens WHERE arquivo = ?');
    foreach (array_unique($arquivos) as $a) {
        if (strpos($a, 'uploads/') !== 0) {
            continue; // fotos de images/ (as originais do site) nunca são apagadas
        }
        $usa->execute([$a]);
        if ((int) $usa->fetchColumn() > 0) {
            continue; // ainda é usada por outro produto
        }
        $real = realpath(pasta_site() . '/' . $a);
        if ($real && strpos($real, $pastaUploads . DIRECTORY_SEPARATOR) === 0) {
            @unlink($real);
        }
    }
}
