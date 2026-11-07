import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/lib/db';
import * as d from '../src/lib/depot';

const nouveau = (etagereId: number, titre: string, extra = {}) =>
  d.ajouterLivre({ etagereId, titre, auteur: 'A', genres: [], statut: 'range', note: '', infos: 'manuel', ...extra });

const titres = async (etagereId: number) => (await d.livresEtagere(etagereId)).map((l) => l.titre);
const etageres = (biblioId: number) => db.etageres.where({ biblioId }).sortBy('ordre');

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('collections et bibliothèques', () => {
  it('crée une bibliothèque avec les étagères de sa forme', async () => {
    const m = await d.creerMega('Maison principale');
    const b = await d.creerBibliotheque(m, 'Salon gauche', { type: 'classique', etageres: 3 });
    expect((await etageres(b)).map((e) => e.nom)).toEqual(['Étagère 1', 'Étagère 2', 'Étagère 3']);
  });

  it('ordonne les méga-collections et bibliothèques par ordre de création', async () => {
    await d.creerMega('B');
    await d.creerMega('A');
    expect((await d.listerMegas()).map((m) => m.nom)).toEqual(['B', 'A']);
  });

  it('supprimer une méga-collection supprime tout son contenu', async () => {
    const m = await d.creerMega('M');
    const b = await d.creerBibliotheque(m, 'B', { type: 'classique', etageres: 1 });
    const [e] = await etageres(b);
    await nouveau(e.id!, 'X');
    await d.supprimerMega(m);
    expect(await db.biblios.count()).toBe(0);
    expect(await db.etageres.count()).toBe(0);
    expect(await db.livres.count()).toBe(0);
  });

  it('compte les livres d’une bibliothèque et d’une méga-collection', async () => {
    const m = await d.creerMega('M');
    const b = await d.creerBibliotheque(m, 'B', { type: 'classique', etageres: 2 });
    const [e1, e2] = await etageres(b);
    await nouveau(e1.id!, 'X');
    await nouveau(e2.id!, 'Y');
    expect(await d.compterLivresBiblio(b)).toBe(2);
    expect(await d.compterLivresMega(m)).toBe(2);
  });
});

describe('changer la forme', () => {
  it('ajoute des étagères en gardant les noms personnalisés', async () => {
    const m = await d.creerMega('M');
    const b = await d.creerBibliotheque(m, 'B', { type: 'classique', etageres: 2 });
    const [e1] = await etageres(b);
    await d.renommerEtagere(e1.id!, 'Poches');
    await d.changerForme(b, { type: 'classique', etageres: 3 });
    expect((await etageres(b)).map((e) => e.nom)).toEqual(['Poches', 'Étagère 2', 'Étagère 3']);
    expect((await db.biblios.get(b))!.forme).toEqual({ type: 'classique', etageres: 3 });
  });

  it('signale les étagères supprimées qui contiennent des livres', async () => {
    const m = await d.creerMega('M');
    const b = await d.creerBibliotheque(m, 'B', { type: 'classique', etageres: 3 });
    const [, , e3] = await etageres(b);
    await nouveau(e3.id!, 'X');
    const r = await d.etageresSupprimeesAvecLivres(b, { type: 'classique', etageres: 1 });
    expect(r.map((e) => e.nom)).toEqual(['Étagère 3']);
    await expect(d.changerForme(b, { type: 'classique', etageres: 1 })).rejects.toThrow();
  });

  it('déplace les livres des étagères supprimées à la fin de l’étagère choisie', async () => {
    const m = await d.creerMega('M');
    const b = await d.creerBibliotheque(m, 'B', { type: 'classique', etageres: 3 });
    const [e1, e2, e3] = await etageres(b);
    await nouveau(e1.id!, 'A');
    await nouveau(e2.id!, 'B');
    await nouveau(e3.id!, 'C');
    await d.changerForme(b, { type: 'classique', etageres: 1 }, 'e1');
    expect(await titres(e1.id!)).toEqual(['A', 'B', 'C']);
    expect(await db.etageres.count()).toBe(1);
  });

  it('retire un emplacement du meuble et range ses livres ailleurs', async () => {
    const m = await d.creerMega('M');
    const b = await d.creerBibliotheque(m, 'B', { type: 'double', etageres: 2 });
    const [devant1, derriere1] = await etageres(b);
    await nouveau(derriere1.id!, 'X');
    const forme = { type: 'double' as const, etageres: 2, retirees: ['e1-derriere'] };
    expect((await d.etageresSupprimeesAvecLivres(b, forme)).map((e) => e.nom)).toEqual(['Étagère 1 · derrière']);
    await d.changerForme(b, forme, 'e1-devant');
    expect((await etageres(b)).map((e) => e.nom)).toEqual(['Étagère 1 · devant', 'Étagère 2 · devant', 'Étagère 2 · derrière']);
    expect(await titres(devant1.id!)).toEqual(['X']);
    // Le remettre recrée un emplacement vide.
    await d.changerForme(b, { type: 'double', etageres: 2 });
    expect((await etageres(b)).map((e) => e.nom)[1]).toBe('Étagère 1 · derrière');
  });

  it('refuse de changer le type de forme', async () => {
    const m = await d.creerMega('M');
    const b = await d.creerBibliotheque(m, 'B', { type: 'classique', etageres: 1 });
    await expect(d.changerForme(b, { type: 'piles', piles: 1 })).rejects.toThrow();
  });
});

describe('livres', () => {
  let e1: number;
  let e2: number;
  beforeEach(async () => {
    const m = await d.creerMega('M');
    const b = await d.creerBibliotheque(m, 'B', { type: 'classique', etageres: 2 });
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
