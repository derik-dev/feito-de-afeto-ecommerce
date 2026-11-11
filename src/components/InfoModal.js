// Modais informativos da home (Como funciona, Sobre nós, Contato).
// O visual vem das classes .modal-* de src/style.css (as mesmas da home original).
import { icon } from '../lib/icons.js';
import { urlSite } from '../lib/format.js';

const irCatalogo = texto => `<a class="button button-primary" href="${urlSite('catalogo/')}">${texto} ${icon('arrow')}</a>`;

const CONTEUDOS = {
  how: () => `<p class="modal-eyebrow">DO DIGITAL AO FEITO À MÃO</p><h2 id="modal-title">Como funciona?</h2><p class="modal-intro">Criar algo especial pode ser simples. A gente cuida dos arquivos, você dá vida às ideias.</p><div class="how-steps"><div><span>01</span><div><h3>Escolha seu arquivo</h3><p>Encontre no catálogo o miolo, a capa ou a coleção ideal para o seu projeto.</p></div></div><div><span>02</span><div><h3>Receba seu PDF</h3><p>Após a confirmação da compra, o arquivo digital fica disponível para download.</p></div></div><div><span>03</span><div><h3>Imprima e crie</h3><p>Imprima, encaderne e transforme o arquivo em uma peça cheia de personalidade.</p></div></div></div>${irCatalogo('Encontrar meu arquivo')}`,
  about: () => `<p class="modal-eyebrow">CADA DETALHE TEM UM CARINHO</p><h2 id="modal-title">Prazer, Feito de Afeto. ♡</h2><p class="modal-intro">Acreditamos que o papel pode guardar planos, sonhos e um pouquinho de quem a gente é.</p><p>Criamos arquivos digitais para quem ama papelaria e transforma ideias em peças especiais. São miolos, capas, planners e coleções pensados para facilitar sua rotina e trazer mais beleza para o seu ateliê.</p><p>Do primeiro rascunho ao último detalhe, tudo é feito com cuidado — e muito afeto.</p>${irCatalogo('Conheça nossos arquivos')}`,
  contact: () => `<p class="modal-eyebrow">VAMOS CONVERSAR?</p><h2 id="modal-title">Seu carinho chega até aqui.</h2><p class="modal-intro">Tem uma dúvida sobre os arquivos ou sobre como começar? Prepare sua mensagem para o atendimento.</p><form class="contact-form"><label for="contact-name">Seu nome</label><input id="contact-name" name="name" placeholder="Como podemos te chamar?" required/><label for="contact-email">Seu e-mail</label><input type="email" id="contact-email" name="email" placeholder="voce@exemplo.com" required/><label for="contact-message">Sua mensagem</label><textarea id="contact-message" name="message" rows="4" placeholder="Conte como podemos ajudar..." required></textarea><p class="form-note">Esta é uma prévia do site. O canal de atendimento ainda será conectado.</p><button class="button button-primary" type="submit">Preparar mensagem ${icon('mail')}</button><p class="contact-result" role="status"></p></form>`,
};

let retorno = null; // elemento que tinha o foco antes de abrir (recebe o foco ao fechar)

export function abrirModal(tipo) {
  if (!CONTEUDOS[tipo]) return;
  let fundo = document.querySelector('.modal-backdrop');
  if (!fundo) {
    fundo = document.createElement('div');
    fundo.className = 'modal-backdrop';
    fundo.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><button type="button" class="modal-close icon-button" aria-label="Fechar">${icon('close')}</button><div class="modal-content"></div></section>`;
    document.body.append(fundo);
    fundo.addEventListener('click', e => { if (e.target === fundo || e.target.closest('.modal-close')) fecharModal(); });
    fundo.addEventListener('submit', e => {
      e.preventDefault();
      // Sem backend ainda: o rascunho fica salvo só neste navegador.
      try { localStorage.setItem('afeto-contact-draft', JSON.stringify(Object.fromEntries(new FormData(e.target)))); } catch { /* ignora */ }
      fundo.querySelector('.contact-result').textContent = 'Mensagem preparada e salva neste navegador. O envio será habilitado quando o atendimento for conectado.';
    });
    document.addEventListener('keydown', e => {
      if (fundo.hidden) return;
      if (e.key === 'Escape') fecharModal();
      if (e.key === 'Tab') { // mantém o foco dentro do modal
        const foco = [...fundo.querySelectorAll('button,a,input,textarea')].filter(x => !x.disabled);
        const primeiro = foco[0], ultimo = foco.at(-1);
        if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
      }
    });
  }
  if (fundo.hidden || !fundo.isConnected) retorno = document.activeElement;
  fundo.querySelector('.modal-content').innerHTML = CONTEUDOS[tipo]();
  fundo.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => (fundo.querySelector('input') || fundo.querySelector('.modal-close')).focus());
}

export function fecharModal() {
  const fundo = document.querySelector('.modal-backdrop');
  if (!fundo) return;
  fundo.hidden = true;
  document.body.classList.remove('modal-open');
  retorno?.focus();
}
