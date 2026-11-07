import { db } from './db';
import { sensDe } from './etageres';
import { normaliser } from './recherche';
import type { Emplacement, Etagere, FormeEtagere, Livre } from './types';

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

export async function creerBibliotheque(megaId: number, nom: string): Promise<number> {
  return db.transaction('rw', db.biblios, async () => {
    const ordre = Math.max(-1, ...(await db.biblios.where({ megaId }).toArray()).map((b) => b.ordre)) + 1;
    return db.biblios.add({ megaId, nom: nom.trim(), ordre });
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

// ——— Étagères ———

const RANG = { devant: 0, derriere: 1 } as const;

/** Étagères du meuble dans l'ordre, la rangée de devant avant celle de derrière. */
export const listerEtageres = async (biblioId: number) =>
  (await db.etageres.where({ biblioId }).toArray()).sort(
    (a, b) => a.ordre - b.ordre || (a.rangee ? RANG[a.rangee] : 0) - (b.rangee ? RANG[b.rangee] : 0)
  );

/** Nombre d'étagères du meuble (une double rangée compte pour une). */
export async function compterEtageres(biblioId: number): Promise<number> {
  return new Set((await db.etageres.where({ biblioId }).toArray()).map((e) => e.ordre)).size;
}

/** « Étagère 3 » ou « Pile 2 » : numéro suivant parmi les étagères du même genre. */
export async function nomParDefaut(biblioId: number, forme: FormeEtagere): Promise<string> {
  const pile = forme === 'pile';
  const groupes = new Set(
    (await db.etageres.where({ biblioId }).toArray()).filter((e) => (e.forme === 'pile') === pile).map((e) => e.ordre)
  );
  return `${pile ? 'Pile' : 'Étagère'} ${groupes.size + 1}`;
}

/** L'étagère et, si elle est en double rangée, son autre rangée. Devant en premier. */
export async function groupeEtagere(etagereId: number): Promise<Etagere[]> {
  const e = await db.etageres.get(etagereId);
  if (!e) return [];
  return (await listerEtageres(e.biblioId)).filter((x) => x.ordre === e.ordre);
}

/** Ajoute une étagère en bas du meuble. Renvoie l'étagère (ou la rangée de devant) créée. */
export async function creerEtagere(biblioId: number, nom: string, forme: FormeEtagere): Promise<number> {
  return db.transaction('rw', db.etageres, async () => {
    const ordre = Math.max(-1, ...(await db.etageres.where({ biblioId }).toArray()).map((e) => e.ordre)) + 1;
    const base = { biblioId, ordre, nom: nom.trim(), forme, sens: sensDe(forme) } as const;
    if (forme !== 'double') return db.etageres.add({ ...base });
    const id = await db.etageres.add({ ...base, rangee: 'devant' });
    await db.etageres.add({ ...base, rangee: 'derriere' });
    return id;
  });
}

/** Livres de la rangée de derrière, qui changeraient de place si l'étagère n'était plus double. */
export async function livresDerriere(etagereId: number): Promise<number> {
  const derriere = (await groupeEtagere(etagereId)).find((e) => e.rangee === 'derriere');
  return derriere ? db.livres.where({ etagereId: derriere.id! }).count() : 0;
}

/**
 * Renomme l'étagère et change sa forme. Quand une double rangée devient simple (ou pile),
 * les livres de derrière sont mis à la suite de ceux de devant.
 */
export async function modifierEtagere(etagereId: number, nom: string, forme: FormeEtagere) {
  await db.transaction('rw', db.etageres, db.livres, async () => {
    const groupe = await groupeEtagere(etagereId);
    const principale = groupe.find((e) => e.rangee !== 'derriere') ?? groupe[0];
    if (!principale) throw new Error('Étagère introuvable');
    const derriere = groupe.find((e) => e !== principale);
    const commun = { nom: nom.trim(), forme, sens: sensDe(forme) };

    if (forme === 'double') {
      await db.etageres.update(principale.id!, { ...commun, rangee: 'devant' });
      if (derriere) await db.etageres.update(derriere.id!, { ...commun, rangee: 'derriere' });
      else await db.etageres.add({ ...commun, biblioId: principale.biblioId, ordre: principale.ordre, rangee: 'derriere' });
      return;
    }
    if (derriere) {
      const ids = [...(await livresEtagere(principale.id!)), ...(await livresEtagere(derriere.id!))].map((l) => l.id!);
      await appliquerOrdre(principale.id!, ids);
      await db.etageres.delete(derriere.id!);
    }
    await db.etageres.update(principale.id!, { ...commun, rangee: undefined });
  });
}

/** Nombre de livres sur l'étagère (les deux rangées d'une double rangée). */
export async function compterLivresGroupe(etagereId: number): Promise<number> {
  const ids = (await groupeEtagere(etagereId)).map((e) => e.id!);
  return db.livres.where('etagereId').anyOf(ids).count();
}

/** Supprime l'étagère (ses deux rangées si elle est double) et tous ses livres. */
export async function supprimerEtagere(etagereId: number) {
  await db.transaction('rw', db.etageres, db.livres, async () => {
    const ids = (await groupeEtagere(etagereId)).map((e) => e.id!);
    await db.livres.where('etagereId').anyOf(ids).delete();
    await db.etageres.bulkDelete(ids);
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
