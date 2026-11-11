// Mesmos ícones de traço da home (src/main.js) + alguns novos para o catálogo.
const paths = {
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  brand: '<path d="M21.5 4.8c-4.3-3.8-9.8.5-10 6.1C6.2 5.1-.8 9.7 2.8 15.2 6.2 20 14.7 24 14.7 24S26.2 9 21.5 4.8Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="7.8"/><path d="m16.5 16.5 5 5"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3Z"/>',
  cart: '<path d="M1.5 3h3l3 13h12l3-10H5"/><circle cx="9" cy="21" r="1.3"/><circle cx="19" cy="21" r="1.3"/>',
  bag: '<path d="M5 7h14l1.5 15h-17L5 7Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  arrow: '<path d="M3 12h18m-6-6 6 6-6 6"/>',
  bolt: '<path d="m14 1-11 13h8l-1 9 11-13h-8l1-9Z"/>',
  printer: '<path d="M6 9V2h12v7M6 18H3V9h18v9h-3M6 14h12v9H6Z"/><path d="M17 12h1"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  menu: '<path d="M3 5h18M3 12h18M3 19h18"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  download: '<path d="M12 2v14m-5-5 5 5 5-5M3 16v6h18v-6"/>',
  filter: '<path d="M3 4h18l-7 9v7l-4-2v-5L3 4Z"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  calendar: '<rect x="2" y="5" width="20" height="17" rx="2"/><path d="M7 2v6M17 2v6M2 11h20M7 15h2m6 0h2M7 19h2m6 0h2"/>',
  planner: '<rect x="4" y="2" width="16" height="21" rx="2"/><path d="M7 2v21m4-16h5m-5 4h3m-3 5h5"/>',
  book: '<path d="M12 6C7 2 2 4 2 4v16s5-2 10 2c5-4 10-2 10-2V4s-5-2-10 2Zm0 0v16M5 7v10m14-10v10"/>',
  layers: '<path d="m12 2 11 6-11 6L1 8l11-6Zm-11 11 11 6 11-6M1 18l11 6 11-6"/>',
  box: '<path d="m12 2 10 5v12l-10 5-10-5V7l10-5Zm0 10v12M2 7l10 5 10-5M7 4.5l10 5"/>',
  play: '<circle cx="12" cy="12" r="9.5"/><path d="m10 8 6 4-6 4Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 5 10 8L22 5"/>',
  file: '<path d="M6 2h8l5 5v15H6V2Z"/><path d="M14 2v5h5M9 13h7M9 17h5"/>',
};
export const icon = (name, extra = '') =>
  `<svg class="icon ${extra}" viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.heart}</svg>`;
