// Favoritos e carrinho das páginas novas, salvos no navegador (localStorage).
// Usamos chaves próprias ("afeto-catalog-*") porque a home guarda o carrinho dela
// com ids numéricos em "afeto-cart"; misturar os dois quebraria a home.
const CHAVES = { favoritos: 'afeto-catalog-favorites-v2', carrinho: 'afeto-catalog-cart-v2' };

const ler = chave => { try { return JSON.parse(localStorage.getItem(chave)) ?? []; } catch { return []; } };
const gravar = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* modo privado: ignora */ } };

export const favoritos = {
  tem: id => ler(CHAVES.favoritos).includes(id),
  /** Liga/desliga e devolve o novo estado (true = favoritado). */
  alternar(id) {
    const lista = ler(CHAVES.favoritos);
    const novo = lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id];
    gravar(CHAVES.favoritos, novo);
    // Se a pessoa estiver logada, guarda também na conta (carregado só quando precisa)
    import('./conta.js').then(m => m.enviarFavorito(id, novo.includes(id)));
    return novo.includes(id);
  },
};

// "Vistos recentemente": guarda os últimos 12 slugs visitados (mais novo primeiro)
const CHAVE_VISTOS = 'afeto-catalog-vistos';
export const vistos = {
  lista: () => ler(CHAVE_VISTOS),
  registrar(slug) {
    const nova = [slug, ...ler(CHAVE_VISTOS).filter(s => s !== slug)].slice(0, 12);
    gravar(CHAVE_VISTOS, nova);
  },
};

const itensCarrinho = () => {
  const salvos = ler(CHAVES.carrinho);
  if (!Array.isArray(salvos)) return [];
  // Um arquivo digital por produto: não cobra cópias repetidas do mesmo PDF.
  return [...new Set(salvos.filter(l => l && ['string', 'number'].includes(typeof l.id) && l.qtd > 0).map(l => String(l.id)))].map(id => ({ id, qtd: 1 }));
};
const salvarCarrinho = lista => {
  gravar(CHAVES.carrinho, lista);
  window.dispatchEvent(new CustomEvent('afeto:carrinho'));
};
export const carrinho = {
  listar: itensCarrinho,
  total: () => itensCarrinho().length,
  adicionar(id) {
    id = String(id);
    const lista = itensCarrinho();
    if (lista.some(l => l.id === id)) return false;
    salvarCarrinho([...lista, { id, qtd: 1 }]);
    return true;
  },
  remover(id) { salvarCarrinho(itensCarrinho().filter(l => l.id !== String(id))); },
  removerComprados(ids) { const removidos = new Set(ids.map(String)); salvarCarrinho(itensCarrinho().filter(l => !removidos.has(l.id))); },
  limpar() { salvarCarrinho([]); },
};
window.addEventListener('storage', e => { if (e.key === CHAVES.carrinho || e.key === null) window.dispatchEvent(new CustomEvent('afeto:carrinho')); });
