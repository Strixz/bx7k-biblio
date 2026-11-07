import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/lib/db';
import * as d from '../src/lib/depot';
import { exporterDonnees, importerDonnees, ErreurSauvegarde } from '../src/lib/sauvegarde';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

async function remplir() {
  const m = await d.creerMega('Maison principale');
  const b = await d.creerBibliotheque(m, 'Salon gauche', { type: 'cases', lignes: 1, colonnes: 2 });
  const [e1] = await d.listerEtageres(b);
  await d.ajouterLivre({
    etagereId: e1.id!, titre: 'Dune', auteur: 'Herbert', genres: ['Science-fiction'], statut: 'prete',
    pret: { nom: 'Paul', date: '2026-10-01' }, note: 'Édition poche', infos: 'completes',
    couverture: new Blob([new Uint8Array([0, 1, 2, 255])], { type: 'image/jpeg' })
  });
  await d.ajouterLivre({ etagereId: e1.id!, titre: 'Fondation', auteur: 'Asimov', genres: [], statut: 'range', note: '', infos: 'manuel' });
}

describe('sauvegarde', () => {
  it('export puis import restaure tout à l’identique, couvertures comprises', async () => {
    await remplir();
    const json = await exporterDonnees();
    await Promise.all(db.tables.map((t) => t.clear()));
    await d.creerMega('À écraser');

    const r = await importerDonnees(json);
    expect(r).toEqual({ livres: 2 });
    expect((await d.listerMegas()).map((m) => m.nom)).toEqual(['Maison principale']);
    const [e1] = await d.listerEtageres((await db.biblios.toArray())[0].id!);
    const livres = await d.livresEtagere(e1.id!);
    expect(livres.map((l) => l.titre)).toEqual(['Dune', 'Fondation']);
    expect(livres[0]).toMatchObject({ pret: { nom: 'Paul', date: '2026-10-01' }, note: 'Édition poche', statut: 'prete' });
    expect(new Uint8Array(await livres[0].couverture!.arrayBuffer())).toEqual(new Uint8Array([0, 1, 2, 255]));
    expect(livres[0].couverture!.type).toBe('image/jpeg');
  });

  it('refuse un fichier qui n’est pas une sauvegarde et ne touche à rien', async () => {
    await remplir();
    await expect(importerDonnees('{"hello":1}')).rejects.toBeInstanceOf(ErreurSauvegarde);
    await expect(importerDonnees('pas du json')).rejects.toBeInstanceOf(ErreurSauvegarde);
    expect(await db.livres.count()).toBe(2);
  });

  it('refuse une sauvegarde d’une version future', async () => {
    const json = JSON.parse(await exporterDonnees());
    json.version = 99;
    await expect(importerDonnees(JSON.stringify(json))).rejects.toBeInstanceOf(ErreurSauvegarde);
  });
});
