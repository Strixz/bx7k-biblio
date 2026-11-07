import { db } from './db';
import { genererEtageres } from './formes';
import { normaliser } from './recherche';
import type { Emplacement, Etagere, Forme, Livre } from './types';

// ——— Méga-collections ———

export const listerMegas = () => db.megas.orderBy('ordre').toArray();

export async function creerMega(nom: string): Promise<number> {
  const ordre = ((await db.megas.orderBy('ordre').last())?.ordre ?? -1) + 1;
  return db.megas.add({ nom: nom.trim(), ordre });
}

export const renommerMega = (id: number, nom: string) => db.megas.update(id, { nom: nom.trim() });

export async function supprimerMega(id: number) {
  await db.transaction('rw', db.megas, db.biblios, db.etageres, db.livres, async () => {
    for (const b of await db.biblios.where({ megaId: id }).toArray()) await supprimerBibliotheque(b.id!);
    await db.megas.delete(id);
  });
}

// ——— Bibliothèques ———

export const listerBibliotheques = (megaId: number) => db.biblios.where({ megaId }).sortBy('ordre');

export async function creerBibliotheque(megaId: number, nom: string, forme: Forme): Promise<number> {
  const gen = genererEtageres(forme);
  return db.transaction('rw', db.biblios, db.etageres, async () => {
    const ordre = Math.max(-1, ...(await db.biblios.where({ megaId }).toArray()).map((b) => b.ordre)) + 1;
    const biblioId = await db.biblios.add({ megaId, nom: nom.trim(), ordre, forme });
    await db.etageres.bulkAdd(gen.map((g, i) => ({ ...g, biblioId, ordre: i })));
    return biblioId;
  });
}

export const renommerBibliotheque = (id: number, nom: string) => db.biblios.update(id, { nom: nom.trim() });

export async function supprimerBibliotheque(id: number) {
  await db.transaction('rw', db.biblios, db.etageres, db.livres, async () => {
    const ids = (await db.etageres.where({ biblioId: id }).toArray()).map((e) => e.id!);
    await db.livres.where('etagereId').anyOf(ids).delete();
    await db.etageres.bulkDelete(ids);
    await db.biblios.delete(id);
  });
}

export const listerEtageres = (biblioId: number) => db.etageres.where({ biblioId }).sortBy('ordre');

export const renommerEtagere = (id: number, nom: string) => db.etageres.update(id, { nom: nom.trim() });

/** Étagères qui disparaîtraient avec la nouvelle forme et qui contiennent encore des livres. */
export async function etageresSupprimeesAvecLivres(biblioId: number, forme: Forme): Promise<Etagere[]> {
  const cles = new Set(genererEtageres(forme).map((g) => g.cle));
  const res: Etagere[] = [];
  for (const e of await listerEtageres(biblioId)) {
    if (!cles.has(e.cle) && (await db.livres.where({ etagereId: e.id! }).count()) > 0) res.push(e);
  }
  return res;
}

/**
 * Change les dimensions d'une bibliothèque (même type de forme). Les étagères qui restent gardent
 * leur nom ; les livres des étagères supprimées vont à la fin de l'étagère `cibleCle`.
 */
export async function changerForme(biblioId: number, forme: Forme, cibleCle?: string) {
  const biblio = await db.biblios.get(biblioId);
  if (!biblio) throw new Error('Bibliothèque introuvable');
  if (biblio.forme.type !== forme.type) throw new Error('Le type de meuble ne peut pas changer');
  const gen = genererEtageres(forme);
  await db.transaction('rw', db.biblios, db.etageres, db.livres, async () => {
    const existantes = new Map((await listerEtageres(biblioId)).map((e) => [e.cle, e]));
    const ids = new Map<string, number>();
    for (const [i, g] of gen.entries()) {
      const e = existantes.get(g.cle);
      if (e) {
        await db.etageres.update(e.id!, { ordre: i });
        ids.set(g.cle, e.id!);
      } else {
        ids.set(g.cle, await db.etageres.add({ ...g, biblioId, ordre: i }));
      }
    }
    for (const e of existantes.values()) {
      if (ids.has(e.cle)) continue;
      const livres = await livresEtagere(e.id!);
      if (livres.length) {
        const cible = cibleCle ? ids.get(cibleCle) : undefined;
        if (cible === undefined) throw new Error(`Où ranger les livres de « ${e.nom} » ?`);
        for (const l of livres) await deplacerVersEtagere(l.id!, cible);
      }
      await db.etageres.delete(e.id!);
    }
    await db.biblios.update(biblioId, { forme });
  });
}

