import { db } from './db';
import { telechargerMiniature } from './couvertures';
import { ErreurReseau, rechercherIsbn, type ResultatIsbn } from './isbn';
import type { EtatInfos } from './types';

export const titreProvisoire = (isbn: string) => `Livre ISBN ${isbn}`;

export interface InfosLivre {
  infos: EtatInfos;
  titre: string;
  auteur: string;
  genres: string[];
  couverture?: Blob;
}

export interface Dependances {
  recherche: (isbn: string) => Promise<ResultatIsbn>;
  miniature: (url: string) => Promise<Blob | undefined>;
}

const parDefaut: Dependances = { recherche: (i) => rechercherIsbn(i), miniature: telechargerMiniature };

const horsLigne = () => typeof navigator !== 'undefined' && navigator.onLine === false;

export async function chercherInfos(isbn: string, deps: Dependances = parDefaut): Promise<InfosLivre> {
  const attente: InfosLivre = { infos: 'en-attente-reseau', titre: titreProvisoire(isbn), auteur: '', genres: [] };
  if (horsLigne()) return attente;
  let r: ResultatIsbn;
  try {
    r = await deps.recherche(isbn);
  } catch (e) {
    if (e instanceof ErreurReseau) return attente;
    throw e;
  }
  if (!r.trouve) return { ...attente, infos: 'introuvable' };
  const couverture = r.couvertureUrl ? await deps.miniature(r.couvertureUrl) : undefined;
  return { infos: 'completes', titre: r.titre, auteur: r.auteur, genres: r.genres, ...(couverture && { couverture }) };
}

/**
 * Relance la recherche des livres scannés sans réseau. Ne remplace que ce que l'utilisateur
 * n'a pas saisi lui-même. Renvoie le nombre de livres traités.
 */
export async function completerEnAttente(deps: Dependances = parDefaut): Promise<number> {
  const livres = await db.livres.where({ infos: 'en-attente-reseau' }).toArray();
  let n = 0;
  for (const l of livres) {
    if (!l.isbn) continue;
    const r = await chercherInfos(l.isbn, deps);
    if (r.infos === 'en-attente-reseau') break;
    await db.livres.update(l.id!, {
      infos: r.infos,
      ...(r.infos === 'completes' && {
        titre: l.titre === titreProvisoire(l.isbn) ? r.titre : l.titre,
        auteur: l.auteur || r.auteur,
        genres: [...new Set([...l.genres, ...r.genres])],
        ...(!l.couverture && r.couverture && { couverture: r.couverture })
      })
    });
    n++;
  }
  return n;
}
