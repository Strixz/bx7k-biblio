import type { Etagere, FormeEtagere, Sens } from './types';

/** Nom affiché : « Étagère 1 », ou « Étagère 1 · derrière » pour une double rangée. */
export const nomEtagere = (e: Pick<Etagere, 'nom' | 'rangee'>) =>
  e.rangee ? `${e.nom} · ${e.rangee === 'devant' ? 'devant' : 'derrière'}` : e.nom;

export const sensDe = (forme: FormeEtagere): Sens => (forme === 'pile' ? 'haut-bas' : 'gauche-droite');

/**
 * Complète une étagère enregistrée par une ancienne version (meubles décrits d'un bloc) :
 * chaque ancienne étagère devient une étagère simple, ou une pile si elle se lisait de haut en bas.
 */
export function completerEtagere<T extends Partial<Etagere> & { cle?: string }>(e: T): Etagere {
  const { cle: _cle, ...reste } = e;
  return { ...reste, forme: e.forme ?? (e.sens === 'haut-bas' ? 'pile' : 'simple') } as Etagere;
}
