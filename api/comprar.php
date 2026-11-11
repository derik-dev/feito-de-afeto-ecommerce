<?php
// comprar.php: cria o pedido e o pagamento no Asaas (Pix ou cartão).
// Recebe JSON {slug, nome, email, cpf, metodo: 'pix'|'cartao', cartao?, cep?, numeroEndereco?, telefone?}.
//
// CARTÃO: os dados do cartão só passam por este arquivo, na memória, a caminho do Asaas.
// NÃO são gravados no banco, em arquivo, em log nem em sessão, e não aparecem em nenhuma resposta.
// Qualquer erro registra só o código/descrição que o Asaas devolveu (nunca o que foi enviado).
ini_set('display_errors', '0');
ini_set('log_errors', '1');
define('API_INTERNA', 1);
require __DIR__ . '/conexao.php';
require __DIR__ . '/_loja.php';
require __DIR__ . '/_asaas.php';
require __DIR__ . '/_cliente.php';
require __DIR__ . '/_pedido_itens.php';
tratar_excecoes_publicas();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    falhar('Método não permitido', 405);
}
if (!asaas_configurado()) {
    falhar('Os pagamentos ainda não estão ativos. Volte em breve.', 503);
}
exigir_mesma_origem();
// Só compra quem está com a conta logada: nome e e-mail vêm da conta (o e-mail do PDF é o da conta)
$conta = exigir_cliente($pdo);
$in = json_decode((string) file_get_contents('php://input', false, null, 0, 20001), true);
if (!is_array($in)) {
    falhar('Pedido inválido.');
}
$slug   = (string) ($in['slug'] ?? '');
$slugs = isset($in['itens']) ? $in['itens'] : [$slug];
if (!is_array($slugs) || !count($slugs) || count($slugs) > 30) falhar('Seu carrinho precisa ter de 1 a 30 arquivos.');
foreach ($slugs as $itemSlug) {
    if (!is_string($itemSlug) || strlen($itemSlug) > 200 || !preg_match('/^[a-z0-9-]+$/', $itemSlug)) falhar('Há um arquivo inválido no carrinho.');
}
$slugs = array_values(array_unique($slugs));
$nome   = $conta['nome'];
$email  = $conta['email'];
$doc    = documento_valido($in['cpf'] ?? '');
$metodo = (($in['metodo'] ?? 'pix') === 'cartao') ? 'cartao' : 'pix';

