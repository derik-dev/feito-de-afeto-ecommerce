<?php
// _email.php: envio do e-mail com o link do PDF depois do pagamento. Usa o mail() do PHP (a hospedagem entrega).
if (!defined('API_INTERNA')) {
    http_response_code(403);
    exit;
}

function enviar_email($para, $assunto, $html, $texto)
{
    $host = preg_replace('/^www\./', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $de   = (string) config_extra('email_remetente', 'no-reply@' . $host);
    if (!filter_var($de, FILTER_VALIDATE_EMAIL) || !filter_var($para, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('E-mail do remetente ou do destinatário inválido.');
    }
    $limite = 'fda_' . bin2hex(random_bytes(8));
    $cabecalhos = [
        'From: =?UTF-8?B?' . base64_encode('Feito de Afeto') . '?= <' . $de . '>',
        'Reply-To: ' . $de,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $limite . '"',
    ];
    $corpo = "--$limite\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($texto))
           . "--$limite\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html))
           . "--$limite--";
    $ok = @mail($para, '=?UTF-8?B?' . base64_encode($assunto) . '?=', $corpo, implode("\r\n", $cabecalhos), '-f' . $de);
    if (!$ok) {
        throw new RuntimeException('A função mail() recusou o envio.');
    }
}

/** E-mail de "pagamento confirmado" com o botão para baixar o PDF. */
function enviar_email_download(PDO $pdo, $pedidoId)
{
    require_once __DIR__ . '/_pedido_itens.php';
    $q = $pdo->prepare('SELECT codigo, produto_titulo, nome, email, token_download FROM pedidos WHERE id = ? AND status = \'pago\'');
    $q->execute([(int) $pedidoId]);
    $p = $q->fetch();
    if (!$p || empty($p['token_download'])) {
        return;
    }
    $site    = url_do_site();
    $baixar  = $site . '/api/baixar.php?t=' . $p['token_download'];
    $pedido  = $site . '/pedido/?c=' . $p['codigo'];
    $multiplos = count(arquivos_do_pedido($pdo, $pedidoId)) > 1;
    if ($multiplos) $baixar = $pedido;
    $rotuloDownload = $multiplos ? 'Ver e baixar meus PDFs' : 'Baixar o meu PDF';
    $primeiro = trim(explode(' ', (string) $p['nome'])[0]);
    $h = fn($t) => htmlspecialchars((string) $t, ENT_QUOTES, 'UTF-8');

    $html = '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#14243d">'
          . '<h2 style="color:#eb0c59;margin:0 0 8px">Pagamento confirmado! 💖</h2>'
          . '<p>Oi, ' . $h($primeiro) . '! Recebemos o seu pagamento de <b>' . $h($p['produto_titulo']) . '</b>.</p>'
          . '<p style="margin:26px 0"><a href="' . $h($baixar) . '" style="background:#eb0c59;color:#fff;text-decoration:none;padding:14px 26px;border-radius:30px;font-weight:bold;display:inline-block">' . $h($rotuloDownload) . '</a></p>'
          . '<p style="font-size:13px;color:#6f5a68">O link é só seu: não compartilhe com outras pessoas. Se o botão não abrir, copie este endereço no navegador:<br>' . $h($baixar) . '</p>'
          . '<p style="font-size:13px;color:#6f5a68">Você também pode acompanhar o pedido aqui: <a href="' . $h($pedido) . '">' . $h($pedido) . '</a></p>'
          . '<p style="font-size:13px;color:#6f5a68">Feito de Afeto</p></div>';
    $texto = "Pagamento confirmado!\n\nOi, $primeiro! Recebemos o pagamento de {$p['produto_titulo']}.\n\nBaixe o seu PDF aqui:\n$baixar\n\nO link é só seu: não compartilhe.\nAcompanhe o pedido: $pedido\n\nFeito de Afeto";
    enviar_email($p['email'], 'Seu PDF está pronto: ' . $p['produto_titulo'], $html, $texto);
}
