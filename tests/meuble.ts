import * as d from '../src/lib/depot';

/** Crée une bibliothèque avec `n` étagères simples (« Étagère 1 »…). */
export async function meuble(megaId: number, nom: string, n: number): Promise<number> {
  const b = await d.creerBibliotheque(megaId, nom);
  for (let i = 1; i <= n; i++) await d.creerEtagere(b, `Étagère ${i}`, 'simple');
  return b;
}
