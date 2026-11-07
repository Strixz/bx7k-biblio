import { describe, expect, it } from 'vitest';
import { traduireCategories, GENRES_BASE } from '../src/lib/genres';

describe('traduireCategories', () => {
  it('traduit les catégories connues en français', () => {
    expect(traduireCategories(['Science fiction'])).toEqual(['Science-fiction']);
    expect(traduireCategories(['Juvenile Fiction'])).toEqual(['Jeunesse']);
    expect(traduireCategories(['Detective and mystery stories'])).toEqual(['Policier']);
    expect(traduireCategories(['Cooking'])).toEqual(['Cuisine']);
  });
  it('ignore les catégories inconnues et dédoublonne', () => {
    expect(traduireCategories(['Arrakis (Imaginary place)', 'Science fiction', 'Fiction, science fiction, general'])).toEqual([
      'Science-fiction'
    ]);
  });
  it('« Fiction » seul devient Roman, mais pas s’il y a un genre plus précis', () => {
    expect(traduireCategories(['Fiction'])).toEqual(['Roman']);
    expect(traduireCategories(['Fiction', 'Fantasy fiction'])).toEqual(['Fantasy']);
  });
  it('les genres produits font partie de la liste de base', () => {
    const tous = traduireCategories([
      'Comics & Graphic Novels', 'History', 'Biography & Autobiography', 'Poetry', 'Drama', 'Travel', 'Art',
      'Philosophy', 'Thrillers', 'Romance', 'Horror', 'Humor', 'Science', 'Self-Help', 'Religion'
    ]);
    for (const g of tous) expect(GENRES_BASE).toContain(g);
  });
});
