<?php
// _cliente.php: conta e login de quem COMPRA (não confundir com o painel do admin).
// O login funciona por um cookie com um código aleatório. No banco guardamos só o "hash" desse código,
// então mesmo que o banco vazasse, ninguém conseguiria entrar nas contas.
if (!defined('API_INTERNA')) {
    http_response_code(403);
    exit;
}
require_once __DIR__ . '/_loja.php';

const COOKIE_CLIENTE = 'feito_cliente';
const DIAS_SESSAO    = 30;

function site_https()
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}
/** Pasta do site no servidor web (ex.: /feito-de-afeto), onde o cookie vale. */
function caminho_do_cookie()
{
    $script = (string) ($_SERVER['SCRIPT_NAME'] ?? '/');
    $pos = strpos($script, '/api/');
    $c = $pos === false ? '/' : substr($script, 0, $pos);
    return $c === '' ? '/' : $c;
}

/** Só aceita pedidos vindos do próprio site (protege contra CSRF junto com o cookie SameSite). */
function exigir_mesma_origem()
{
    $origem = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origem !== '') {
        $hostOrigem = parse_url($origem, PHP_URL_HOST);
        $hostSite = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? '');
        if ($hostOrigem !== $hostSite) {
            falhar('Pedido recusado.', 403);
        }
    }
}
function exigir_metodo_http($metodo)
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $metodo) {
        header('Allow: ' . $metodo);
        falhar('Método não permitido.', 405);
    }
    if ($metodo !== 'GET') {
        exigir_mesma_origem();
    }
}
function corpo_json_publico()
{
    $bruto = file_get_contents('php://input', false, null, 0, 20001);
    if ($bruto === false || strlen($bruto) > 20000) {
        falhar('Dados grandes demais.', 413);
    }
    $d = json_decode($bruto, true);
    if (!is_array($d)) {
        falhar('Dados inválidos.');
    }
    return $d;
}

/** Cliente logado: ['id','nome','email'] ou null. */
function cliente_atual(PDO $pdo)
{
    static $cache = false;
    if ($cache !== false) {
        return $cache;
    }
    $token = (string) ($_COOKIE[COOKIE_CLIENTE] ?? '');
    $cache = null;
    if (preg_match('/^[a-f0-9]{48}$/', $token)) {
        $q = $pdo->prepare('SELECT c.id, c.nome, c.email FROM cliente_sessoes s JOIN clientes c ON c.id = s.cliente_id WHERE s.token_hash = ? AND s.expira > NOW()');
        $q->execute([hash('sha256', $token)]);
        $linha = $q->fetch();
        $cache = $linha ? ['id' => (int) $linha['id'], 'nome' => $linha['nome'], 'email' => $linha['email']] : null;
    }
    return $cache;
}
function exigir_cliente(PDO $pdo)
{
    $c = cliente_atual($pdo);
    if (!$c) {
        falhar('Entre na sua conta para continuar.', 401);
    }
    return $c;
}

function iniciar_sessao_cliente(PDO $pdo, $clienteId)
{
    $token = bin2hex(random_bytes(24));
    $pdo->prepare('INSERT INTO cliente_sessoes (cliente_id, token_hash, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ' . DIAS_SESSAO . ' DAY))')
        ->execute([(int) $clienteId, hash('sha256', $token)]);
    if (random_int(1, 20) === 1) { // faxina de vez em quando
        $pdo->exec('DELETE FROM cliente_sessoes WHERE expira < NOW()');
        $pdo->exec('DELETE FROM cliente_tentativas WHERE criado_em < (NOW() - INTERVAL 1 DAY)');
    }
    setcookie(COOKIE_CLIENTE, $token, [
        'expires'  => time() + DIAS_SESSAO * 86400,
        'path'     => caminho_do_cookie(),
        'secure'   => site_https(),
        'httponly' => true,     // o JavaScript da página não consegue ler o cookie
        'samesite' => 'Lax',
    ]);
}
function encerrar_sessao_cliente(PDO $pdo)
{
    $token = (string) ($_COOKIE[COOKIE_CLIENTE] ?? '');
    if (preg_match('/^[a-f0-9]{48}$/', $token)) {
        $pdo->prepare('DELETE FROM cliente_sessoes WHERE token_hash = ?')->execute([hash('sha256', $token)]);
    }
    setcookie(COOKIE_CLIENTE, '', ['expires' => time() - 3600, 'path' => caminho_do_cookie(), 'secure' => site_https(), 'httponly' => true, 'samesite' => 'Lax']);
}

// ── Limite de tentativas (contra quem tenta adivinhar senhas ou criar milhares de contas) ──
function tentativas_recentes(PDO $pdo, $tipo, $minutos)
{
    $q = $pdo->prepare('SELECT COUNT(*) FROM cliente_tentativas WHERE tipo = ? AND ip = ? AND criado_em > (NOW() - INTERVAL ' . (int) $minutos . ' MINUTE)');
    $q->execute([$tipo, ip_do_cliente()]);
    return (int) $q->fetchColumn();
}
function registrar_tentativa(PDO $pdo, $tipo)
{
    $pdo->prepare('INSERT INTO cliente_tentativas (tipo, ip) VALUES (?, ?)')->execute([$tipo, ip_do_cliente()]);
}

function senha_aceitavel($senha)
{
    if (strlen($senha) < 8) falhar('A senha precisa ter pelo menos 8 caracteres.');
    if (strlen($senha) > 100) falhar('Senha longa demais.');
}
function dados_do_cliente(array $c)
{
    return ['nome' => $c['nome'], 'email' => $c['email']];
}
