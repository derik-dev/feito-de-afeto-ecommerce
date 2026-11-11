// ─────────────────────────────────────────────────────────────────────────────
// DADOS MOCK DOS PRODUTOS
// Este é o único lugar com dados "de mentira". As telas NÃO importam este arquivo
// diretamente: elas usam src/services/produtos.js. Para migrar para o Supabase,
// troque só o service (veja o comentário lá) — os componentes não mudam.
// ─────────────────────────────────────────────────────────────────────────────
import { gerarImagens } from './placeholders.js';

/**
 * @typedef {Object} Produto
 * @property {string} id
 * @property {string} slug            usado na URL: /produto/?slug=agenda-2027-floral
 * @property {string} titulo
 * @property {string} categoria       uma das CATEGORIAS abaixo
 * @property {string} [subcategoria]  só em categorias que têm subcategorias (ex.: Religiosas > Católicas)
 * @property {number} preco
 * @property {number} [precoOriginal] se existir e for maior que `preco`, mostra desconto
 * @property {number} nota            de 1 a 5
 * @property {number} numAvaliacoes
 * @property {number} vendidos
 * @property {'PDF'} formato
 * @property {number} paginas
 * @property {string[]} tags
 * @property {{src:string, alt:string}[]} imagens
 * @property {number} [prioridade]   maior = aparece antes em "Mais relevantes" e nas prateleiras (padrão 0)
 * @property {boolean} destaque
 * @property {string} descricao
 * @property {string[]} incluso       lista "O que está incluso"
 */

// Ordem em que as categorias aparecem nos filtros do catálogo.
export const CATEGORIAS = ['Agendas', 'Agendamento', 'Religiosas', 'Jardim Encantado', 'Planners', 'Cadernos', 'Capas', 'Kits'];

// Subcategorias de cada categoria. Para criar outra (ex.: "Espíritas"), basta incluí-la aqui
// e usar o mesmo nome no campo `subcategoria` dos produtos.
export const SUBCATEGORIAS = {
  Agendamento: ['Unhas', 'Cílios e Lash', 'Salão de Beleza', 'Saúde e Nutrição'],
  Religiosas: ['Católicas', 'Evangélicas'],
};

// Fotos reais ficam em public/images/agendas/. Ajuda a montar o campo `imagens` de um produto.
// (BASE_URL é "/" no site normal; o "?." deixa este arquivo funcionar também fora do Vite.)
const BASE = import.meta.env?.BASE_URL ?? '/';
const foto = (arquivo, alt) => [{ src: `${BASE}images/agendas/${arquivo}`, alt }];

// Itens padrão de cada categoria; um produto pode sobrescrever com o campo `incluso`.
const INCLUSO_PADRAO = {
  Agendas: ['Capa em alta resolução', 'Calendário anual e planejamento mensal', 'Páginas semanais e diárias', 'Folhas de notas, metas e hábitos', 'Guia rápido de impressão e encadernação'],
  Agendamento: ['Capa em alta resolução', 'Agenda de horários por dia e por semana', 'Ficha de clientes e histórico de atendimentos', 'Controle de serviços, valores e pagamentos', 'Guia rápido de impressão e encadernação'],
  Religiosas: ['Capa em alta resolução', 'Calendário anual com datas e tempos litúrgicos', 'Páginas semanais com espaço para oração e gratidão', 'Folhas de notas, metas e intenções', 'Guia rápido de impressão e encadernação'],
  'Jardim Encantado': ['Capa ilustrada em alta resolução', 'Calendário anual e planejamento mensal', 'Páginas semanais e diárias com detalhes florais', 'Folhas de notas, metas e hábitos', 'Guia rápido de impressão e encadernação'],
  Planners: ['Capa em alta resolução', 'Páginas de planejamento prontas para imprimir', 'Folhas de acompanhamento e metas', 'Guia rápido de impressão'],
  Cadernos: ['Capa em alta resolução', 'Miolo com pautas e áreas de anotação', 'Páginas de índice e planejamento', 'Guia rápido de impressão'],
  Capas: ['Arquivos de capa e contracapa em alta resolução', 'Versões para diferentes tamanhos de papel', 'Guia rápido de impressão'],
  Kits: ['Capa e contracapa', 'Miolo completo', 'Separadores, marcadores e etiquetas', 'Guia de encadernação passo a passo'],
};

