/** Forme d'une étagère : simple, en double rangée (devant et derrière) ou pile de livres couchés. */
export type FormeEtagere = 'simple' | 'double' | 'pile';

export type Rangee = 'devant' | 'derriere';

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
}

/**
 * Une liste de livres ordonnés. Une étagère en double rangée est faite de deux fiches
 * (devant et derrière) qui partagent la même bibliothèque, le même ordre et le même nom.
 */
export interface Etagere {
  id?: number;
  biblioId: number;
  /** Position de l'étagère dans le meuble (0 = la première créée). */
  ordre: number;
  nom: string;
  sens: Sens;
  forme: FormeEtagere;
  /** Seulement pour une étagère en double rangée. */
  rangee?: Rangee;
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
