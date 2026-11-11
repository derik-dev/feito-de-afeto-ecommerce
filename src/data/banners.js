// ─────────────────────────────────────────────────────────────────────────────
// BANNERS DOS CATÁLOGOS
// Cada catálogo tem um espaço de banner no topo da página. Para colocar o seu:
//   1) salve a imagem em  public/banners/  (ex.: public/banners/religiosas.webp)
//   2) escreva o nome do arquivo no campo `imagem` abaixo (ex.: 'religiosas.webp')
//
// Tamanhos recomendados:
//   • imagem        → 1320 × 320 px  (computador)
//   • imagemMobile  → 750 × 420 px   (celular, opcional; sem ela usa a `imagem`)
// Use .webp ou .jpg com até ~200 KB. Deixe o texto importante na área central da imagem.
//
// Enquanto `imagem` estiver vazia, aparece um banner de papelaria com o `titulo` e o `texto`.
// `link` é opcional: se preencher, o banner inteiro vira um link (ex.: '/catalogo/?desconto=1').
//
// A chave é:
//   ''                       → catálogo geral (sem filtro de categoria)
//   'Religiosas'             → uma categoria
//   'Religiosas/Católicas'   → uma subcategoria (se não existir, usa o da categoria; depois o geral)
// ─────────────────────────────────────────────────────────────────────────────
export const BANNERS = {
  '': { imagem: '', imagemMobile: '', alt: 'Catálogo Feito de Afeto', titulo: 'Todo o catálogo', texto: 'Agendas, planners, cadernos, capas e kits em PDF para imprimir.', link: '' },
  Agendas: { imagem: '', imagemMobile: '', alt: 'Agendas 2027', titulo: 'Agendas 2027', texto: 'Planeje o ano inteiro com layouts lindos e prontos para imprimir.', link: '' },
  Agendamento: { imagem: '', imagemMobile: '', alt: 'Agendas de agendamento', titulo: 'Agendamento', texto: 'Horários e clientes sempre em ordem, do salão ao consultório.', link: '' },
  'Agendamento/Unhas': { imagem: '', imagemMobile: '', alt: 'Agendas para unhas', titulo: 'Agendas para unhas', texto: 'Para manicures e nail designers: horários e clientes em dia.', link: '' },
  'Agendamento/Cílios e Lash': { imagem: '', imagemMobile: '', alt: 'Agendas para cílios e lash', titulo: 'Agendas para cílios e lash', texto: 'Atendimentos, manutenções e retornos sempre organizados.', link: '' },
  'Agendamento/Salão de Beleza': { imagem: '', imagemMobile: '', alt: 'Agendas para salão de beleza', titulo: 'Agendas para salão de beleza', texto: 'Cabelo, estética e beleza com a agenda sempre cheia.', link: '' },
  'Agendamento/Saúde e Nutrição': { imagem: '', imagemMobile: '', alt: 'Agendas para saúde e nutrição', titulo: 'Agendas para saúde e nutrição', texto: 'Consultas, pacientes e retornos em um só lugar.', link: '' },
  Religiosas: { imagem: '', imagemMobile: '', alt: 'Agendas religiosas', titulo: 'Agendas religiosas', texto: 'Planejamento com espaço para oração, gratidão e fé.', link: '' },
  'Religiosas/Católicas': { imagem: '', imagemMobile: '', alt: 'Agendas católicas', titulo: 'Agendas católicas', texto: 'Calendário litúrgico e páginas para suas intenções.', link: '' },
  'Religiosas/Evangélicas': { imagem: '', imagemMobile: '', alt: 'Agendas evangélicas', titulo: 'Agendas evangélicas', texto: 'Versículo da semana, pedidos de oração e muito mais.', link: '' },
  'Jardim Encantado': { imagem: '', imagemMobile: '', alt: 'Coleção Jardim Encantado', titulo: 'Jardim Encantado', texto: 'Flores, borboletas e delicadeza em cada página.', link: '' },
  Planners: { imagem: '', imagemMobile: '', alt: 'Planners', titulo: 'Planners', texto: 'Finanças, metas, foco e rotina em um só lugar.', link: '' },
  Cadernos: { imagem: '', imagemMobile: '', alt: 'Cadernos', titulo: 'Cadernos', texto: 'Estudos, receitas e anotações com muito capricho.', link: '' },
  Capas: { imagem: '', imagemMobile: '', alt: 'Capas', titulo: 'Capas', texto: 'Capas e contracapas para combinar com qualquer miolo.', link: '' },
  Kits: { imagem: '', imagemMobile: '', alt: 'Kits e coleções', titulo: 'Kits e Coleções', texto: 'Capa, miolo e extras prontos para encadernar.', link: '' },
};

/** Escolhe o banner mais específico: subcategoria → categoria → geral. */
export function bannerDe(categoria = '', subcategoria = '') {
  return (subcategoria && BANNERS[`${categoria}/${subcategoria}`]) || (categoria && BANNERS[categoria]) || BANNERS[''];
}
