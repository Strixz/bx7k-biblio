import type { EtatInfos, Livre, Statut } from './types';

export function normaliser(texte: string): string {
  return texte
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Filtres {
  statut?: Statut;
  infos?: EtatInfos;
}

/** Chaque mot de la requête doit apparaître dans le titre, l'auteur, un genre ou l'ISBN. */
export function rechercher(livres: Livre[], requete: string, filtres: Filtres = {}): Livre[] {
  const mots = normaliser(requete).split(' ').filter(Boolean);
  return livres
    .filter((l) => (!filtres.statut || l.statut === filtres.statut) && (!filtres.infos || l.infos === filtres.infos))
    .filter((l) => {
      if (!mots.length) return true;
      const texte = normaliser([l.titre, l.auteur, ...l.genres, l.isbn ?? ''].join(' '));
      return mots.every((m) => texte.includes(m));
    })
    .sort((a, b) => normaliser(a.titre).localeCompare(normaliser(b.titre), 'fr'));
}
