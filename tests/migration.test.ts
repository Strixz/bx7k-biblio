import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { BiblioDB } from '../src/lib/db';

describe('passage à la version 2 de la base', () => {
  it('donne une forme aux anciennes étagères et retire la forme des meubles', async () => {
    const nom = 'migration-test';
    const ancienne = new Dexie(nom);
    ancienne.version(1).stores({ megas: '++id, ordre', biblios: '++id, megaId', etageres: '++id, biblioId', livres: '++id, etagereId, isbn, infos', reglages: 'cle' });
    await ancienne.table('biblios').add({ id: 1, megaId: 1, nom: 'Salon', ordre: 0, forme: { type: 'double', etageres: 1 } });
    await ancienne.table('etageres').bulkAdd([
      { id: 1, biblioId: 1, cle: 'e1-devant', ordre: 0, nom: 'Étagère 1 · devant', sens: 'gauche-droite' },
      { id: 2, biblioId: 1, cle: 'p1', ordre: 1, nom: 'Pile 1', sens: 'haut-bas' }
    ]);
    ancienne.close();

    const db = new BiblioDB(nom);
    expect(await db.etageres.toArray()).toEqual([
      { id: 1, biblioId: 1, ordre: 0, nom: 'Étagère 1 · devant', sens: 'gauche-droite', forme: 'simple' },
      { id: 2, biblioId: 1, ordre: 1, nom: 'Pile 1', sens: 'haut-bas', forme: 'pile' }
    ]);
    expect(await db.biblios.get(1)).toEqual({ id: 1, megaId: 1, nom: 'Salon', ordre: 0 });
    db.close();
  });
});
