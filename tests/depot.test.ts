import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/lib/db';
import * as d from '../src/lib/depot';
import { meuble } from './meuble';
import { nomEtagere } from '../src/lib/etageres';

const nouveau = (etagereId: number, titre: string, extra = {}) =>
  d.ajouterLivre({ etagereId, titre, auteur: 'A', genres: [], statut: 'range', note: '', infos: 'manuel', ...extra });

const titres = async (etagereId: number) => (await d.livresEtagere(etagereId)).map((l) => l.titre);
const etageres = (biblioId: number) => db.etageres.where({ biblioId }).sortBy('ordre');

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('collections et bibliothèques', () => {
  it('crée une bibliothèque vide, sans étagère', async () => {
    const m = await d.creerMega('Maison principale');
    const b = await d.creerBibliotheque(m, ' Salon gauche ');
    expect((await db.biblios.get(b))!.nom).toBe('Salon gauche');
    expect(await d.compterEtageres(b)).toBe(0);
  });

  it('ordonne les méga-collections et bibliothèques par ordre de création', async () => {
    await d.creerMega('B');
    await d.creerMega('A');
    expect((await d.listerMegas()).map((m) => m.nom)).toEqual(['B', 'A']);
  });

  it('supprimer une méga-collection supprime tout son contenu', async () => {
    const m = await d.creerMega('M');
    const b = await meuble(m, 'B', 1);
    const [e] = await etageres(b);
    await nouveau(e.id!, 'X');
    await d.supprimerMega(m);
    expect(await db.biblios.count()).toBe(0);
    expect(await db.etageres.count()).toBe(0);
    expect(await db.livres.count()).toBe(0);
  });

  it('compte les livres d’une bibliothèque et d’une méga-collection', async () => {
    const m = await d.creerMega('M');
    const b = await meuble(m, 'B', 2);
    const [e1, e2] = await etageres(b);
    await nouveau(e1.id!, 'X');
    await nouveau(e2.id!, 'Y');
    expect(await d.compterLivresBiblio(b)).toBe(2);
    expect(await d.compterLivresMega(m)).toBe(2);
  });
});

describe('étagères', () => {
  let b: number;
  beforeEach(async () => {
    b = await d.creerBibliotheque(await d.creerMega('M'), 'B');
  });
  const noms = async () => (await d.listerEtageres(b)).map(nomEtagere);

  it('ajoute les étagères une par une, en bas du meuble', async () => {
    await d.creerEtagere(b, 'Étagère 1', 'simple');
    await d.creerEtagere(b, 'Étagère 2', 'double');
    await d.creerEtagere(b, 'Pile 1', 'pile');
    expect(await noms()).toEqual(['Étagère 1', 'Étagère 2 · devant', 'Étagère 2 · derrière', 'Pile 1']);
    expect((await d.listerEtageres(b)).map((e) => e.sens)).toEqual(['gauche-droite', 'gauche-droite', 'gauche-droite', 'haut-bas']);
    expect(await d.compterEtageres(b)).toBe(3);
  });

  it('propose le numéro suivant, séparément pour les piles', async () => {
    expect(await d.nomParDefaut(b, 'simple')).toBe('Étagère 1');
    await d.creerEtagere(b, 'Étagère 1', 'double');
    expect(await d.nomParDefaut(b, 'simple')).toBe('Étagère 2');
    expect(await d.nomParDefaut(b, 'pile')).toBe('Pile 1');
  });

  it('modifie le nom des deux rangées d’une étagère double', async () => {
    const id = await d.creerEtagere(b, 'Étagère 1', 'double');
    const derriere = (await d.listerEtageres(b))[1].id!;
    await d.modifierEtagere(derriere, 'Poches', 'double');
    expect(await noms()).toEqual(['Poches · devant', 'Poches · derrière']);
    expect((await d.groupeEtagere(id)).map((e) => e.id)).toEqual([id, derriere]);
  });

  it('passer en double rangée ajoute une rangée derrière, vide', async () => {
    const id = await d.creerEtagere(b, 'Étagère 1', 'simple');
    await nouveau(id, 'A');
    await d.modifierEtagere(id, 'Étagère 1', 'double');
    expect(await noms()).toEqual(['Étagère 1 · devant', 'Étagère 1 · derrière']);
    expect(await titres(id)).toEqual(['A']);
  });

  it('repasser en simple met les livres de derrière à la suite de ceux de devant', async () => {
    const id = await d.creerEtagere(b, 'Étagère 1', 'double');
    const derriere = (await d.listerEtageres(b))[1].id!;
    await nouveau(id, 'A');
    await nouveau(derriere, 'B');
    await nouveau(derriere, 'C');
    expect(await d.livresDerriere(id)).toBe(2);
    await d.modifierEtagere(id, 'Étagère 1', 'pile');
    const [seule, ...autres] = await d.listerEtageres(b);
    expect(autres).toEqual([]);
    expect(seule).toMatchObject({ forme: 'pile', sens: 'haut-bas' });
    expect('rangee' in seule).toBe(false);
    expect(await titres(id)).toEqual(['A', 'B', 'C']);
  });

  it('supprime une étagère avec ses deux rangées et ses livres, sans toucher aux autres', async () => {
    const garde = await d.creerEtagere(b, 'Étagère 1', 'simple');
    const id = await d.creerEtagere(b, 'Étagère 2', 'double');
    const derriere = (await d.listerEtageres(b))[2].id!;
    await nouveau(garde, 'Reste');
    await nouveau(id, 'A');
    await nouveau(derriere, 'B');
    expect(await d.compterLivresGroupe(derriere)).toBe(2);
    await d.supprimerEtagere(derriere);
    expect(await noms()).toEqual(['Étagère 1']);
    expect((await db.livres.toArray()).map((l) => l.titre)).toEqual(['Reste']);
  });
});

