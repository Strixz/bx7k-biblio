import Dexie, { type Table } from 'dexie';
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
  }
}

export const db = new BiblioDB();