// ——— Livres ———

export const livresEtagere = (etagereId: number) => db.livres.where({ etagereId }).sortBy('position');

export type NouveauLivre = Omit<Livre, 'id' | 'position' | 'dateAjout'> & { dateAjout?: string };

/** Ajoute le livre à droite de l'étagère (dernière position). */
export async function ajouterLivre(l: NouveauLivre): Promise<number> {
  return db.transaction('rw', db.livres, async () => {
    const position = await db.livres.where({ etagereId: l.etagereId }).count();
    return db.livres.add({ ...l, position, dateAjout: l.dateAjout ?? new Date().toISOString() });
  });
}

export const majLivre = (id: number, changements: Partial<Livre>) => db.livres.update(id, changements);

/** Fixe l'ordre complet d'une étagère (les livres listés y sont rattachés). */
export async function appliquerOrdre(etagereId: number, livreIds: number[]) {
  await db.transaction('rw', db.livres, async () => {
    for (const [position, id] of livreIds.entries()) await db.livres.update(id, { etagereId, position });
  });
}

async function resserrer(etagereId: number) {
  await appliquerOrdre(etagereId, (await livresEtagere(etagereId)).map((l) => l.id!));
}

export async function deplacerVersEtagere(livreId: number, etagereId: number) {
  await db.transaction('rw', db.livres, async () => {
    const l = await db.livres.get(livreId);
    if (!l || l.etagereId === etagereId) return;
    const position = await db.livres.where({ etagereId }).count();
    await db.livres.update(livreId, { etagereId, position });
    await resserrer(l.etagereId);
  });
}

/** Place le livre à `index` (0 = le plus à gauche) sur l'étagère donnée. */
export async function deplacerLivre(livreId: number, etagereId: number, index: number) {
  await db.transaction('rw', db.livres, async () => {
    const l = await db.livres.get(livreId);
    if (!l) return;
    const cible = (await livresEtagere(etagereId)).map((x) => x.id!).filter((id) => id !== livreId);
    cible.splice(Math.max(0, Math.min(index, cible.length)), 0, livreId);
    await appliquerOrdre(etagereId, cible);
    if (l.etagereId !== etagereId) await resserrer(l.etagereId);
  });
}

export async function supprimerLivre(id: number) {
  await db.transaction('rw', db.livres, async () => {
    const l = await db.livres.get(id);
    if (!l) return;
    await db.livres.delete(id);
    await resserrer(l.etagereId);
  });
}

export async function emplacement(etagereId: number): Promise<Emplacement | undefined> {
  const etagere = await db.etageres.get(etagereId);
  const biblio = etagere && (await db.biblios.get(etagere.biblioId));
  const mega = biblio && (await db.megas.get(biblio.megaId));
  return etagere && biblio && mega ? { mega, biblio, etagere } : undefined;
}

export async function trouverDoublon(
  l: { isbn?: string; titre: string; auteur: string },
  saufId?: number
): Promise<Livre | undefined> {
  const autre = (x: Livre) => x.id !== saufId;
  if (l.isbn) {
    const parIsbn = (await db.livres.where({ isbn: l.isbn }).toArray()).find(autre);
    if (parIsbn) return parIsbn;
  }
  const t = normaliser(l.titre);
  const a = normaliser(l.auteur);
  if (!t) return undefined;
  return db.livres.filter((x) => autre(x) && normaliser(x.titre) === t && normaliser(x.auteur) === a).first();
}

export async function compterLivresBiblio(biblioId: number): Promise<number> {
  const ids = (await listerEtageres(biblioId)).map((e) => e.id!);
  return db.livres.where('etagereId').anyOf(ids).count();
}

export async function compterLivresMega(megaId: number): Promise<number> {
  let n = 0;
  for (const b of await listerBibliotheques(megaId)) n += await compterLivresBiblio(b.id!);
  return n;
}
