<?php
// _loja.php: peças da loja usadas pelos endpoints públicos (comprar, pedido, webhook, baixar).
// Não é aberto pelo navegador (o .htaccess bloqueia arquivos que começam com "_").
if (!defined('API_INTERNA')) {
    http_response_code(403);
    exit;
}

// ── Respostas ──
function responder_json($dados, $codigo = 200)
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}
function falhar($mensagem, $codigo = 400)
{
    responder_json(['erro' => $mensagem], $codigo);
}

// Erro inesperado: mensagem genérica para o cliente; o detalhe vai só para o log do servidor.
function tratar_excecoes_publicas()
{
    set_exception_handler(function ($e) {
        error_log('[feito-de-afeto] loja: ' . $e->getMessage() . ' em ' . $e->getFile() . ':' . $e->getLine());
        falhar('Erro no servidor. Tente de novo em instantes.', 500);
    });
}

function ip_do_cliente()
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

/** Endereço do site (sem barra no fim). Prefira definir 'url_site' no config.php: é mais seguro que deduzir pelo pedido. */
function url_do_site()
{
    $configurada = rtrim((string) config_extra('url_site'), '/');
    if ($configurada !== '') {
        return $configurada;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host  = preg_replace('/[^A-Za-z0-9.:-]/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $pasta = dirname($_SERVER['SCRIPT_NAME'] ?? '/', 2); // /feito-de-afeto/api/x.php -> /feito-de-afeto
    if ($pasta === '/' || $pasta === '\\' || $pasta === '.') {
        $pasta = '';
    }
    return ($https ? 'https' : 'http') . '://' . $host . $pasta;
}

// ── CPF / CNPJ ──
function cpf_valido($c)
{
    if (strlen($c) !== 11 || preg_match('/^(\d)\1{10}$/', $c)) {
        return false;
    }
    for ($t = 9; $t < 11; $t++) {
        $soma = 0;
        for ($i = 0; $i < $t; $i++) {
            $soma += (int) $c[$i] * (($t + 1) - $i);
        }
        $digito = ((10 * $soma) % 11) % 10;
        if ((int) $c[$t] !== $digito) {
            return false;
        }
    }
    return true;
}
function cnpj_valido($c)
{
    if (strlen($c) !== 14 || preg_match('/^(\d)\1{13}$/', $c)) {
        return false;
    }
    $pesos = [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]];
    foreach ($pesos as $n => $lista) {
        $soma = 0;
        foreach ($lista as $i => $peso) {
            $soma += (int) $c[$i] * $peso;
        }
        $resto  = $soma % 11;
        $digito = $resto < 2 ? 0 : 11 - $resto;
        if ((int) $c[12 + $n] !== $digito) {
            return false;
        }
    }
    return true;
}
/** Devolve só os números do CPF/CNPJ se for válido; senão null. */
function documento_valido($texto)
{
    $n = preg_replace('/\D/', '', (string) $texto);
    if (strlen($n) === 11) {
        return cpf_valido($n) ? $n : null;
    }
    if (strlen($n) === 14) {
        return cnpj_valido($n) ? $n : null;
    }
    return null;
}

/** Confere o número do cartão (algoritmo de Luhn). Só detecta erro de digitação; não consulta ninguém. */
function cartao_numero_valido($n)
{
    $n = preg_replace('/\D/', '', (string) $n);
    $len = strlen($n);
    if ($len < 13 || $len > 19) {
        return false;
    }
    $soma = 0;
    for ($i = 0; $i < $len; $i++) {
        $d = (int) $n[$len - 1 - $i];
        if ($i % 2 === 1) {
            $d *= 2;
            if ($d > 9) $d -= 9;
        }
        $soma += $d;
    }
    return $soma % 10 === 0;
}

// ── Pedido pago ──
/**
 * Marca o pedido como PAGO, cria o código de download e avisa o cliente por e-mail.
 * Pode ser chamada várias vezes (pelo webhook e pela página do pedido): só a primeira "ganha"
 * (o UPDATE só acontece se o pedido ainda não estava pago), então o e-mail nunca sai duplicado.
 * @return bool true se foi ESTA chamada que confirmou o pedido
 */
function marcar_pago(PDO $pdo, $pedidoId)
{
    $token = bin2hex(random_bytes(24)); // 48 letras/números: impossível de adivinhar
    $up = $pdo->prepare("UPDATE pedidos SET status = 'pago', pago_em = NOW(), token_download = ? WHERE id = ? AND status <> 'pago'");
    $up->execute([$token, (int) $pedidoId]);
    if ($up->rowCount() !== 1) {
        return false;
    }
    try {
        require_once __DIR__ . '/_email.php';
        enviar_email_download($pdo, (int) $pedidoId);
    } catch (Throwable $e) {
        error_log('[feito-de-afeto] e-mail do pedido ' . (int) $pedidoId . ' não enviado: ' . $e->getMessage());
    }
    return true;
}

/** Confere na PRÓPRIA Asaas se o pagamento está pago e no valor certo (nunca confiamos só no aviso recebido). */
function pagamento_confirmado_no_asaas($idPagamento, $valorEsperado)
{
    if (!preg_match('/^[A-Za-z0-9_]{3,60}$/', (string) $idPagamento)) {
        return false;
    }
    [$status, $pag] = asaas_requisicao('GET', '/payments/' . rawurlencode($idPagamento));
    if ($status !== 200) {
        error_log('[feito-de-afeto] Asaas respondeu ' . $status . ' ao consultar o pagamento.');
        return false;
    }
    return asaas_status_pago($pag['status'] ?? '') && abs((float) ($pag['value'] ?? 0) - (float) $valorEsperado) < 0.01;
}
