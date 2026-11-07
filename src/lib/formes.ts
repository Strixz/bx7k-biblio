import type { Forme, Sens } from './types';

export interface EtagereGeneree {
  cle: string;
  nom: string;
  sens: Sens;
}

export const MAX_PAR_DIMENSION = 30;

function verifier(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_PAR_DIMENSION) {
    throw new Error(`Nombre invalide : ${n} (entre 1 et ${MAX_PAR_DIMENSION})`);
  }
}

/** Liste ordonnée des étagères qu'une forme de meuble produit. */
export function genererEtageres(forme: Forme): EtagereGeneree[] {
  const res: EtagereGeneree[] = [];
  switch (forme.type) {
    case 'classique':
      verifier(forme.etageres);
      for (let i = 1; i <= forme.etageres; i++) {
        res.push({ cle: `e${i}`, nom: `Étagère ${i}`, sens: 'gauche-droite' });
      }
      break;
    case 'cases':
      verifier(forme.lignes);
      verifier(forme.colonnes);
      for (let l = 1; l <= forme.lignes; l++) {
        for (let c = 1; c <= forme.colonnes; c++) {
          res.push({ cle: `l${l}c${c}`, nom: `Ligne ${l} · Case ${c}`, sens: 'gauche-droite' });
        }
      }
      break;
    case 'double':
      verifier(forme.etageres);
      for (let i = 1; i <= forme.etageres; i++) {
        res.push({ cle: `e${i}-devant`, nom: `Étagère ${i} · devant`, sens: 'gauche-droite' });
        res.push({ cle: `e${i}-derriere`, nom: `Étagère ${i} · derrière`, sens: 'gauche-droite' });
      }
      break;
    case 'piles':
      verifier(forme.piles);
      for (let i = 1; i <= forme.piles; i++) {
        res.push({ cle: `p${i}`, nom: `Pile ${i}`, sens: 'haut-bas' });
      }
      break;
  }
  return res;
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function decrireForme(forme: Forme): string {
  switch (forme.type) {
    case 'classique':
      return pluriel(forme.etageres, 'étagère');
    case 'cases':
      return `Meuble à cases ${forme.lignes} × ${forme.colonnes}`;
    case 'double':
      return `${pluriel(forme.etageres, 'étagère')} en double rangée`;
    case 'piles':
      return pluriel(forme.piles, 'pile');
  }
}
