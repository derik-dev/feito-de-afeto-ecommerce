<?php
// eu.php: quem está logado? GET. Devolve {logado, cliente, favoritos}.
ini_set('display_errors', '0');
define('API_INTERNA', 1);
require __DIR__ . '/../conexao.php';
require __DIR__ . '/../_cliente.php';
tratar_excecoes_publicas();
exigir_metodo_http('GET');

$c = cliente_atual($pdo);
if (!$c) {
    responder_json(['logado' => false]);
}
$f = $pdo->prepare('SELECT produto_id FROM cliente_favoritos WHERE cliente_id = ? ORDER BY criado_em DESC');
$f->execute([$c['id']]);
responder_json(['logado' => true, 'cliente' => dados_do_cliente($c), 'favoritos' => array_map('strval', $f->fetchAll(PDO::FETCH_COLUMN))]);
