// Tela de cadastro/edição de produto. Modos: "novo", "editar" e "duplicar".
// Tudo que a pessoa digita fica no objeto `f`; a prévia e os avisos são desenhados a partir dele.
import { api, enderecoFoto, enviarComProgresso } from '../api.js';
import { estado, carregarTudo, formulario } from '../estado.js';
import { esc, icone, reais, toast, confirmar, perguntar, numero, paraCampo, tamanho } from '../ui.js';

const INCLUSO_PADRAO = ['Arquivo PDF pronto para imprimir', 'Capa em alta resolução', 'Guia rápido de impressão'];
const LIMITE_PDFS = 1000;
const SUGESTOES_INCLUSO = [
  'Arquivo PDF pronto para imprimir', 'Capa em alta resolução', 'Guia rápido de impressão', 'Páginas semanais e diárias',
  'Calendário anual e planejamento mensal', 'Folhas de notas, metas e hábitos', 'Ficha de clientes e histórico de atendimentos',
  'Controle de serviços, valores e pagamentos', 'Guia de encadernação passo a passo',
];

// Reduz fotos grandes de celular antes de enviar (mais rápido e dentro do limite do servidor)
async function reduzir(arquivo) {
  try {
    const img = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    const escala = Math.min(1, 2400 / Math.max(img.width, img.height));
    if (escala === 1 && arquivo.size < 3e6) return arquivo;
    const tela = document.createElement('canvas');
    tela.width = Math.round(img.width * escala);
    tela.height = Math.round(img.height * escala);
    tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);
    return await new Promise(ok => tela.toBlob(b => ok(b || arquivo), 'image/jpeg', 0.9));
  } catch { return arquivo; }
}

