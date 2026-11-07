export type Forme =
  | { type: 'classique'; etageres: number }
  | { type: 'cases'; lignes: number; colonnes: number }
  | { type: 'double'; etageres: number }
  | { type: 'piles'; piles: number };

/** Sens de lecture d'une étagère : de gauche à droite, ou de haut en bas pour une pile. */
export type Sens = 'gauche-droite' | 'haut-bas';

export type Statut = 'range' | 'lecture' | 'prete';

/** D'où viennent les infos du livre (titre, auteur…). */
export type EtatInfos = 'completes' | 'en-attente-reseau' | 'introuvable' | 'manuel';

export interface MegaCollection {
  id?: number;
  nom: string;
  ordre: number;
}

export interface Bibliotheque {
  id?: number;
  megaId: number;
  nom: string;
  ordre: number;
  forme: Forme;
}

export interface Etagere {
  id?: number;
  biblioId: number;
  /** Identifiant stable dans la forme (ex. « e2 », « l1c3 », « e1-derriere », « p1 »). */
  cle: string;
  ordre: number;
  nom: string;
  sens: Sens;
}

export interface Pret {
  nom: string;
  /** Date ISO (AAAA-MM-JJ). */
  date: string;
}

export interface Livre {
  id?: number;
  etagereId: number;
  position: number;
  isbn?: string;
  titre: string;
  auteur: string;
  couverture?: Blob;
  genres: string[];
  statut: Statut;
  pret?: Pret;
  note: string;
  infos: EtatInfos;
  dateAjout: string;
}

export interface Emplacement {
  mega: MegaCollection;
  biblio: Bibliotheque;
  etagere: Etagere;
}