if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100) falhar('Confira o nome da sua conta.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) falhar('Digite um e-mail válido.');
if ($doc === null) falhar('CPF ou CNPJ inválido.');

// Dados extras do cartão: validados ANTES de criar qualquer pedido
$cartao = null;
$titular = null;
if ($metodo === 'cartao') {
    $c = is_array($in['cartao'] ?? null) ? $in['cartao'] : [];
    $numero = preg_replace('/\D/', '', (string) ($c['numero'] ?? ''));
    $nomeCartao = trim(preg_replace('/\s+/', ' ', (string) ($c['nome'] ?? '')));
    $cvv = preg_replace('/\D/', '', (string) ($c['cvv'] ?? ''));
    $valid = preg_replace('/\D/', '', (string) ($c['validade'] ?? ''));
    $mes = (int) substr($valid, 0, 2);
    $ano = strlen($valid) === 4 ? 2000 + (int) substr($valid, 2, 2) : 0;
    $cep = preg_replace('/\D/', '', (string) ($in['cep'] ?? ''));
    $numEnd = trim((string) ($in['numeroEndereco'] ?? ''));
    $tel = preg_replace('/\D/', '', (string) ($in['telefone'] ?? ''));

    if (!cartao_numero_valido($numero)) falhar('Número do cartão inválido.');
    if (mb_strlen($nomeCartao) < 3 || mb_strlen($nomeCartao) > 60) falhar('Digite o nome como está no cartão.');
    if ($mes < 1 || $mes > 12 || $ano < (int) date('Y') || ($ano === (int) date('Y') && $mes < (int) date('n'))) falhar('Validade do cartão inválida.');
    if (!preg_match('/^\d{3,4}$/', $cvv)) falhar('Código de segurança (CVV) inválido.');
    if (strlen($cep) !== 8) falhar('Digite o CEP (8 números).');
    if ($numEnd === '' || mb_strlen($numEnd) > 10) falhar('Digite o número do endereço.');
    if (!in_array(strlen($tel), [10, 11], true)) falhar('Digite o celular com DDD.');

    $cartao = [
        'holderName'  => $nomeCartao,
        'number'      => $numero,
        'expiryMonth' => sprintf('%02d', $mes),
        'expiryYear'  => (string) $ano,
        'ccv'         => $cvv,
    ];
    $titular = ['name' => $nome, 'email' => $email, 'cpfCnpj' => $doc, 'postalCode' => $cep, 'addressNumber' => $numEnd, 'mobilePhone' => $tel];
}
unset($in, $c, $numero, $cvv, $valid); // some da memória o que não precisa mais

// Limite por IP (cartão é mais restrito para dificultar teste de cartões roubados)
$ip = ip_do_cliente();
$q = $pdo->prepare('SELECT COUNT(*) FROM pedidos WHERE ip = ? AND criado_em > (NOW() - INTERVAL 15 MINUTE)');
$q->execute([$ip]);
if ((int) $q->fetchColumn() >= ($metodo === 'cartao' ? 4 : 8)) {
    falhar('Muitas tentativas. Aguarde alguns minutos.', 429);
}

// Todos os preços vêm do banco. Nenhum item indisponível é ignorado silenciosamente.
$marcadores = implode(',', array_fill(0, count($slugs), '?'));
$q = $pdo->prepare('SELECT p.id, p.titulo, p.preco FROM produtos p WHERE p.slug IN (' . $marcadores . ') AND p.ativo = 1 AND EXISTS (SELECT 1 FROM produto_arquivos a WHERE a.produto_id = p.id)');
$q->execute($slugs);
$produtos = $q->fetchAll();
if (count($produtos) !== count($slugs)) falhar('Um arquivo do carrinho ficou indisponível. Revise os itens antes de continuar.', 409);
$centavos = 0;
foreach ($produtos as $p) {
    $preco = (int) round((float) $p['preco'] * 100);
    if ($preco <= 0) falhar('Um arquivo está sem preço válido.', 409);
    $centavos += $preco;
}
$valor = $centavos / 100;
$multiplos = count($produtos) > 1;
$prod = $produtos[0];
if ($multiplos) {
    preparar_tabela_itens($pdo);
    $prod['titulo'] = count($produtos) . ' arquivos digitais Feito de Afeto';
}
$codigo = bin2hex(random_bytes(16));
$pdo->beginTransaction();
try {
$pdo->prepare("INSERT INTO pedidos (codigo, produto_id, produto_titulo, valor, nome, email, ip, status) VALUES (?,?,?,?,?,?,?, 'aguardando')")
    ->execute([$codigo, $multiplos ? null : $prod['id'], $prod['titulo'], $valor, $nome, $email, $ip]);
$pedidoId = (int) $pdo->lastInsertId();
$pdo->prepare('INSERT INTO cliente_pedidos (pedido_id, cliente_id) VALUES (?, ?)')->execute([$pedidoId, $conta['id']]);
if ($multiplos) {
    $inserir = $pdo->prepare('INSERT INTO pedido_itens (pedido_id, produto_id, titulo, valor) VALUES (?,?,?,?)');
    foreach ($produtos as $item) $inserir->execute([$pedidoId, $item['id'], $item['titulo'], $item['preco']]);
}
$pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}
$cancelar = function () use ($pdo, $pedidoId) {
    $pdo->prepare("UPDATE pedidos SET status = 'cancelado' WHERE id = ? AND status = 'aguardando'")->execute([$pedidoId]);
};

try {
    [$st, $cli] = asaas_requisicao('POST', '/customers', ['name' => $nome, 'email' => $email, 'cpfCnpj' => $doc]);
    if ($st !== 200 || empty($cli['id'])) {
        error_log('[feito-de-afeto] Asaas cliente: ' . $st . ' ' . asaas_resumo_erro($cli));
        $cancelar();
        falhar('Não foi possível iniciar o pagamento. Confira seus dados.', 502);
    }
    $corpo = [
        'customer' => $cli['id'],
        'billingType' => $metodo === 'cartao' ? 'CREDIT_CARD' : 'PIX',
        'value' => $valor,
        'dueDate' => date('Y-m-d', strtotime($metodo === 'cartao' ? 'today' : '+1 day')),
        'description' => mb_substr('Feito de Afeto - ' . $prod['titulo'], 0, 200),
        'externalReference' => $codigo,
    ];
    if ($metodo === 'cartao') {
        $corpo['creditCard'] = $cartao;
        $corpo['creditCardHolderInfo'] = $titular;
        $corpo['remoteIp'] = $ip;
    }
    [$st, $pag] = asaas_requisicao('POST', '/payments', $corpo);
    unset($corpo, $cartao, $titular); // dados do cartão já foram enviados: apaga da memória

    if ($st !== 200 || empty($pag['id'])) {
        error_log('[feito-de-afeto] Asaas pagamento (' . $metodo . '): ' . $st . ' ' . asaas_resumo_erro($pag));
        $cancelar();
        if ($metodo === 'cartao') {
            falhar('Pagamento recusado. Confira os dados ou tente outro cartão (ou pague no Pix).', 402);
        }
        falhar('Não foi possível iniciar o pagamento.', 502);
    }
    $pdo->prepare('UPDATE pedidos SET asaas_cliente = ?, asaas_pagamento = ?, link_pagamento = ? WHERE id = ?')
        ->execute([$cli['id'], $pag['id'], $pag['invoiceUrl'] ?? null, $pedidoId]);

    $pago = false;
    if ($metodo === 'cartao' && asaas_status_pago($pag['status'] ?? '')) {
        $pago = true;
        marcar_pago($pdo, $pedidoId);
    }
    responder_json(['codigo' => $codigo, 'pago' => $pago]);
} catch (RuntimeException $e) {
    error_log('[feito-de-afeto] comprar: ' . $e->getMessage());
    $cancelar();
    falhar('Pagamento indisponível no momento.', 502);
}
