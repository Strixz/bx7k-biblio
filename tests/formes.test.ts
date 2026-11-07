import { describe, expect, it } from 'vitest';
import { genererEtageres, decrireForme } from '../src/lib/formes';

describe('genererEtageres', () => {
  it('étagères classiques numérotées de haut en bas', () => {
    expect(genererEtageres({ type: 'classique', etageres: 3 })).toEqual([
      { cle: 'e1', nom: 'Étagère 1', sens: 'gauche-droite' },
      { cle: 'e2', nom: 'Étagère 2', sens: 'gauche-droite' },
      { cle: 'e3', nom: 'Étagère 3', sens: 'gauche-droite' }
    ]);
  });

  it('meuble à cases : une étagère par case, ligne par ligne', () => {
    const r = genererEtageres({ type: 'cases', lignes: 2, colonnes: 2 });
    expect(r.map((e) => e.nom)).toEqual([
      'Ligne 1 · Case 1',
      'Ligne 1 · Case 2',
      'Ligne 2 · Case 1',
      'Ligne 2 · Case 2'
    ]);
    expect(r[3].cle).toBe('l2c2');
  });

  it('double rangée : devant puis derrière', () => {
    const r = genererEtageres({ type: 'double', etageres: 2 });
    expect(r.map((e) => e.nom)).toEqual([
      'Étagère 1 · devant',
      'Étagère 1 · derrière',
      'Étagère 2 · devant',
      'Étagère 2 · derrière'
    ]);
  });

  it('piles lues de haut en bas', () => {
    expect(genererEtageres({ type: 'piles', piles: 1 })).toEqual([
      { cle: 'p1', nom: 'Pile 1', sens: 'haut-bas' }
    ]);
  });

  it('refuse une forme vide', () => {
    expect(() => genererEtageres({ type: 'classique', etageres: 0 })).toThrow();
  });
});

describe('decrireForme', () => {
  it('décrit chaque forme en français', () => {
    expect(decrireForme({ type: 'classique', etageres: 1 })).toBe('1 étagère');
    expect(decrireForme({ type: 'classique', etageres: 4 })).toBe('4 étagères');
    expect(decrireForme({ type: 'cases', lignes: 4, colonnes: 4 })).toBe('Meuble à cases 4 × 4');
    expect(decrireForme({ type: 'double', etageres: 3 })).toBe('3 étagères en double rangée');
    expect(decrireForme({ type: 'piles', piles: 2 })).toBe('2 piles');
  });
});
