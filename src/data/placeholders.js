// Gera imagens SVG de exemplo (data URI) enquanto não existem as fotos reais dos produtos.
// Quando tiver as imagens, é só trocar `imagens` no produto por URLs (ex.: do Supabase Storage).

const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Quebra o título em até 3 linhas curtas para caber na capa.
function quebrar(titulo, max = 15) {
  const linhas = [];
  let atual = '';
  for (const palavra of titulo.split(' ')) {
    if ((atual + ' ' + palavra).trim().length > max && atual) { linhas.push(atual); atual = palavra; }
    else atual = (atual + ' ' + palavra).trim();
  }
  if (atual) linhas.push(atual);
  return linhas.slice(0, 3);
}

// variante: 0 capa · 1 página semanal · 2 página mensal · 3 detalhe/checklist
function svg(titulo, hue, variante) {
  const forte = `hsl(${hue} 60% 38%)`, medio = `hsl(${hue} 65% 80%)`, suave = `hsl(${hue} 45% 90%)`;
  const espiral = Array.from({ length: 14 }, (_, i) => `<circle cx="150" cy="${108 + i * 28}" r="6" fill="${forte}" opacity=".75"/>`).join('');
  let miolo = '';
  if (variante === 0) {
    miolo = `<rect x="170" y="90" width="300" height="420" rx="10" fill="${medio}"/>
      ${quebrar(titulo).map((l, i) => `<text x="320" y="${230 + i * 44}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="34" fill="${forte}">${esc(l)}</text>`).join('')}
      <path d="M320 400c-14-14-30-4-30 10 0 16 30 36 30 36s30-20 30-36c0-14-16-24-30-10Z" fill="${forte}" opacity=".7"/>`;
  } else if (variante === 1) {
    miolo = Array.from({ length: 7 }, (_, i) => `<rect x="180" y="${110 + i * 56}" width="64" height="14" rx="7" fill="${medio}"/><line x1="260" y1="${124 + i * 56}" x2="440" y2="${124 + i * 56}" stroke="${suave}" stroke-width="3"/><line x1="180" y1="${146 + i * 56}" x2="440" y2="${146 + i * 56}" stroke="${suave}" stroke-width="2"/>`).join('');
  } else if (variante === 2) {
    miolo = `<rect x="180" y="104" width="260" height="30" rx="8" fill="${medio}"/>` +
      Array.from({ length: 30 }, (_, i) => `<rect x="${180 + (i % 6) * 44}" y="${150 + Math.floor(i / 6) * 70}" width="40" height="64" rx="5" fill="${suave}"/>`).join('');
  } else {
    miolo = Array.from({ length: 7 }, (_, i) => `<circle cx="196" cy="${130 + i * 54}" r="12" fill="none" stroke="${forte}" stroke-width="3" opacity=".6"/>${i < 3 ? `<path d="m190 ${130 + i * 54} 5 5 9-10" stroke="${forte}" stroke-width="3" fill="none"/>` : ''}<rect x="226" y="${122 + i * 54}" width="${150 + ((i * 37) % 80)}" height="14" rx="7" fill="${medio}"/>`).join('');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 600"><rect width="640" height="600" fill="hsl(${hue} 70% 96%)"/><ellipse cx="320" cy="560" rx="200" ry="14" fill="hsl(${hue} 40% 85%)" opacity=".7"/><rect x="130" y="70" width="360" height="460" rx="16" fill="#fff" stroke="hsl(${hue} 40% 86%)" stroke-width="3"/>${miolo}${espiral}</svg>`;
}

const legendas = ['Capa', 'Página semanal', 'Página mensal', 'Página de checklist'];

/** Devolve 4 imagens de exemplo no formato { src, alt } usado pela Gallery e pelo ProductCard. */
export const gerarImagens = (titulo, hue) =>
  legendas.map((legenda, v) => ({
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(titulo, hue, v))}`,
    alt: `${legenda} de ${titulo} (imagem ilustrativa)`,
  }));
