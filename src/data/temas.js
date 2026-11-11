// Paletas por categoria. Cada categoria "veste" o card, o catálogo e a página de produto com a sua cor.
//   bg   = cor da moldura/painéis       soft = versão bem clara (fundos de seção)
//   fg   = cor de destaque (textos/botões da categoria)       page = cor do fundo da página
// Para dar uma cor a uma categoria nova (criada no painel), acrescente uma linha em TEMAS.
const TEMAS = {
  Agendamento: { bg: '#dbe5fb', soft: '#eef2fd', fg: '#1f3a8a', page: '#f5f8fe' },
  Religiosas: { bg: '#fcebbd', soft: '#fff7e0', fg: '#8f5f0a', page: '#fffaf0' },
  'Jardim Encantado': { bg: '#d4edd0', soft: '#ecf7ea', fg: '#2c6a3a', page: '#f4fbf3' },
};
const PADRAO = { bg: '#fde1ec', soft: '#fff0f6', fg: '#d10a50', page: '#fff7fa' };
// Categorias sem tema próprio recebem uma destas, sempre a mesma para o mesmo nome
const EXTRAS = [
  { bg: '#e6dcf7', soft: '#f3eefb', fg: '#6b3fb0', page: '#faf7fe' },
  { bg: '#ffe0d2', soft: '#fff0e9', fg: '#bf4a1a', page: '#fff8f4' },
  { bg: '#d3edf8', soft: '#eaf6fc', fg: '#17688f', page: '#f4fafd' },
];

// SEM cores por categoria: todas usam a mesma paleta neutra, com o rosa da marca como destaque.
const NEUTRO = { bg: '#f4eef1', soft: '#fff0f6', fg: '#d10a50', page: '#f3f1f3' };
export function temaDe() {
  return NEUTRO;
}

/** Texto para o atributo style="": define as variáveis de cor daquele elemento. */
export const estiloDoTema = categoria => {
  const t = temaDe(categoria);
  return `--t-bg:${t.bg};--t-soft:${t.soft};--t-fg:${t.fg};--t-page:${t.page}`;
};

/** Pinta a PÁGINA inteira (fundo e destaques) com a cor da categoria. */
export function aplicarTemaNaPagina(categoria) {
  const t = temaDe(categoria);
  const b = document.body;
  b.classList.add('loja');
  b.style.setProperty('--t-bg', t.bg);
  b.style.setProperty('--t-soft', t.soft);
  b.style.setProperty('--t-fg', t.fg);
  b.style.setProperty('--t-page', t.page);
}
