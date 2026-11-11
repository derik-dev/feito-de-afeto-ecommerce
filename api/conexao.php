<?php
// conexao.php: cria a conexão com o MySQL na variável $pdo.
// Este arquivo NÃO tem senha. As credenciais ficam num arquivo só do servidor, FORA da public_html,
// que não vai para o Git. Veja docs/feito-de-afeto-config.exemplo.php para saber o que colocar nele.
//
// Uso (em outro arquivo PHP desta pasta):   require __DIR__ . '/conexao.php';   // depois use $pdo

// 1) Se alguém abrir /api/conexao.php direto no navegador, barra na hora (ele só deve ser incluído por outro PHP).
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(403);
    exit;
}

// Resposta de erro padrão: genérica para o visitante; o detalhe vai só para o log do servidor (error_log).
function falhar_conexao($detalhe)
{
    error_log('[feito-de-afeto] ' . $detalhe);
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['erro' => 'Falha ao conectar no banco']);
    exit;
}

// 2) Onde procurar o arquivo de configuração. Este arquivo está em  .../public_html/feito-de-afeto/api/
//    __DIR__ = .../public_html/feito-de-afeto/api
//    dirname(__DIR__, 3) = .../domains/netpubli.com.br        (a pasta que CONTÉM a public_html)  <- local recomendado
//    dirname(__DIR__, 5) = /home/uXXXXXXXXX                   (a pasta pessoal da conta)          <- alternativa
//    Também aceita a variável de ambiente FEITO_DE_AFETO_CONFIG, se um dia você preferir usá-la.
//    Por último, aceita  api/config.php  (aqui mesmo, dentro da pasta pública). Funciona, mas é menos seguro:
//    fica protegido só pelo .htaccess desta pasta. A ordem importa: se existir o de fora, ele ganha.
$configInterna = __DIR__ . '/config.php';
$candidatos = array_filter([
    getenv('FEITO_DE_AFETO_CONFIG') ?: null,
    dirname(__DIR__, 3) . '/feito-de-afeto-config.php',
    dirname(__DIR__, 5) . '/feito-de-afeto-config.php',
    $configInterna,
]);

$arquivo = null;
foreach ($candidatos as $c) {
    if (is_file($c)) {
        $arquivo = $c;
        break;
    }
}
if ($arquivo === null) {
    falhar_conexao('Arquivo de configuração não encontrado. Procurei em: ' . implode(' | ', $candidatos));
}

// 3) Trava de segurança: se o arquivo estiver dentro da public_html (acessível pela internet), recusa.
//    A única exceção é o api/config.php (escolha consciente, protegido pelo .htaccess).
$raizPublica = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
if ($arquivo !== $configInterna && $raizPublica && strpos(realpath($arquivo), $raizPublica . DIRECTORY_SEPARATOR) === 0) {
    falhar_conexao('O arquivo de configuração está DENTRO da public_html (' . $arquivo . '). Mova para fora dela.');
}

// 4) Lê e confere as 4 informações.
$cfg = require $arquivo;
foreach (['host', 'banco', 'usuario', 'senha'] as $chave) {
    if (!is_array($cfg) || !array_key_exists($chave, $cfg)) {
        falhar_conexao("Falta a chave '$chave' em $arquivo");
    }
}

// 5) Conecta. PDO = o "telefone" que liga o PHP ao MySQL.
try {
    $pdo = new PDO(
        "mysql:host={$cfg['host']};dbname={$cfg['banco']};charset=utf8mb4",
        $cfg['usuario'],
        $cfg['senha'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // erros viram exceções (dá para tratar)
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // resultados como array com nomes de coluna
            PDO::ATTR_EMULATE_PREPARES   => false,                    // prepared statements de verdade (mais seguro)
        ]
    );
} catch (PDOException $e) {
    falhar_conexao('Erro do MySQL: ' . $e->getMessage());
}

// Chave usada UMA vez, para criar o primeiro usuário do painel (api/admin/instalar.php). Opcional.
$chaveInstalacao = isset($cfg['chave_instalacao']) ? (string) $cfg['chave_instalacao'] : '';

// Demais chaves do config (Asaas, e-mail, pasta dos PDFs...). Tudo que NÃO é dado do banco fica em $configExtra.
// Uso:  config_extra('asaas_chave')
$configExtra = array_diff_key(is_array($cfg) ? $cfg : [], array_flip(['host', 'banco', 'usuario', 'senha']));
function config_extra($chave, $padrao = '')
{
    global $configExtra;
    return isset($configExtra[$chave]) && $configExtra[$chave] !== '' ? $configExtra[$chave] : $padrao;
}

// A senha do banco não precisa mais ficar na memória do script.
unset($cfg);
