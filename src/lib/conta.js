// Conta do cliente: fala com api/conta/*.php. O login é um cookie "httpOnly" que o servidor cuida
// (o JavaScript nunca vê o cookie nem a senha guardada). Aqui só guardamos uma "dica" no navegador
// (afeto-logado) para saber se vale a pena perguntar ao servidor, sem pesar nas páginas de quem não tem conta.
import { urlSite } from './format.js';

const DICA = 'afeto-logado';
const CHAVE_FAV = 'afeto-catalog-favorites-v2'; // mesma chave de storage.js

const dica = {
  tem: () => { try { return localStorage.getItem(DICA) === '1'; } catch { return false; } },
  liga: () => { try { localStorage.setItem(DICA, '1'); } catch {} },
  desliga: () => { try { localStorage.removeItem(DICA); } catch {} },
};
const lerFav = () => { try { return JSON.parse(localStorage.getItem(CHAVE_FAV)) ?? []; } catch { return []; } };
const gravarFav = lista => { try { localStorage.setItem(CHAVE_FAV, JSON.stringify(lista)); } catch {} };

async function chamar(arquivo, { metodo = 'GET', corpo } = {}) {
  const r = await fetch(urlSite(`api/conta/${arquivo}`), {
    method: metodo, cache: 'no-store', credentials: 'same-origin',
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(dados.erro || 'Algo deu errado. Tente de novo.'); e.status = r.status; throw e; }
  return dados;
}

export const estaLogadoProvavel = () => dica.tem();

let cacheEu = null;
/** Pergunta ao servidor quem está logado (uma vez por página). Devolve {logado, cliente, favoritos}. */
export function eu(forcar = false) {
  if (!cacheEu || forcar) {
    cacheEu = chamar('eu.php').catch(() => ({ logado: false, falhou: true }));
    cacheEu.then(d => { if (d.logado) dica.liga(); else if (!d.falhou) dica.desliga(); });
  }
  return cacheEu;
}

export async function entrar(email, senha) {
  const d = await chamar('entrar.php', { metodo: 'POST', corpo: { email, senha } });
  await depoisDoLogin(d);
  return d;
}
export async function cadastrar(nome, email, senha) {
  const d = await chamar('cadastrar.php', { metodo: 'POST', corpo: { nome, email, senha } });
  await depoisDoLogin(d);
  return d;
}
/** Junta os favoritos que a pessoa já tinha no navegador com os da conta. */
async function depoisDoLogin(d) {
  dica.liga(); cacheEu = null;
  const locais = lerFav();
  const uniao = [...new Set([...(d.favoritos ?? []), ...locais])];
  gravarFav(uniao);
  if (locais.some(id => !(d.favoritos ?? []).includes(id))) {
    try { gravarFav((await chamar('favoritos.php', { metodo: 'POST', corpo: { acao: 'mesclar', produtos: locais } })).favoritos); } catch {}
  }
}
export async function sair() {
  try { await chamar('sair.php', { metodo: 'POST', corpo: {} }); } finally { dica.desliga(); cacheEu = null; }
}
export const pedidos = () => chamar('pedidos.php');
export const salvarNome = nome => chamar('dados.php', { metodo: 'POST', corpo: { nome } });
export const trocarSenha = (senhaAtual, senhaNova) => chamar('dados.php', { metodo: 'POST', corpo: { senhaAtual, senhaNova } });

/** Avisa o servidor quando a pessoa favorita/desfavorita (só se estiver logada). */
export function enviarFavorito(id, ligado) {
  if (!dica.tem()) return;
  chamar('favoritos.php', { metodo: 'POST', corpo: { acao: 'alternar', produto: id, ligado } }).catch(e => { if (e.status === 401) dica.desliga(); });
}

/** Em toda página: se a pessoa está logada, traz os favoritos da conta e atualiza os corações. */
export async function sincronizarSessao() {
  if (!dica.tem()) return;
  const d = await eu();
  if (!d.logado) return;
  gravarFav(d.favoritos ?? []);
  const set = new Set(d.favoritos ?? []);
  document.querySelectorAll('[data-favorite]').forEach(b => {
    const ligado = set.has(b.dataset.favorite);
    b.classList.toggle('is-favorite', ligado);
    b.setAttribute('aria-pressed', String(ligado));
  });
}

/** Só aceita voltar para um endereço do próprio site (evita redirecionar para outro site). */
export function destinoSeguro(valor, padrao = 'conta/') {
  if (!valor || /^[a-z]+:/i.test(valor) || valor.startsWith('//') || valor.startsWith('\\') || /[\r\n]/.test(valor)) return padrao;
  return valor.replace(/^\/+/, '');
}