// `hue` só serve para colorir a imagem de exemplo (é removido antes de montar o produto).
const base = [
  // ── Agendamento: agendas reais (fotos em public/images/agendas) ──
  // ATENÇÃO: preco, precoOriginal, nota, numAvaliacoes, vendidos e paginas abaixo são valores de exemplo. Ajuste os reais.
  { slug: 'agenda-manoela-leal-nutricionista', titulo: 'Agenda Manoela Leal – Nutricionista', categoria: 'Agendamento', subcategoria: 'Saúde e Nutrição', preco: 34.9, precoOriginal: 44.9, nota: 4.9, numAvaliacoes: 64, vendidos: 210, paginas: 160, destaque: true, prioridade: 1, tags: ['agendamento', 'nutricionista', 'saúde', '2027', 'verde e vinho'], descricao: 'Agenda de agendamentos 2027 para nutricionistas, com capa em verde e vinho com folhas e a frase "Equilíbrio para uma vida melhor". Horários, pacientes e retornos em um só lugar.', imagens: foto('agenda-manoela-leal-nutricionista.webp', 'Capa da agenda de agendamentos 2027 de Manoela Leal, nutricionista, em verde e vinho com folhas') },
  { slug: 'agenda-beatriz-nail-designer', titulo: 'Agenda Beatriz – Nail Designer', categoria: 'Agendamento', subcategoria: 'Unhas', preco: 29.9, nota: 4.8, numAvaliacoes: 52, vendidos: 180, paginas: 140, destaque: true, prioridade: 1, tags: ['agendamento', 'unhas', 'nail designer', 'preta e dourada'], descricao: 'Agenda de agendamentos para nail designers, com capa preta e dourada e monograma personalizado. Controle horários, serviços e clientes.', imagens: foto('agenda-beatriz-nail-designer.webp', 'Capa preta e dourada da agenda de Beatriz, nail designer') },
  { slug: 'agenda-cris-haulerich-unhas', titulo: 'Agenda Cris Haulerich – Unhas', categoria: 'Agendamento', subcategoria: 'Unhas', preco: 32.9, precoOriginal: 39.9, nota: 4.9, numAvaliacoes: 71, vendidos: 240, paginas: 150, destaque: true, prioridade: 1, tags: ['agendamento', 'unhas', '2026', '2027', 'floral', 'bege e dourado'], descricao: 'Agendamentos 2026/2027 para manicures e nail designers, em tons de bege e dourado com delicados detalhes florais.', imagens: foto('agenda-cris-haulerich-unhas.webp', 'Capa bege com flores douradas da agenda de agendamentos 2026/2027 de Cris Haulerich, unhas') },
  { slug: 'agenda-kayllaine-gabriele-lash-designer', titulo: 'Agenda Kayllaine Gabriele – Lash Designer', categoria: 'Agendamento', subcategoria: 'Cílios e Lash', preco: 29.9, nota: 4.8, numAvaliacoes: 47, vendidos: 150, paginas: 140, destaque: true, prioridade: 1, tags: ['agendamento', 'cílios', 'lash designer', 'studio de beleza', 'preta e dourada'], descricao: 'Agenda para lash designers e studios de beleza, com capa preta e dourada. Organize atendimentos, manutenções e retornos.', imagens: foto('agenda-kayllaine-gabriele-lash-designer.webp', 'Capa preta e dourada da agenda de Kayllaine Gabriele, lash designer') },
  { slug: 'agenda-fernanda-nogueira-salao-de-beleza', titulo: 'Agenda Fernanda Nogueira – Salão de Beleza', categoria: 'Agendamento', subcategoria: 'Salão de Beleza', preco: 34.9, nota: 4.9, numAvaliacoes: 58, vendidos: 195, paginas: 160, destaque: true, prioridade: 1, tags: ['agendamento', 'salão', 'cabelo', 'cabeleireira', 'preta e dourada'], descricao: 'Agenda de agendamentos para salões de beleza e cabeleireiras, com capa preta e dourada com tesoura, pente e secador.', imagens: foto('agenda-fernanda-nogueira-salao-de-beleza.webp', 'Capa preta e dourada da agenda do Salão de Beleza de Fernanda Nogueira') },
  // ── Jardim Encantado: agendas reais (fotos em public/images/agendas) ──
  // ATENÇÃO: preços, notas, vendas e páginas são valores de exemplo. Ajuste os reais.
  { slug: 'agenda-elaine-rosas-azuis', titulo: 'Agenda Elaine – Rosas Azuis', categoria: 'Jardim Encantado', preco: 42.9, precoOriginal: 52.9, nota: 4.9, numAvaliacoes: 83, vendidos: 260, paginas: 220, destaque: true, prioridade: 1, tags: ['2027', 'jardim', 'floral', 'rosas azuis', 'azul e dourado'], descricao: 'Agenda 2027 com rosas azuis e gipsófila em aquarela, detalhes dourados e nome personalizado na capa.', imagens: foto('agenda-elaine-rosas-azuis.webp', 'Capa da Agenda 2027 de Elaine, com rosas azuis, gipsófila e detalhes dourados') },
  { slug: 'agenda-claudia-hortensias-verdes', titulo: 'Agenda Cláudia – Hortênsias Verdes', categoria: 'Jardim Encantado', preco: 39.9, nota: 4.8, numAvaliacoes: 61, vendidos: 190, paginas: 220, destaque: true, prioridade: 1, tags: ['2027', 'jardim', 'floral', 'hortênsias', 'verde'], descricao: 'Agenda 2027 em tons de verde e creme, com hortênsias, folhagens e moldura dourada. Nome personalizado na capa.', imagens: foto('agenda-claudia-hortensias-verdes.webp', 'Capa da Agenda 2027 de Cláudia, com hortênsias verdes e folhagens em fundo creme') },
  { slug: 'agenda-ligia-maria-nutricionista', titulo: 'Agenda Lígia Maria – Nutricionista', categoria: 'Jardim Encantado', preco: 44.9, precoOriginal: 54.9, nota: 4.9, numAvaliacoes: 57, vendidos: 170, paginas: 220, destaque: true, prioridade: 1, tags: ['2027', 'jardim', 'floral', 'hortênsias', 'lilás', 'nutricionista'], descricao: 'Agenda 2027 para nutricionista, com hortênsias lilás e azuis, logo personalizada e acabamento dourado.', imagens: foto('agenda-ligia-maria-nutricionista.webp', 'Capa da Agenda 2027 de Lígia Maria, nutricionista, com hortênsias lilás e azuis') },
  { slug: 'agenda-patricia-rosas-e-margaridas', titulo: 'Agenda Patrícia – Rosas e Margaridas', categoria: 'Jardim Encantado', preco: 39.9, precoOriginal: 49.9, nota: 4.9, numAvaliacoes: 94, vendidos: 310, paginas: 220, destaque: true, prioridade: 1, tags: ['2027', 'jardim', 'floral', 'rosas', 'margaridas', 'borboletas'], descricao: 'Agenda 2027 com rosas, margaridas e borboletas em tons de rosa e dourado. Nome personalizado em letra caligráfica.', imagens: foto('agenda-patricia-rosas-e-margaridas.webp', 'Capa da Agenda 2027 de Patrícia, com rosas, margaridas e borboletas em rosa e dourado') },
  { slug: 'agenda-suzane-hortensias-lilas', titulo: 'Agenda Suzane – Hortênsias Lilás', categoria: 'Jardim Encantado', preco: 39.9, nota: 4.8, numAvaliacoes: 49, vendidos: 160, paginas: 220, destaque: true, prioridade: 1, tags: ['2027', 'jardim', 'floral', 'hortênsias', 'lilás'], descricao: 'Agenda 2027 com hortênsias lilás e azuis, moldura delicada e nome personalizado na capa.', imagens: foto('agenda-suzane-hortensias-lilas.webp', 'Capa da Agenda 2027 de Suzane, com hortênsias lilás e azuis') },
  // ── Religiosas / Católicas: agendas reais ──
  { slug: 'agenda-nossa-senhora-de-fatima-2027', titulo: 'Agenda Nossa Senhora de Fátima 2027', categoria: 'Religiosas', subcategoria: 'Católicas', preco: 39.9, precoOriginal: 49.9, nota: 4.9, numAvaliacoes: 112, vendidos: 420, paginas: 240, destaque: true, prioridade: 1, tags: ['2027', 'católica', 'nossa senhora', 'fátima'], descricao: 'Agenda católica 2027 com capa de Nossa Senhora de Fátima ao pôr do sol, entre rosas e o santuário.', imagens: foto('agenda-nossa-senhora-de-fatima-2027.webp', 'Capa da Agenda 2027 com Nossa Senhora de Fátima, rosas e o santuário ao pôr do sol') },
  { slug: 'agenda-nossa-senhora-aparecida-2027', titulo: 'Agenda Nossa Senhora Aparecida 2027', categoria: 'Religiosas', subcategoria: 'Católicas', preco: 39.9, nota: 4.9, numAvaliacoes: 135, vendidos: 520, paginas: 240, destaque: true, prioridade: 1, tags: ['2027', 'católica', 'nossa senhora', 'aparecida'], descricao: 'Agenda católica 2027 com capa de Nossa Senhora Aparecida, em azul e dourado.', imagens: foto('agenda-nossa-senhora-aparecida-2027.webp', 'Capa da Agenda 2027 com Nossa Senhora Aparecida, em azul e dourado') },
];

/** @type {Produto[]} */
export const PRODUTOS = base.map(({ hue, ...p }, i) => ({
  id: String(i + 1),
  formato: 'PDF',
  imagens: p.imagens ?? gerarImagens(p.titulo, hue), // fotos reais (campo `imagens`) têm prioridade sobre o placeholder
  incluso: INCLUSO_PADRAO[p.categoria],
  ...p,
}));
