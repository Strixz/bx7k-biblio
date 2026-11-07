import Dexie, { type Table } from 'dexie';
import { completerEtagere } from './etageres';
import type { Bibliotheque, Etagere, Livre, MegaCollection } from './types';

export interface LigneReglage {
  cle: string;
  valeur: unknown;
}

export class BiblioDB extends Dexie {
  megas!: Table<MegaCollection, number>;
  biblios!: Table<Bibliotheque, number>;
  etageres!: Table<Etagere, number>;
  livres!: Table<Livre, number>;
  reglages!: Table<LigneReglage, string>;

  constructor(nom = 'biblio-scan') {
    super(nom);
    this.version(1).stores({
      megas: '++id, ordre',
      biblios: '++id, megaId',
      etageres: '++id, biblioId',
      livres: '++id, etagereId, isbn, infos',
      reglages: 'cle'
    });
    // v2 : les étagères se créent une par une ; les meubles n'ont plus de « forme » globale.
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table('etageres').toCollection().modify((e) => {
          Object.assign(e, completerEtagere(e));
          delete e.cle;
        });
        await tx.table('biblios').toCollection().modify((b) => delete b.forme);
      });
  }
}

export const db = new BiblioDB();