describe('livres', () => {
  let e1: number;
  let e2: number;
  beforeEach(async () => {
    const m = await d.creerMega('M');
    const b = await meuble(m, 'B', 2);
    [e1, e2] = (await etageres(b)).map((e) => e.id!);
  });

  it('ajoute à droite (en dernière position)', async () => {
    await nouveau(e1, 'A');
    await nouveau(e1, 'B');
    expect(await titres(e1)).toEqual(['A', 'B']);
  });

  it('applique un nouvel ordre, y compris venant d’une autre étagère', async () => {
    const a = await nouveau(e1, 'A');
    const b = await nouveau(e1, 'B');
    const c = await nouveau(e2, 'C');
    await d.appliquerOrdre(e1, [b, c, a]);
    await d.appliquerOrdre(e2, []);
    expect(await titres(e1)).toEqual(['B', 'C', 'A']);
    expect(await titres(e2)).toEqual([]);
  });

  it('déplacer vers une étagère place le livre à la fin et resserre la source', async () => {
    const a = await nouveau(e1, 'A');
    await nouveau(e1, 'B');
    await nouveau(e2, 'C');
    await d.deplacerVersEtagere(a, e2);
    expect(await titres(e2)).toEqual(['C', 'A']);
    expect((await d.livresEtagere(e1)).map((l) => l.position)).toEqual([0]);
  });

  it('déplacer un livre à une position précise, dans la même étagère ou une autre', async () => {
    const a = await nouveau(e1, 'A');
    await nouveau(e1, 'B');
    const c = await nouveau(e1, 'C');
    await nouveau(e2, 'X');
    await d.deplacerLivre(c, e1, 0);
    expect(await titres(e1)).toEqual(['C', 'A', 'B']);
    await d.deplacerLivre(a, e2, 1);
    expect(await titres(e1)).toEqual(['C', 'B']);
    expect(await titres(e2)).toEqual(['X', 'A']);
    expect((await d.livresEtagere(e1)).map((l) => l.position)).toEqual([0, 1]);
  });

  it('supprimer un livre resserre les positions', async () => {
    await nouveau(e1, 'A');
    const b = await nouveau(e1, 'B');
    await nouveau(e1, 'C');
    await d.supprimerLivre(b);
    expect((await d.livresEtagere(e1)).map((l) => [l.titre, l.position])).toEqual([['A', 0], ['C', 1]]);
  });

  it('trouve un doublon par ISBN ou par titre + auteur, en ignorant accents et casse', async () => {
    const a = await nouveau(e1, 'Les Misérables', { isbn: '9782070409228', auteur: 'Victor Hugo' });
    expect((await d.trouverDoublon({ isbn: '9782070409228', titre: '', auteur: '' }))?.id).toBe(a);
    expect((await d.trouverDoublon({ titre: 'les miserables', auteur: 'victor hugo' }))?.id).toBe(a);
    expect(await d.trouverDoublon({ titre: 'les miserables', auteur: 'victor hugo' }, a)).toBeUndefined();
    expect(await d.trouverDoublon({ titre: 'Dune', auteur: 'Herbert' })).toBeUndefined();
  });

  it('donne l’emplacement complet d’une étagère', async () => {
    const e = await d.emplacement(e2);
    expect([e!.mega.nom, e!.biblio.nom, e!.etagere.nom]).toEqual(['M', 'B', 'Étagère 2']);
  });

  it('conserve une couverture (Blob)', async () => {
    const id = await nouveau(e1, 'A', { couverture: new Blob(['img'], { type: 'image/jpeg' }) });
    const l = await db.livres.get(id);
    expect(await l!.couverture!.text()).toBe('img');
  });
});
