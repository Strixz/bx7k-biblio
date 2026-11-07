import { describe, expect, it, vi } from 'vitest';
import { nettoyerIsbn, rechercherIsbn, ErreurReseau } from '../src/lib/isbn';

describe('nettoyerIsbn', () => {
  it('accepte un ISBN-13 valide, avec tirets', () => {
    expect(nettoyerIsbn('978-2-07-061275-8')).toBe('9782070612758');
  });
  it('convertit un ISBN-10 en ISBN-13', () => {
    expect(nettoyerIsbn('2-07-061275-X')).toBeNull(); // clé fausse
    expect(nettoyerIsbn('0-306-40615-2')).toBe('9780306406157');
  });
  it('refuse un code-barres qui n’est pas un livre ou une clé fausse', () => {
    expect(nettoyerIsbn('3017620422003')).toBeNull(); // EAN alimentaire
    expect(nettoyerIsbn('9782070612759')).toBeNull();
    expect(nettoyerIsbn('abc')).toBeNull();
  });
});

const rep = (corps: unknown, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(corps) } as Response);

describe('rechercherIsbn', () => {
  it('utilise Open Library et traduit les sujets', async () => {
    const f = vi.fn().mockImplementation((url: string) =>
      url.includes('openlibrary')
        ? rep({ 'ISBN:9782070612758': { title: 'Le Petit Prince', authors: [{ name: 'Antoine de Saint-Exupéry' }], subjects: [{ name: 'Juvenile fiction' }], cover: { medium: 'https://covers/m.jpg' } } })
        : rep({ totalItems: 0 })
    );
    const r = await rechercherIsbn('9782070612758', f);
    expect(r).toEqual({ trouve: true, titre: 'Le Petit Prince', auteur: 'Antoine de Saint-Exupéry', genres: ['Jeunesse'], couvertureUrl: 'https://covers/m.jpg' });
    expect(f.mock.calls.every(([u]) => !String(u).includes('key='))).toBe(true);
  });

  it('se rabat sur Google Books si Open Library ne connaît pas le livre', async () => {
    const f = vi.fn().mockImplementation((url: string) =>
      url.includes('openlibrary')
        ? rep({})
        : rep({ totalItems: 1, items: [{ volumeInfo: { title: 'Dune', authors: ['Frank Herbert'], categories: ['Fiction'], imageLinks: { thumbnail: 'http://books.google/t.jpg' } } }] })
    );
    expect(await rechercherIsbn('9780441013593', f)).toEqual({
      trouve: true, titre: 'Dune', auteur: 'Frank Herbert', genres: ['Roman'], couvertureUrl: 'https://books.google/t.jpg'
    });
  });

  it('complète genres et couverture via Google Books quand Open Library n’en a pas', async () => {
    const f = vi.fn().mockImplementation((url: string) =>
      url.includes('openlibrary')
        ? rep({ 'ISBN:9780441013593': { title: 'Dune', authors: [{ name: 'Frank Herbert' }] } })
        : rep({ totalItems: 1, items: [{ volumeInfo: { title: 'Dune', categories: ['Science fiction'], imageLinks: { thumbnail: 'https://g/t.jpg' } } }] })
    );
    const r = await rechercherIsbn('9780441013593', f);
    expect(r).toMatchObject({ trouve: true, titre: 'Dune', genres: ['Science-fiction'], couvertureUrl: 'https://g/t.jpg' });
  });

  it('livre introuvable partout', async () => {
    const f = vi.fn().mockImplementation((url: string) => (url.includes('openlibrary') ? rep({}) : rep({ totalItems: 0 })));
    expect(await rechercherIsbn('9780306406157', f)).toEqual({ trouve: false });
  });

  it('lève ErreurReseau si le réseau ne répond pas', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Load failed'));
    await expect(rechercherIsbn('9780306406157', f)).rejects.toBeInstanceOf(ErreurReseau);
  });

  it('lève ErreurReseau si les deux services sont en erreur serveur', async () => {
    const f = vi.fn().mockImplementation(() => rep({}, false));
    await expect(rechercherIsbn('9780306406157', f)).rejects.toBeInstanceOf(ErreurReseau);
  });
});