export function montar(el, { definirTitulo, ir, modo, id }) {
  const origem = id ? estado.produtos.find(p => p.id === id) : null;
  definirTitulo(modo === 'editar' ? 'Editar produto' : modo === 'duplicar' ? 'Duplicar produto' : 'Novo produto', { voltar: '#/produtos' });
  if (id && !origem) {
    el.innerHTML = `<div class="vazio largo">${icone('alerta', 36)}<p>Não encontrei esse produto. Ele pode ter sido excluído.</p><a class="botao prim" href="#/produtos">Voltar para a lista</a></div>`;
    return;
  }

  // ── Dados do formulário ──
  const f = origem ? {
    id: modo === 'editar' ? origem.id : undefined,
    titulo: modo === 'duplicar' ? `${origem.titulo} (cópia)` : origem.titulo,
    categoria: origem.categoria, subcategoria: origem.subcategoria ?? '',
    preco: paraCampo(origem.preco), precoOriginal: paraCampo(origem.precoOriginal), paginas: origem.paginas, descricao: origem.descricao,
    incluso: [...origem.incluso], tags: [...origem.tags], destaque: origem.destaque, ativo: origem.ativo,
    fotos: origem.imagens.map(i => ({ arquivo: i.src })),
    // Na cópia, os PDFs precisam ser enviados novamente.
    pdfs: modo === 'editar' ? (origem.pdfs ?? (origem.pdf ? [origem.pdf] : [])).map(p => ({ ...p })) : [],
    pdfMudou: false, pdfProgresso: null,
  } : {
    id: undefined, titulo: '', categoria: '', subcategoria: '', preco: '', precoOriginal: '', paginas: 1, descricao: '',
    incluso: [...INCLUSO_PADRAO], tags: [], destaque: false, ativo: true, fotos: [],
    pdfs: [], pdfMudou: false, pdfProgresso: null,
  };
  formulario.sujo = modo === 'duplicar'; // uma cópia já "tem mudanças" (o título mudou)

  const $ = s => el.querySelector(s);
  const todasAsTags = () => {
    const contagem = {};
    estado.produtos.forEach(p => p.tags.forEach(t => { contagem[t] = (contagem[t] ?? 0) + 1; }));
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  };

  el.innerHTML = `
  <form id="f" class="form-prod" novalidate autocomplete="off">
    <div class="form-col">
      ${modo === 'duplicar' ? `<div class="dica-caixa">${icone('copiar', 20)}<p>Esta é uma <b>cópia</b> de "${esc(origem.titulo)}". Troque o que for diferente (fotos, nome, preço) e salve.</p></div>` : ''}

      <section class="bloco">
        <div class="bloco-topo"><h2><span class="num">1</span> Fotos</h2><small id="fotos-cont"></small></div>
        <p class="ajuda">A primeira foto é a <b>capa</b>. Arraste as fotos para mudar a ordem. Fotos na vertical ficam melhores.</p>
        <ul class="fotos-grid" id="fotos"></ul>
        <label class="dropzone" id="dz" tabindex="0">
          <input type="file" id="arquivo-foto" accept="image/*" multiple hidden>
          ${icone('enviar', 28)}<b>Toque para escolher as fotos</b><span>ou arraste para cá · JPG, PNG ou WebP · até 8 fotos</span>
        </label>
        <p class="erro-campo" data-erro="fotos" hidden></p>
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2><span class="num">2</span> Arquivos PDF <small>(o que o cliente recebe)</small></h2><small id="pdf-cont"></small></div>
        <p class="ajuda">Adicione os arquivos que a pessoa baixa <b>depois de pagar</b>. Você pode selecionar vários de uma vez ou adicionar mais depois.</p>
        <div id="pdf-area" aria-live="polite"></div>
        <label class="dropzone dropzone--pdf" id="dz-pdf" tabindex="0">
          <input type="file" id="arquivo-pdf" accept="application/pdf,.pdf" multiple hidden>
          ${icone('file', 28)}<b id="pdf-rotulo">Toque para escolher os PDFs</b><span>ou arraste para cá · até 1.000 PDFs · 80 MB por arquivo</span>
        </label>
        <p class="erro-campo" data-erro="pdf" hidden></p>
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2><span class="num">3</span> Informações</h2></div>
        <label for="titulo">Nome do produto <i>*</i></label>
        <input id="titulo" type="text" maxlength="200" value="${esc(f.titulo)}" placeholder="Ex.: Agenda Maria – Nutricionista">
        <p class="erro-campo" data-erro="titulo" hidden></p>

        <div class="duas">
          <div>
            <label for="categoria">Categoria <i>*</i></label>
            <div class="com-botao"><select id="categoria"></select><button type="button" class="botao sec peq" data-acao="nova-categoria" title="Criar uma nova categoria">${icone('mais', 16)} Nova</button></div>
            <p class="erro-campo" data-erro="categoria" hidden></p>
          </div>
          <div>
            <label for="sub">Nicho <small>(opcional)</small></label>
            <div class="com-botao"><select id="sub"></select><button type="button" class="botao sec peq" data-acao="novo-nicho" title="Criar um novo nicho dentro da categoria">${icone('mais', 16)} Novo</button></div>
          </div>
        </div>
        <p class="ajuda">A <b>categoria</b> organiza o catálogo (ex.: Agendamento). O <b>nicho</b> é um grupo dentro dela (ex.: Unhas). Não achou? Use o botão <b>Nova/Novo</b>.</p>
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2><span class="num">4</span> Preço</h2></div>
        <div class="duas">
          <div><label for="preco">Preço <i>*</i></label><div class="dinheiro"><span>R$</span><input id="preco" type="text" inputmode="decimal" value="${esc(f.preco)}" placeholder="29,90"></div><p class="erro-campo" data-erro="preco" hidden></p></div>
          <div><label for="preco-original">Preço de antes <small>(opcional)</small></label><div class="dinheiro"><span>R$</span><input id="preco-original" type="text" inputmode="decimal" value="${esc(f.precoOriginal)}" placeholder="39,90"></div><p class="erro-campo" data-erro="precoOriginal" hidden></p></div>
        </div>
        <p class="ajuda" id="preco-info"></p>
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2><span class="num">5</span> Descrição</h2><small id="desc-cont"></small></div>
        <textarea id="descricao" rows="5" maxlength="5000" placeholder="Conte o que é o produto, para quem serve e o que ele tem de especial.">${esc(f.descricao)}</textarea>
        <p class="erro-campo" data-erro="descricao" hidden></p>
        <label for="paginas">Número de páginas do arquivo</label>
        <input id="paginas" type="number" min="1" max="5000" value="${f.paginas}" class="curto">
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2><span class="num">6</span> O que está incluso</h2></div>
        <p class="ajuda">Cada linha vira um item da lista na página do produto.</p>
        <ul class="lista-inc" id="incluso"></ul>
        <button type="button" class="botao sec peq" data-acao="add-incluso">${icone('mais', 16)} Adicionar item</button>
        <div class="sugestoes" id="sug-incluso"></div>
      </section>

      <section class="bloco">
        <div class="bloco-topo"><h2><span class="num">7</span> Palavras-chave</h2></div>
        <p class="ajuda">Ajudam a pessoa a encontrar o produto na busca. Digite e aperte <b>Enter</b> (ou vírgula).</p>
        <div class="chips-caixa" id="chips-caixa"><span id="chips"></span><input id="tag-novo" type="text" maxlength="60" placeholder="Ex.: unhas, preta e dourada" aria-label="Adicionar palavra-chave"></div>
        <div class="sugestoes" id="sug-tags"></div>
      </section>
    </div>

    <aside class="form-lado">
      <div class="bloco lado-fixo">
        <h2>Prévia no site</h2>
        <div id="previa"></div>
        <label class="linha-chave"><span><b>Mostrar no site</b><small>Desligue para guardar como rascunho.</small></span><input type="checkbox" role="switch" id="ativo"${f.ativo ? ' checked' : ''}></label>
        <label class="linha-chave"><span><b>Destacar</b><small>Aparece nos primeiros lugares.</small></span><input type="checkbox" role="switch" id="destaque"${f.destaque ? ' checked' : ''}></label>
        <div class="lado-botoes"><button type="submit" class="botao prim largo" data-salvar>${icone('ok', 18)} Salvar produto</button><button type="button" class="botao sec largo" data-acao="cancelar">Cancelar</button></div>
      </div>
    </aside>

    <div class="barra-fixa"><button type="button" class="botao sec" data-acao="cancelar">Cancelar</button><button type="submit" class="botao prim" data-salvar>${icone('ok', 18)} Salvar produto</button></div>
  </form>`;

  // ── Pedaços que se redesenham ──
  function desenharCategorias() {
    const cats = estado.categorias;
    const extra = f.categoria && !cats.some(c => c.nome === f.categoria) ? `<option value="${esc(f.categoria)}" selected>${esc(f.categoria)}</option>` : '';
    $('#categoria').innerHTML = `<option value="">Escolha…</option>${cats.map(c => `<option value="${esc(c.nome)}"${c.nome === f.categoria ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}${extra}`;
    const subs = cats.find(c => c.nome === f.categoria)?.subs ?? [];
    const extraSub = f.subcategoria && !subs.some(s => s.nome === f.subcategoria) ? `<option value="${esc(f.subcategoria)}" selected>${esc(f.subcategoria)}</option>` : '';
    $('#sub').innerHTML = `<option value="">${f.categoria ? 'Nenhum' : 'Escolha a categoria primeiro'}</option>${subs.map(s => `<option value="${esc(s.nome)}"${s.nome === f.subcategoria ? ' selected' : ''}>${esc(s.nome)}</option>`).join('')}${extraSub}`;
    $('#sub').disabled = !f.categoria;
  }

  function desenharFotos() {
    const prontas = f.fotos.filter(x => !x.pendente).length;
    $('#fotos-cont').textContent = `${prontas} de 8`;
    $('#fotos').innerHTML = f.fotos.map((x, i) => x.pendente
      ? `<li class="foto carregando" aria-busy="true"><div class="giro"></div><small>${esc(x.nome)}</small></li>`
      : `<li class="foto" draggable="true" data-i="${i}">${i === 0 ? '<span class="capa">Capa</span>' : ''}<img src="${enderecoFoto(x.arquivo)}" alt="Foto ${i + 1}" draggable="false">
          <div class="ctl">
            ${i > 0 ? `<button type="button" data-foto="capa" data-i="${i}" title="Tornar capa" aria-label="Tornar a foto ${i + 1} a capa">${icone('estrela', 16)}</button>` : '<span></span>'}
            <button type="button" class="x" data-foto="del" data-i="${i}" title="Remover" aria-label="Remover a foto ${i + 1}">${icone('x', 16)}</button>
          </div></li>`).join('');
    $('#dz').hidden = prontas >= 8;
    atualizarPrevia();
  }

  function desenharIncluso() {
    $('#incluso').innerHTML = f.incluso.map((t, i) => `<li><input type="text" value="${esc(t)}" data-inc="${i}" maxlength="255" aria-label="Item ${i + 1}"><button type="button" data-inc-del="${i}" aria-label="Remover o item ${i + 1}">${icone('x', 16)}</button></li>`).join('');
    const livres = SUGESTOES_INCLUSO.filter(s => !f.incluso.includes(s)).slice(0, 5);
    $('#sug-incluso').innerHTML = livres.length ? `<span>Sugestões:</span>${livres.map(s => `<button type="button" class="chip-sug" data-sug-inc="${esc(s)}">+ ${esc(s)}</button>`).join('')}` : '';
  }

  function desenharTags() {
    $('#chips').innerHTML = f.tags.map((t, i) => `<span class="chip">${esc(t)}<button type="button" data-tag-del="${i}" aria-label="Remover ${esc(t)}">${icone('x', 14)}</button></span>`).join('');
    const livres = todasAsTags().filter(t => !f.tags.includes(t)).slice(0, 8);
    $('#sug-tags').innerHTML = livres.length ? `<span>Usadas em outros produtos:</span>${livres.map(t => `<button type="button" class="chip-sug" data-sug-tag="${esc(t)}">+ ${esc(t)}</button>`).join('')}` : '';
  }

  function atualizarPreco() {
    const p = numero(f.preco), o = f.precoOriginal.trim() ? numero(f.precoOriginal) : null;
    const info = $('#preco-info');
    if (p && o && o > p) info.innerHTML = `<span class="selo-ok">${Math.round((1 - p / o) * 100)}% de desconto</span> No site aparece o preço de antes riscado e o selo de desconto.`;
    else if (p && o && o <= p) info.innerHTML = `<span class="aviso-inline">O preço de antes precisa ser <b>maior</b> que o preço. Se não há promoção, deixe vazio.</span>`;
    else info.innerHTML = p ? `Parcelamento mostrado no site: <b>em 3x de ${reais(p / 3)} sem juros</b>.` : 'Escreva o preço do produto (ex.: 29,90).';
    atualizarPrevia();
  }

  function atualizarPrevia() {
    const p = numero(f.preco), o = f.precoOriginal.trim() ? numero(f.precoOriginal) : null;
    const foto = f.fotos.find(x => !x.pendente);
    const off = p && o && o > p ? Math.round((1 - p / o) * 100) : 0;
    $('#previa').innerHTML = `<div class="previa-card">
      <div class="previa-img">${foto ? `<img src="${enderecoFoto(foto.arquivo)}" alt="">` : `<div class="sem-foto">${icone('imagem', 32)}<span>Sem foto</span></div>`}${off ? `<span class="previa-off">${off}% OFF</span>` : ''}</div>
      <div class="previa-corpo"><b>${esc(f.titulo.trim() || 'Nome do produto')}</b><span class="selo-novo">Novo</span>
        ${o && o > p ? `<s>${reais(o)}</s>` : ''}<strong>${p ? reais(p) : 'R$ 0,00'}</strong><span class="previa-dl">⚡ Download imediato</span></div></div>`;
  }

  desenharCategorias(); desenharFotos(); desenharPdf(); desenharIncluso(); desenharTags(); atualizarPreco();
  $('#desc-cont').textContent = `${f.descricao.length} / 5000`;

  // ── PDF: desenho e envio ──
  function desenharPdf() {
    const area = $('#pdf-area');
    const enviando = f.pdfProgresso !== null;
    $('#pdf-cont').textContent = `${f.pdfs.length} de 1.000`;
    area.innerHTML = f.pdfs.map((pdf, i) => `<div class="pdf-card"><span class="pdf-ic">${icone('file', 24)}</span><div><b>${esc(pdf.nome)}</b><small>${tamanho(pdf.bytes)}${pdf.id ? ' · já cadastrado' : ' · pronto, salve o produto para guardar'}</small></div>
      <button type="button" class="ib perigo" data-acao="remover-pdf" data-pdf="${i}" aria-label="Remover ${esc(pdf.nome)}" title="Remover PDF"${enviando ? ' disabled' : ''}>${icone('lixo', 18)}</button></div>`).join('');
    if (enviando) {
      area.innerHTML += `<div class="pdf-card pdf-card--env" aria-busy="true"><span class="pdf-ic">${icone('file', 24)}</span><div><b>Enviando ${esc(f.pdfEnviando)}…</b><div class="barra-prog"><span style="width:${f.pdfProgresso}%"></span></div><small>${f.pdfProgresso}%</small></div></div>`;
    }
    $('#dz-pdf').hidden = enviando || f.pdfs.length >= 30;
    $('#pdf-rotulo').textContent = f.pdfs.length ? 'Adicionar mais PDFs' : 'Toque para escolher os PDFs';
  }
  async function enviarPdfs(arquivos) {
    if (f.pdfProgresso !== null) return toast('Espere os PDFs terminarem de enviar.', 'erro');
    const fila = arquivos.slice(0, Math.max(0, LIMITE_PDFS - f.pdfs.length));
    if (fila.length < arquivos.length) toast('O limite é de 1.000 PDFs por produto.', 'erro');
    if (!fila.length) return;
    f.pdfProgresso = 0; f.pdfEnviando = `0 de ${fila.length} PDFs`; desenharPdf();
    try {
      for (const [indice, arq] of fila.entries()) {
        if (!/\.pdf$/i.test(arq.name) && arq.type !== 'application/pdf') { toast(`"${arq.name}" não é um PDF.`, 'erro'); continue; }
        if (arq.size > 80 * 1024 * 1024) { toast(`"${arq.name}" é grande demais (máximo de 80 MB).`, 'erro'); continue; }
        f.pdfEnviando = `${indice + 1} de ${fila.length}: ${arq.name}`;
        const status = el.querySelector('.pdf-card--env b'); if (status) status.textContent = `Enviando ${f.pdfEnviando}…`;
        f.pdfProgresso = 0;
        try {
          const form = new FormData();
          form.append('pdf', arq, arq.name);
          const r = await enviarComProgresso('upload-pdf.php', form, p => { f.pdfProgresso = p; const barra = el.querySelector('.barra-prog span'); if (barra) barra.style.width = p + '%'; const t = el.querySelector('.pdf-card--env small'); if (t) t.textContent = p + '%'; });
          f.pdfs.push({ arquivo: r.arquivo, nome: r.nome, bytes: r.bytes });
          f.pdfMudou = true; formulario.sujo = true; limparErro('pdf');
        } catch (e) {
          if (e.status === 401) return ir('#/entrar');
          toast(`${arq.name}: ${e.message}`, 'erro');
        }
      }
    } finally { f.pdfProgresso = null; desenharPdf(); }
  }

  // ── Fotos: envio ──
  async function enviarFotos(arquivos) {
    for (const arq of arquivos) {
      if (f.fotos.filter(x => !x.pendente).length + f.fotos.filter(x => x.pendente).length >= 8) { toast('O limite é de 8 fotos por produto.', 'erro'); break; }
      if (!arq.type.startsWith('image/')) { toast(`"${arq.name}" não é uma foto.`, 'erro'); continue; }
      const marcador = { pendente: true, nome: arq.name };
      f.fotos.push(marcador); desenharFotos();
      try {
        const form = new FormData();
        form.append('foto', await reduzir(arq), 'foto.jpg');
        const r = await api('upload.php', { metodo: 'POST', form });
        f.fotos[f.fotos.indexOf(marcador)] = { arquivo: r.arquivo };
        formulario.sujo = true;
        limparErro('fotos');
      } catch (e) {
        f.fotos.splice(f.fotos.indexOf(marcador), 1);
        if (e.status === 401) return ir('#/entrar');
        toast(`${arq.name}: ${e.message}`, 'erro');
      }
      desenharFotos();
    }
  }

  // ── Validação ──
  const CAMPOS = { fotos: '#dz', pdf: '#dz-pdf', titulo: '#titulo', categoria: '#categoria', preco: '#preco', precoOriginal: '#preco-original', descricao: '#descricao' };
  // Some com o aviso de UM campo assim que a pessoa corrige esse campo
  function limparErro(campo) {
    const caixa = el.querySelector(`[data-erro="${campo}"]`);
    if (caixa) caixa.hidden = true;
    el.querySelector(CAMPOS[campo])?.classList.remove('invalido');
  }
  function mostrarErros(erros) {
    el.querySelectorAll('[data-erro]').forEach(p => { p.hidden = true; });
    el.querySelectorAll('.invalido').forEach(c => c.classList.remove('invalido'));
    let primeiro = null;
    for (const [campo, msg] of Object.entries(erros)) {
      const caixa = el.querySelector(`[data-erro="${campo}"]`);
      if (caixa) { caixa.textContent = msg; caixa.hidden = false; }
      const input = el.querySelector(CAMPOS[campo]);
      input?.classList.add('invalido');
      primeiro ??= input;
    }
    primeiro?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    primeiro?.focus?.({ preventScroll: true });
  }
  function validar() {
    const e = {};
    if (!f.fotos.some(x => !x.pendente)) e.fotos = 'Envie pelo menos uma foto do produto.';
    if (f.pdfProgresso !== null) e.pdf = 'Espere o PDF terminar de enviar.';
    else if (!f.pdfs.length && f.ativo) e.pdf = 'Envie pelo menos um PDF do produto. (Sem PDF ainda? Desligue "Mostrar no site" e salve como rascunho.)';
    if (!f.titulo.trim()) e.titulo = 'Escreva o nome do produto.';
    if (!f.categoria) e.categoria = 'Escolha a categoria (ou crie uma nova).';
    const p = numero(f.preco);
    if (!p || p <= 0) e.preco = 'Informe o preço. Ex.: 29,90';
    if (f.precoOriginal.trim()) { const o = numero(f.precoOriginal); if (!o || (p && o <= p)) e.precoOriginal = 'Precisa ser maior que o preço (ou deixe vazio).'; }
    if (!f.descricao.trim()) e.descricao = 'Escreva uma descrição para o produto.';
    return e;
  }

  async function salvar(botoes) {
    if (f.fotos.some(x => x.pendente)) return toast('Espere as fotos terminarem de enviar.', 'erro');
    const erros = validar();
    if (Object.keys(erros).length) { toast('Falta preencher alguns campos.', 'erro'); return mostrarErros(erros); }
    mostrarErros({});
    const titulo = f.titulo.trim();
    const corpo = {
      id: f.id, titulo, categoria: f.categoria, subcategoria: f.subcategoria, preco: numero(f.preco),
      precoOriginal: f.precoOriginal.trim() ? numero(f.precoOriginal) : '', paginas: Number(f.paginas) || 1, descricao: f.descricao.trim(),
      incluso: f.incluso.map(t => t.trim()).filter(Boolean), tags: f.tags, destaque: f.destaque, ativo: f.ativo,
      imagens: f.fotos.map((x, i) => ({ arquivo: x.arquivo, alt: i === 0 ? `Capa de ${titulo}` : `${titulo} (foto ${i + 1})` })),
    };
    // PDF: só vai na requisição se mudou (senão o servidor mantém o que já está lá)
    if (f.pdfMudou) corpo.pdfs = f.pdfs.map(p => p.id ? { id: p.id } : { arquivo: p.arquivo, nome: p.nome });
    botoes.forEach(b => { b.disabled = true; });
    try {
      await api('salvar.php', { metodo: 'POST', corpo });
      formulario.sujo = false;
      await carregarTudo();
      toast('Produto salvo! Em até 1 minuto ele aparece no site.');
      ir('#/produtos');
    } catch (e) {
      botoes.forEach(b => { b.disabled = false; });
      if (e.status === 401) return ir('#/entrar');
      toast(e.message, 'erro');
    }
  }

  // ── Eventos (atribuídos ao container: cada tela nova substitui os anteriores) ──
  el.onsubmit = e => { e.preventDefault(); salvar([...el.querySelectorAll('[data-salvar]')]); };

  el.oninput = e => {
    const t = e.target;
    formulario.sujo = true;
    if (t.id === 'titulo') { f.titulo = t.value; limparErro('titulo'); atualizarPrevia(); }
    else if (t.id === 'preco') { f.preco = t.value; limparErro('preco'); atualizarPreco(); }
    else if (t.id === 'preco-original') { f.precoOriginal = t.value; limparErro('precoOriginal'); atualizarPreco(); }
    else if (t.id === 'descricao') { f.descricao = t.value; limparErro('descricao'); $('#desc-cont').textContent = `${t.value.length} / 5000`; }
    else if (t.id === 'paginas') f.paginas = t.value;
    else if (t.dataset.inc !== undefined) f.incluso[Number(t.dataset.inc)] = t.value;
  };

  el.onchange = e => {
    const t = e.target;
    formulario.sujo = true;
    if (t.id === 'categoria') { f.categoria = t.value; f.subcategoria = ''; desenharCategorias(); limparErro('categoria'); }
    else if (t.id === 'sub') f.subcategoria = t.value;
    else if (t.id === 'ativo') f.ativo = t.checked;
    else if (t.id === 'destaque') f.destaque = t.checked;
    else if (t.id === 'arquivo-foto') { enviarFotos([...t.files]); t.value = ''; }
    else if (t.id === 'arquivo-pdf') { if (t.files.length) enviarPdfs([...t.files]); t.value = ''; }
    else if (t.id === 'preco' || t.id === 'preco-original') { // ao sair do campo, arruma: "39,9" vira "39,90"
      const n = numero(t.value);
      if (n != null && n >= 0) t.value = paraCampo(n);
      if (t.id === 'preco') { f.preco = t.value; limparErro('preco'); } else { f.precoOriginal = t.value; limparErro('precoOriginal'); }
      atualizarPreco();
    }
  };

  el.onkeydown = e => {
    const t = e.target;
    if (e.key === 'Enter' && t.matches('input[type=text]')) e.preventDefault(); // Enter não salva sem querer
    if (t.id === 'tag-novo' && (e.key === 'Enter' || e.key === ',')) { e.preventDefault(); adicionarTag(t.value); t.value = ''; }
    if (t.id === 'tag-novo' && e.key === 'Backspace' && !t.value && f.tags.length) { f.tags.pop(); desenharTags(); }
    if (t.id === 'dz' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('#arquivo-foto').click(); }
    if (t.id === 'dz-pdf' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('#arquivo-pdf').click(); }
  };
  el.onfocusout = e => { if (e.target.id === 'tag-novo' && e.target.value.trim()) { adicionarTag(e.target.value); e.target.value = ''; } };

  function adicionarTag(texto) {
    const t = texto.replace(/,/g, '').trim();
    if (!t || f.tags.some(x => x.toLowerCase() === t.toLowerCase()) || f.tags.length >= 15) return;
    f.tags.push(t); formulario.sujo = true; desenharTags();
  }

  el.onclick = async e => {
    const foto = e.target.closest('[data-foto]');
    if (foto) {
      const i = Number(foto.dataset.i);
      if (foto.dataset.foto === 'del') f.fotos.splice(i, 1);
      if (foto.dataset.foto === 'capa') f.fotos.unshift(f.fotos.splice(i, 1)[0]);
      formulario.sujo = true;
      return desenharFotos();
    }
    if (e.target.closest('[data-tag-del]')) { f.tags.splice(Number(e.target.closest('[data-tag-del]').dataset.tagDel), 1); formulario.sujo = true; return desenharTags(); }
    if (e.target.closest('[data-sug-tag]')) return adicionarTag(e.target.closest('[data-sug-tag]').dataset.sugTag);
    if (e.target.closest('[data-inc-del]')) { f.incluso.splice(Number(e.target.closest('[data-inc-del]').dataset.incDel), 1); formulario.sujo = true; return desenharIncluso(); }
    if (e.target.closest('[data-sug-inc]')) { f.incluso.push(e.target.closest('[data-sug-inc]').dataset.sugInc); formulario.sujo = true; return desenharIncluso(); }
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (acao === 'remover-pdf' && f.pdfProgresso === null) { f.pdfs.splice(Number(e.target.closest('[data-pdf]').dataset.pdf), 1); f.pdfMudou = true; formulario.sujo = true; return desenharPdf(); }
    if (acao === 'add-incluso') { f.incluso.push(''); desenharIncluso(); return $('#incluso li:last-child input').focus(); }
    if (acao === 'cancelar') {
      if (formulario.sujo && !(await confirmar({ titulo: 'Sair sem salvar?', texto: 'O que você preencheu neste produto será perdido.', botao: 'Sair sem salvar', perigo: true }))) return;
      formulario.sujo = false;
      return ir('#/produtos');
    }
    try {
      if (acao === 'nova-categoria') {
        const nome = await perguntar({ titulo: 'Nova categoria', texto: 'As categorias organizam o catálogo do site.', rotulo: 'Nome da categoria', exemplo: 'Ex.: Casamento', botao: 'Criar categoria' });
        if (!nome) return;
        const r = await api('categoria-salvar.php', { metodo: 'POST', corpo: { tipo: 'categoria', nome } });
        estado.categorias = r.categorias;
        f.categoria = r.categorias.find(c => c.id === r.id).nome; f.subcategoria = '';
        formulario.sujo = true; desenharCategorias(); limparErro('categoria'); toast(`Categoria "${f.categoria}" criada.`);
      }
      if (acao === 'novo-nicho') {
        const cat = estado.categorias.find(c => c.nome === f.categoria);
        if (!cat) return toast('Escolha a categoria primeiro.', 'erro');
        const nome = await perguntar({ titulo: `Novo nicho em "${cat.nome}"`, texto: 'O nicho é um grupo dentro da categoria.', rotulo: 'Nome do nicho', exemplo: 'Ex.: Noivas', botao: 'Criar nicho' });
        if (!nome) return;
        const r = await api('categoria-salvar.php', { metodo: 'POST', corpo: { tipo: 'sub', categoriaId: cat.id, nome } });
        estado.categorias = r.categorias;
        f.subcategoria = r.categorias.find(c => c.id === cat.id).subs.find(s => s.id === r.id).nome;
        formulario.sujo = true; desenharCategorias(); toast(`Nicho "${f.subcategoria}" criado.`);
      }
    } catch (erro) {
      if (erro.status === 401) return ir('#/entrar');
      toast(erro.message, 'erro');
    }
  };

  // ── Arrastar e soltar: reordenar fotos e soltar arquivos na área de envio ──
  let arrastando = null;
  el.ondragstart = e => { const li = e.target.closest?.('.foto[data-i]'); if (li) { arrastando = Number(li.dataset.i); e.dataTransfer.effectAllowed = 'move'; li.classList.add('arrastando'); } };
  el.ondragend = () => { arrastando = null; el.querySelectorAll('.arrastando, .alvo').forEach(x => x.classList.remove('arrastando', 'alvo')); };
  el.ondragover = e => {
    if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); const noPdf = !!e.target.closest?.('#dz-pdf'); $('#dz').classList.toggle('sobre', !noPdf); $('#dz-pdf').classList.toggle('sobre', noPdf); return; }
    const li = e.target.closest?.('.foto[data-i]');
    if (li && arrastando != null) { e.preventDefault(); el.querySelectorAll('.alvo').forEach(x => x.classList.remove('alvo')); li.classList.add('alvo'); }
  };
  el.ondragleave = e => { if (e.target.id === 'dz') $('#dz').classList.remove('sobre'); if (e.target.id === 'dz-pdf') $('#dz-pdf').classList.remove('sobre'); };
  el.ondrop = e => {
    $('#dz').classList.remove('sobre'); $('#dz-pdf').classList.remove('sobre');
    if (e.dataTransfer.files?.length) {
      e.preventDefault();
      // Solto na área do PDF = PDF; em qualquer outro lugar = fotos
      return e.target.closest?.('#dz-pdf') ? enviarPdfs([...e.dataTransfer.files]) : enviarFotos([...e.dataTransfer.files]);
    }
    const li = e.target.closest?.('.foto[data-i]');
    if (li && arrastando != null) {
      e.preventDefault();
      const para = Number(li.dataset.i);
      if (para !== arrastando) { f.fotos.splice(para, 0, f.fotos.splice(arrastando, 1)[0]); formulario.sujo = true; desenharFotos(); }
      arrastando = null;
    }
  };
}
