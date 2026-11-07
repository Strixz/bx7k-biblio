import { db } from './db';

export interface Reglages {
  theme: string;
  /** null : suit le réglage de l'iPhone tant que l'utilisateur n'a pas choisi. */
  sombre: boolean | null;
  derniereSauvegarde: string | null;
  rappelJours: number;
  tutorielVu: boolean;
  /** Dernière étagère utilisée pour ranger un livre. */
  dernierEmplacement: number | null;
  /** Pages dont l'aide a déjà été montrée. */
  aidesVues: string[];
}

const DEFAUTS: Reglages = {
  theme: 'terracotta',
  sombre: null,
  derniereSauvegarde: null,
  rappelJours: 30,
  tutorielVu: false,
  dernierEmplacement: null,
  aidesVues: []
};

export const reglages: Reglages = $state({ ...DEFAUTS });

export async function chargerReglages() {
  for (const { cle, valeur } of await db.reglages.toArray()) {
    if (cle in DEFAUTS) (reglages as unknown as Record<string, unknown>)[cle] = valeur;
  }
}

export async function changerReglage<K extends keyof Reglages>(cle: K, valeur: Reglages[K]) {
  reglages[cle] = valeur;
  await db.reglages.put({ cle, valeur: $state.snapshot(valeur) });
}

/** Nombre de jours depuis la dernière sauvegarde, ou null si jamais sauvegardé. */
export function joursDepuisSauvegarde(maintenant = Date.now()): number | null {
  if (!reglages.derniereSauvegarde) return null;
  return Math.floor((maintenant - Date.parse(reglages.derniereSauvegarde)) / 86_400_000);
}
