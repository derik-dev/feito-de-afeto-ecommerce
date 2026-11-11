<?php
// _saque.php: peças do financeiro do painel (destino do saque, máscara, rótulos). Só funciona incluído.
if (!defined('ADMIN_API')) {
    http_response_code(403);
    exit;
}
require_once __DIR__ . '/../_asaas.php';

/**
 * Para onde o dinheiro vai. Fica SÓ no config.php do servidor (nunca no painel), então mesmo que alguém
 * entre no painel não consegue mandar o dinheiro para outra conta.
 *   'saque_chave' => 'sua chave Pix',  'saque_tipo' => 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'
 * @return array|null [tipo, chave]
 */
function destino_saque()
{
    $tipo  = strtoupper((string) config_extra('saque_tipo'));
    $cru   = config_extra('saque_chave');
    $chave = trim((string) $cru);
    if ($chave === '' || !in_array($tipo, ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'], true)) {
        return null;
    }
    if (in_array($tipo, ['CPF', 'CNPJ', 'PHONE'], true)) {
        $chave = preg_replace('/\D/', '', $chave); // o Asaas quer só números
        // Se a chave foi escrita SEM aspas no config, o PHP come os zeros do começo: devolvemos
        if (is_int($cru) && $tipo !== 'PHONE') {
            $chave = str_pad($chave, $tipo === 'CPF' ? 11 : 14, '0', STR_PAD_LEFT);
        }
        $tamanhos = ['CPF' => [11], 'CNPJ' => [14], 'PHONE' => [10, 11]];
        if (!in_array(strlen($chave), $tamanhos[$tipo], true)) {
            return null; // tamanho errado para o tipo: melhor avisar do que o Asaas recusar
        }
    }
    return [$tipo, $chave];
}

function destino_mascarado()
{
    $d = destino_saque();
    if (!$d) {
        return null;
    }
    [$tipo, $chave] = $d;
    if ($tipo === 'EMAIL' && strpos($chave, '@') !== false) {
        [$u, $dom] = explode('@', $chave, 2);
        $mascara = substr($u, 0, 2) . '***@' . $dom;
    } else {
        $mascara = '****' . substr($chave, -4);
    }
    $digitos = in_array($tipo, ['CPF', 'CNPJ', 'PHONE'], true) ? ' · ' . strlen($chave) . ' dígitos' : '';
    return ['tipo' => $tipo, 'texto' => 'Pix (' . $tipo . ') ' . $mascara . $digitos];
}
