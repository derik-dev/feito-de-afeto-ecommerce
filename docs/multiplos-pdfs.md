# Vários PDFs por produto

No admin, abra um produto e use **Arquivos PDF**. Selecione vários PDFs de uma vez, arraste os arquivos ou use **Adicionar mais PDFs**. Cada produto aceita até 1.000 PDFs de até 80 MB cada. A lixeira remove apenas o arquivo escolhido; confirme as mudanças em **Salvar produto**.

Os PDFs cadastrados anteriormente continuam disponíveis. Duplicar um produto exige enviar os PDFs da cópia, como antes.

Depois do pagamento, a página do pedido lista cada PDF com seu nome e botão de download. O carrinho cobra uma vez por produto, independentemente da quantidade de PDFs. Os arquivos continuam privados, com prazo de acesso e limite de downloads por PDF.

## Atualização da hospedagem

Publique o build do site e a pasta `api/` atualizada, como na instalação existente. O build do Vite não inclui a API PHP.

Ao salvar alterações nos PDFs, o servidor converte automaticamente o índice antigo `uk_arquivo_produto` em um índice que permite vários PDFs. Nenhum registro é apagado nessa atualização. A conta do banco precisa ter permissão `ALTER` para isso.

O contador de downloads de produtos com vários PDFs usa a tabela `pedido_arquivo_downloads`, criada automaticamente no primeiro download. A conta precisa ter permissão `CREATE`. Se a hospedagem restringir essas permissões, importe `banco-multiplos-pdfs.sql` pelo phpMyAdmin antes de usar o recurso. O script pode ser executado mais de uma vez.

A API PHP e o banco precisam estar rodando na hospedagem para testar uploads e downloads reais. O preview do Vite sozinho não executa PHP.
