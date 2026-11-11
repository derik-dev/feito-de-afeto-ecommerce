// Funções pequenas de formatação e de URL, usadas por todos os componentes.

export const moeda = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const notaBR = n => n.toFixed(1).replace('.', ',');
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
export const dataBR = iso => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

// Todo texto que vem de dados e entra em innerHTML passa por aqui (evita HTML injetado).
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// BASE_URL é "/" em desenvolvimento; se o site for publicado numa subpasta, os links continuam certos.
export const urlSite = (caminho = '') => `${import.meta.env.BASE_URL}${caminho}`;
export const urlProduto = slug => urlSite(`produto/?slug=${encodeURIComponent(slug)}`);
export const urlCatalogo = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return urlSite(`catalogo/${qs ? '?' + qs : ''}`);
};
