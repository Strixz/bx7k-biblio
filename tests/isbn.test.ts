import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { nettoyerIsbn, isbn10, lireNoticeBnf, rechercherIsbn, ErreurReseau } from '../src/lib/isbn';

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

describe('isbn10', () => {
  it('retrouve la forme à 10 chiffres des ISBN en 978', () => {
    expect(isbn10('9782070368228')).toBe('207036822X');
    expect(isbn10('9780306406157')).toBe('0306406152');
    expect(isbn10('9791032305690')).toBeNull();
  });
});

const fixture = (nom: string) => readFileSync(new URL(`./fixtures/${nom}.xml`, import.meta.url), 'utf8');
const BNF_VIDE = '<srw:searchRetrieveResponse><srw:numberOfRecords>0</srw:numberOfRecords></srw:searchRetrieveResponse>';

describe('lireNoticeBnf', () => {
  it('met la série et le tome devant le titre du volume', () => {
    expect(lireNoticeBnf(fixture('bnf-one-piece'))).toMatchObject({
      titre: 'One piece — tome 1 : Romance dawn',
      auteur: 'Eiichirō Oda'
    });
  });
  it('ajoute le sous-titre et le tome quand la série porte le même nom', () => {
    expect(lireNoticeBnf(fixture('bnf-trone-de-fer'))?.titre).toBe("Le trône de fer : l'intégrale — tome 1");
  });
  it('se rabat sur la mention de responsabilité et garde les catégories', () => {
    const n = lireNoticeBnf(fixture('bnf-petit-prince'))!;
    expect(n.titre).toBe('Le petit prince');
    expect(n.auteur).toContain('Saint-Exupéry');
    expect(n.categories).toEqual(expect.arrayContaining(['Romans', 'Folio junior']));
  });
  it('renvoie null pour une réponse sans notice', () => {
    expect(lireNoticeBnf(BNF_VIDE)).toBeNull();
  });
});

const rep = (corps: unknown, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(corps),
    text: () => Promise.resolve(String(corps))
  } as Response);

/** Faux réseau : chaque service renvoie la réponse donnée (ou « inconnu » par défaut). */
const reseau = (r: { ol?: unknown; bnf?: string; gb?: unknown }) =>
  vi.fn().mockImplementation((url: string) =>
    url.includes('openlibrary') ? rep(r.ol ?? {}) : url.includes('bnf.fr') ? rep(r.bnf ?? BNF_VIDE) : rep(r.gb ?? { totalItems: 0 })
  );

describe('rechercherIsbn', () => {
  it('utilise Open Library et traduit les sujets', async () => {
    const f = reseau({ ol: { 'ISBN:9780441013593': { title: 'Dune', authors: [{ name: 'Frank Herbert' }], subjects: [{ name: 'Science fiction' }], cover: { medium: 'https://covers/m.jpg' } } } });
    expect(await rechercherIsbn('9780441013593', f, undefined)).toEqual({
      trouve: true, titre: 'Dune', auteur: 'Frank Herbert', genres: ['Science-fiction'], couvertureUrl: 'https://covers/m.jpg'
    });
  });

  it('interroge Open Library et la BnF avec l’ISBN-13 et l’ISBN-10', async () => {
    const f = reseau({});
    await rechercherIsbn('9782070368228', f, undefined);
    const urls = f.mock.calls.map(([u]) => decodeURIComponent(String(u)));
    expect(urls.find((u) => u.includes('openlibrary'))).toContain('ISBN:9782070368228,ISBN:207036822X');
    expect(urls.find((u) => u.includes('bnf.fr'))).toContain('bib.isbn adj "9782070368228" or bib.isbn adj "207036822X"');
  });

  it('préfère la BnF pour un livre français, garde la couverture d’Open Library et réunit les genres', async () => {
    const f = reseau({
      ol: { 'ISBN:9782723488525': { title: 'One Piece, Tome 1', authors: [{ name: 'Oda' }], subjects: [{ name: 'Comics' }], cover: { medium: 'https://covers/op.jpg' } } },
      bnf: fixture('bnf-one-piece')
    });
    expect(await rechercherIsbn('9782723488525', f, undefined)).toEqual({
      trouve: true,
      titre: 'One piece — tome 1 : Romance dawn',
      auteur: 'Eiichirō Oda',
      genres: ['BD', 'Manga'],
      couvertureUrl: 'https://covers/op.jpg'
    });
  });

  it('trouve un livre inconnu d’Open Library grâce à la BnF, couverture demandée par ISBN', async () => {
    const r = await rechercherIsbn('9782070612758', reseau({ bnf: fixture('bnf-petit-prince') }), undefined);
    expect(r).toMatchObject({
      trouve: true,
      titre: 'Le petit prince',
      genres: ['Roman', 'Jeunesse'],
      couvertureUrl: 'https://covers.openlibrary.org/b/isbn/9782070612758-M.jpg?default=false'
    });
  });

  it('n’appelle pas Google Books sans clé', async () => {
    const f = reseau({});
    await rechercherIsbn('9780306406157', f, undefined);
    expect(f.mock.calls.some(([u]) => String(u).includes('googleapis'))).toBe(false);
  });

  it('utilise Google Books avec la clé, en n’envoyant que l’origine du site', async () => {
    const f = reseau({ gb: { totalItems: 1, items: [{ volumeInfo: { title: 'Dune', authors: ['Frank Herbert'], categories: ['Fiction'], imageLinks: { thumbnail: 'http://books.google/t.jpg' } } }] } });
    expect(await rechercherIsbn('9780441013593', f, 'CLE')).toEqual({
      trouve: true, titre: 'Dune', auteur: 'Frank Herbert', genres: ['Roman'], couvertureUrl: 'https://books.google/t.jpg'
    });
    const appel = f.mock.calls.find(([u]) => String(u).includes('googleapis'))!;
    expect(appel[0]).toContain('key=CLE');
    expect(appel[1]).toEqual({ referrerPolicy: 'strict-origin' });
  });

  it('livre introuvable partout', async () => {
    expect(await rechercherIsbn('9780306406157', reseau({}), 'CLE')).toEqual({ trouve: false });
  });

  it('trouve le livre même si un service est en panne', async () => {
    const f = vi.fn().mockImplementation((url: string) => (url.includes('bnf.fr') ? rep(fixture('bnf-petit-prince')) : Promise.reject(new TypeError('Load failed'))));
    expect(await rechercherIsbn('9782070612758', f, undefined)).toMatchObject({ trouve: true, titre: 'Le petit prince' });
  });

  it('lève ErreurReseau si le réseau ne répond pas', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Load failed'));
    await expect(rechercherIsbn('9780306406157', f, 'CLE')).rejects.toBeInstanceOf(ErreurReseau);
  });

  it('lève ErreurReseau si tous les services sont en erreur serveur', async () => {
    const f = vi.fn().mockImplementation(() => rep({}, false));
    await expect(rechercherIsbn('9780306406157', f, undefined)).rejects.toBeInstanceOf(ErreurReseau);
  });
});
