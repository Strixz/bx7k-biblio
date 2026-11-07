export interface Jetons {
  bg: string;
  su: string;
  bo: string;
  ac: string;
  tx: string;
  se: string;
}

export interface Theme {
  id: string;
  nom: string;
  clair: Jetons;
  sombre: Jetons;
}

const j = (bg: string, su: string, bo: string, ac: string, tx: string, se: string): Jetons => ({ bg, su, bo, ac, tx, se });

export const THEMES: Theme[] = [
  { id: 'terracotta', nom: 'Crème & terracotta', clair: j('#fbf5ea', '#ffffff', '#eadcc6', '#c0643b', '#3b2a1e', '#f1e6d3'), sombre: j('#241c17', '#30251e', '#42342a', '#d9774a', '#f1e4d0', '#33281f') },
  { id: 'sauge', nom: 'Sauge & lin', clair: j('#f4f1e8', '#fffdf7', '#dfe3d2', '#6f8a5e', '#2f3a2f', '#e6e9da'), sombre: j('#1c221c', '#263026', '#354235', '#8fae7b', '#e6ecdc', '#232b23') },
  { id: 'bordeaux', nom: 'Plaid bordeaux', clair: j('#faf3ef', '#ffffff', '#ecd9d2', '#8c2f39', '#3a1f22', '#f2e3dd'), sombre: j('#221517', '#2e1d20', '#44292d', '#c4596a', '#f3e2e0', '#2a1a1d') },
  { id: 'myrtille', nom: 'Bleu myrtille', clair: j('#f3f4f8', '#ffffff', '#d9deea', '#3f5a8a', '#1f2a3d', '#e3e7f0'), sombre: j('#161b26', '#1f2634', '#2f3a4f', '#7f9ed6', '#e3e8f3', '#1c2230') },
  { id: 'mer', nom: 'Bord de mer', clair: j('#f1f6f6', '#ffffff', '#d3e4e3', '#2f7c7a', '#1d3534', '#e0ecec'), sombre: j('#132020', '#1b2c2c', '#284040', '#5fb3ae', '#dcefed', '#182828') },
  { id: 'rose', nom: 'Rose thé', clair: j('#fdf2f3', '#ffffff', '#f3d6da', '#c45a74', '#3d2229', '#f7e1e4'), sombre: j('#231719', '#302024', '#4a2f35', '#e58ca2', '#f6e3e6', '#2b1d20') },
  { id: 'lavande', nom: 'Lavande', clair: j('#f6f3fa', '#ffffff', '#e1d9ee', '#7a5ca8', '#2e2540', '#ebe5f4'), sombre: j('#1b1724', '#262032', '#3a3049', '#ad93d8', '#ebe4f5', '#221d2d') },
  { id: 'miel', nom: 'Miel', clair: j('#fdf8ea', '#ffffff', '#f1e3b8', '#c88a12', '#3a2e14', '#f6ebc9'), sombre: j('#1f1a10', '#2b2416', '#433820', '#e7b04a', '#f5ecd4', '#262014') }
];

export const themeParId = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

export function appliquerTheme(id: string, sombre: boolean) {
  const t = themeParId(id);
  const c = sombre ? t.sombre : t.clair;
  const s = document.documentElement.style;
  for (const [k, v] of Object.entries(c)) s.setProperty(`--${k}`, v);
  // Texte sur un bouton d'accent : blanc en clair, fond du thème en sombre (contraste suffisant).
  s.setProperty('--sur-ac', sombre ? c.bg : '#ffffff');
  document.documentElement.dataset.sombre = String(sombre);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c.bg);
}
