import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Site com várias páginas HTML (não é SPA): cada entrada abaixo vira uma página no build.
//   /                 -> index.html            (home)
//   /catalogo/        -> catalogo/index.html   (listagem com filtros)
//   /produto/?slug=x  -> produto/index.html    (detalhe do produto)
//   /admin/           -> admin/index.html      (painel de cadastro de produtos)

// Faz "/catalogo" e "/produto" (sem a barra final) abrirem a página certa no `npm run dev`
// e no `npm run preview`. Sem isso o Vite devolveria a home.
const paginasSemBarra = {
  name: 'paginas-sem-barra-final',
  configureServer: instalar,
  configurePreviewServer: instalar,
};
function instalar(server) {
  server.middlewares.use((req, _res, next) => {
    req.url = req.url.replace(/^\/(catalogo|produto|admin|comprar|pedido|entrar|conta|carrinho)(?=[?#]|$)/, '/$1/');
    next();
  });
}

export default defineConfig({
  plugins: [paginasSemBarra],
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        catalogo: resolve(import.meta.dirname, 'catalogo/index.html'),
        produto: resolve(import.meta.dirname, 'produto/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
        comprar: resolve(import.meta.dirname, 'comprar/index.html'),
        carrinho: resolve(import.meta.dirname, 'carrinho/index.html'),
        entrar: resolve(import.meta.dirname, 'entrar/index.html'),
        conta: resolve(import.meta.dirname, 'conta/index.html'),
        pedido: resolve(import.meta.dirname, 'pedido/index.html'),
      },
    },
  },
});
