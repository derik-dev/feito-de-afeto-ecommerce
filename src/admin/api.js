// Conversa do painel com o servidor (api/admin/*.php).
export const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api/admin/`;

let csrf = ''; // código de segurança da sessão: vai em todo pedido que altera alguma coisa
export const definirCsrf = token => { csrf = token; };

/**
 * Faz um pedido à API. Devolve o JSON da resposta ou lança um Error com mensagem em português.
 * e.status = código HTTP (401 = sessão terminou) · e.rede = true se nem chegou a falar com o servidor.
 */
export async function api(nome, { metodo = 'GET', corpo, form } = {}) {
  const opcoes = { method: metodo, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (metodo !== 'GET') opcoes.headers['X-CSRF-Token'] = csrf;
  if (corpo) { opcoes.headers['Content-Type'] = 'application/json'; opcoes.body = JSON.stringify(corpo); }
  if (form) opcoes.body = form; // o navegador define o Content-Type do envio de arquivos sozinho
  let r;
  try { r = await fetch(API + nome, opcoes); }
  catch { throw Object.assign(new Error('Sem conexão com o servidor. Verifique a internet.'), { rede: true }); }
  let dados = null;
  try { dados = await r.json(); } catch { /* a resposta não era JSON */ }
  if (!r.ok || !dados) {
    const e = new Error(dados?.erro || (r.ok ? 'O servidor não respondeu como esperado.' : `Erro ${r.status} no servidor.`));
    e.status = r.status;
    e.rede = !dados;
    throw e;
  }
  return dados;
}

/** Endereço de uma foto guardada no banco ("uploads/x.webp", "images/agendas/x.webp" ou o formato antigo "agendas/x.webp"). */
export const enderecoFoto = a => (/^(uploads|images)\//.test(a ?? '') ? `${BASE}${a}` : `${BASE}images/${a ?? ''}`);

/**
 * Envia um arquivo mostrando o andamento (0 a 100). Usa XMLHttpRequest porque o fetch não informa o progresso do envio.
 * Devolve o JSON da resposta; em caso de erro lança Error com mensagem em português (e.status = código HTTP).
 */
export function enviarComProgresso(nome, form, aoProgredir) {
  return new Promise((resolver, rejeitar) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API + nome);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-CSRF-Token', csrf);
    xhr.upload.onprogress = e => { if (e.lengthComputable) aoProgredir?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => rejeitar(Object.assign(new Error('Sem conexão com o servidor. Verifique a internet.'), { rede: true }));
    xhr.onload = () => {
      let dados = null;
      try { dados = JSON.parse(xhr.responseText); } catch { /* não era JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && dados) return resolver(dados);
      const msg = dados?.erro || (xhr.status === 413 ? 'O PDF é maior do que o servidor aceita.' : `Erro ${xhr.status} no servidor.`);
      rejeitar(Object.assign(new Error(msg), { status: xhr.status }));
    };
    xhr.send(form);
  });
}
