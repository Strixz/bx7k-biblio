export type Route =
  | { page: 'accueil' }
  | { page: 'mega'; id: number }
  | { page: 'nouvelle-biblio'; megaId: number }
  | { page: 'biblio'; id: number }
  | { page: 'forme'; id: number }
  | { page: 'livre'; id: number }
  | { page: 'ajouter'; etagereId?: number }
  | { page: 'serie'; etagereId?: number }
  | { page: 'recherche' }
  | { page: 'options' }
  | { page: 'tutoriel' }
  | { page: 'installer' };

const AVEC_ID = ['mega', 'nouvelle-biblio', 'biblio', 'forme', 'livre', 'ajouter', 'serie'] as const;

export function lireRoute(hash: string): Route {
  const [page, brut] = hash.replace(/^#\/?/, '').split('/');
  const n = Number(brut);
  if ((AVEC_ID as readonly string[]).includes(page)) {
    if (page === 'ajouter' || page === 'serie') return { page, ...(brut && n > 0 && { etagereId: n }) };
    if (n > 0) return page === 'nouvelle-biblio' ? { page, megaId: n } : ({ page, id: n } as Route);
    return { page: 'accueil' };
  }
  if (['recherche', 'options', 'tutoriel', 'installer'].includes(page)) return { page } as Route;
  return { page: 'accueil' };
}

export function lien(r: Route): string {
  const id = 'id' in r ? r.id : 'megaId' in r ? r.megaId : 'etagereId' in r ? r.etagereId : undefined;
  return r.page === 'accueil' ? '#/' : `#/${r.page}${id ? `/${id}` : ''}`;
}

export const routeur = $state({ route: lireRoute(location.hash) });

addEventListener('hashchange', () => {
  routeur.route = lireRoute(location.hash);
  scrollTo(0, 0);
});

export function aller(r: Route, remplacer = false) {
  if (remplacer) location.replace(lien(r));
  else location.hash = lien(r);
}
