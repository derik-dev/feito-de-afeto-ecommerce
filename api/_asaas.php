<?php
// _asaas.php: conversa com a API do Asaas (https://docs.asaas.com). Usa a extensão cURL do PHP.
// A chave da API fica SÓ no config.php do servidor ('asaas_chave'). Ela nunca é escrita em log nem enviada ao navegador.
if (!defined('API_INTERNA')) {
    http_response_code(403);
    exit;
}

function asaas_configurado()
{
    return config_extra('asaas_chave') !== '';
}

/** 'sandbox' (testes, dinheiro de mentira) ou 'producao' (de verdade). Padrão: sandbox. */
function asaas_ambiente()
{
    return config_extra('asaas_ambiente', 'sandbox') === 'producao' ? 'producao' : 'sandbox';
}

function asaas_base()
{
    return asaas_ambiente() === 'producao' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
}

/** Status do Asaas que significam "o dinheiro entrou". */
function asaas_status_pago($status)
{
    return in_array($status, ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'], true);
}

/**
 * Faz uma chamada à API do Asaas.
 * @return array [codigoHttp, dadosEmArray]
 * @throws RuntimeException se nem conseguir falar com o Asaas
 */
function asaas_requisicao($metodo, $caminho, $corpo = null)
{
    if (!asaas_configurado()) {
        throw new RuntimeException('Asaas não configurado (falta asaas_chave no config.php).');
    }
    if (!function_exists('curl_init')) {
        throw new RuntimeException('A extensão cURL do PHP não está ativa neste servidor.');
    }
    $ch = curl_init(asaas_base() . $caminho);
    $cabecalhos = [
        'Content-Type: application/json',
        'Accept: application/json',
        'access_token: ' . config_extra('asaas_chave'),
        'User-Agent: FeitoDeAfeto/1.0', // o Asaas exige um User-Agent
    ];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $metodo,
        CURLOPT_HTTPHEADER     => $cabecalhos,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    if ($corpo !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($corpo, JSON_UNESCAPED_UNICODE));
    }
    $resposta = curl_exec($ch);
    $status   = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erroCurl = curl_error($ch);
    curl_close($ch);
    if ($resposta === false) {
        throw new RuntimeException('Falha de conexão com o Asaas: ' . $erroCurl);
    }
    $dados = json_decode($resposta, true);
    return [$status, is_array($dados) ? $dados : []];
}

/** Resume os erros que o Asaas devolveu (para o log do servidor; sem dados pessoais). */
function asaas_resumo_erro(array $dados)
{
    $partes = [];
    foreach ($dados['errors'] ?? [] as $e) {
        $partes[] = ($e['code'] ?? '?') . ': ' . ($e['description'] ?? '');
    }
    return $partes ? implode(' | ', $partes) : 'sem detalhe';
}
