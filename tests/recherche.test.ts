import { describe, expect, it } from 'vitest';
import { normaliser, rechercher } from '../src/lib/recherche';
import type { Livre } from '../src/lib/types';

const livre = (id: number, titre: string, auteur: string, genres: string[] = [], extra: Partial<Livre> = {}): Livre => ({
  id, etagereId: 1, position: 0, titre, auteur, genres, statut: 'range', note: '', infos: 'completes',
  dateAjout: '2026-01-01', ...extra
});

const livres = [
  livre(1, 'Les Misérables', 'Victor Hugo', ['Roman']),
  livre(2, 'Dune', 'Frank Herbert', ['Science-fiction']),
  livre(3, 'Fondation', 'Isaac Asimov', ['Science-fiction'], { statut: 'prete', pret: { nom: 'Paul', date: '2026-10-01' } }),
  livre(4, 'Livre ISBN 9782070612758', '', [], { infos: 'en-attente-reseau', isbn: '9782070612758' })
];

describe('normaliser', () => {
  it('retire accents, majuscules et espaces superflus', () => {
    expect(normaliser('  Les MISÉRABLES  ')).toBe('les miserables');
    expect(normaliser("L'Œuvre")).toBe("l'oeuvre");
  });
});

describe('rechercher', () => {
  it('ignore accents et majuscules', () => {
    expect(rechercher(livres, 'miserables').map((l) => l.id)).toEqual([1]);
  });
  it('cherche dans l’auteur', () => {
    expect(rechercher(livres, 'hugo').map((l) => l.id)).toEqual([1]);
  });
  it('cherche dans les genres', () => {
    expect(rechercher(livres, 'science').map((l) => l.id)).toEqual([2, 3]);
  });
  it('tous les mots doivent correspondre, dans n’importe quel champ', () => {
    expect(rechercher(livres, 'dune herbert').map((l) => l.id)).toEqual([2]);
    expect(rechercher(livres, 'dune asimov')).toEqual([]);
  });
  it('trouve par ISBN', () => {
    expect(rechercher(livres, '9782070612758').map((l) => l.id)).toEqual([4]);
  });
  it('filtre par statut et état des infos, requête vide = tout', () => {
    expect(rechercher(livres, '', { statut: 'prete' }).map((l) => l.id)).toEqual([3]);
    expect(rechercher(livres, '', { infos: 'en-attente-reseau' }).map((l) => l.id)).toEqual([4]);
  });
  it('trie par titre', () => {
    expect(rechercher(livres, '').map((l) => l.id)).toEqual([2, 3, 1, 4]);
  });
});
