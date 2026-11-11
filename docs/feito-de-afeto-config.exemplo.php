<?php
// MODELO do arquivo de configuração do banco. NÃO coloque a senha real aqui: este modelo vai para o Git.
//
// Na Hostinger, crie um arquivo chamado exatamente   feito-de-afeto-config.php   FORA da public_html:
//   hPanel > Arquivos > Gerenciador de Arquivos > entre em  domains/netpubli.com.br/
//   (a pasta que contém a public_html, ao lado dela, NÃO dentro dela) > Novo arquivo.
//   Caminho final:  domains/netpubli.com.br/feito-de-afeto-config.php
// Cole o conteúdo abaixo, trocando pelos dados reais (hPanel > Bancos de dados > MySQL).
// Esse arquivo fica só no servidor: nunca baixe para o projeto nem envie para o Git.

return [
    'host'    => 'localhost',                 // na Hostinger é quase sempre "localhost"
    'banco'   => 'u123456789_nomedobanco',    // nome do banco (começa com o prefixo da sua conta)
    'usuario' => 'u123456789_usuario',        // usuário do banco
    'senha'   => 'COLE_A_SENHA_AQUI',         // senha do usuário do banco

    // Usada UMA vez, para criar o primeiro usuário do painel (api/admin/instalar.php).
    // Invente um texto longo e secreto (mínimo 12 letras). Depois de criar o usuário, pode até apagar esta linha.
    'chave_instalacao' => 'INVENTE-UM-TEXTO-LONGO-E-SECRETO',

    // ── Pagamentos (Asaas) ──
    'asaas_chave'         => 'COLE_A_CHAVE_DA_API_DO_ASAAS',   // Asaas > Integrações > Chave de API (use aspas simples se tiver $)
    'asaas_ambiente'      => 'sandbox',                        // 'sandbox' para testar; troque para 'producao' quando for valer
    'asaas_webhook_token' => 'INVENTE-UM-TOKEN-LONGO-12345',   // o MESMO texto que você colocar no webhook do Asaas
    'url_site'            => 'https://netpubli.com.br/feito-de-afeto',
    'email_remetente'     => 'contato@netpubli.com.br',        // um e-mail do seu domínio (melhora a entrega)
    // ── Saque pelo painel: para onde o dinheiro vai (só aqui, nunca pelo painel) ──
    'saque_tipo'  => 'CPF',                                    // CPF, CNPJ, EMAIL, PHONE ou EVP (chave aleatória)
    'saque_chave' => 'SUA_CHAVE_PIX_AQUI',                     // a chave Pix da SUA conta bancária
    'asaas_saque_token' => 'INVENTE-OUTRO-TOKEN-LONGO',        // autorização automática de saque (Asaas > Integrações > Mecanismos de segurança)
    // Opcionais: 'pasta_arquivos' => '/caminho/fora/da/public_html', 'max_downloads' => 10, 'dias_download' => 30,
];
