import { traduireCategories } from './genres';

export class ErreurReseau extends Error {
  constructor(message = 'Pas de réseau') {
    super(message);
    this.name = 'ErreurReseau';
  }
}

export type ResultatIsbn =
  | { trouve: true; titre: string; auteur: string; genres: string[]; couvertureUrl?: string }
  | { trouve: false };

/** Renvoie l'ISBN-13 (chiffres seuls) si le code est un ISBN valide, sinon null. */
export function nettoyerIsbn(brut: string): string | null {
  const s = brut.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(s)) {
    let somme = 0;
    for (let i = 0; i < 10; i++) somme += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i);
    if (somme % 11 !== 0) return null;
    const base = '978' + s.slice(0, 9);
    return base + cle13(base);
  }
  if (/^97[89]\d{10}$/.test(s)) {
    return cle13(s.slice(0, 12)) === s[12] ? s : null;
  }
  return null;
}

function cle13(douze: string): string {
  let somme = 0;
  for (let i = 0; i < 12; i++) somme += Number(douze[i]) * (i % 2 ? 3 : 1);
  return String((10 - (somme % 10)) % 10);
}

type Fetch = (url: string) => Promise<Response>;

interface Partiel {
  titre?: string;
  auteur?: string;
  categories: string[];
  couvertureUrl?: string;
}

const https = (url?: string) => url?.replace(/^http:/, 'https:');

async function openLibrary(isbn: string, f: Fetch): Promise<Partiel | null> {
  const r = await f(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
  if (!r.ok) throw new Error(`Open Library ${r.status}`);
  const d = (await r.json())[`ISBN:${isbn}`];
  if (!d?.title) return null;
  return {
    titre: d.subtitle ? `${d.title} : ${d.subtitle}` : d.title,
    auteur: (d.authors ?? []).map((a: { name: string }) => a.name).join(', '),
    categories: (d.subjects ?? []).map((s: { name: string }) => s.name),
    couvertureUrl: https(d.cover?.medium ?? d.cover?.small)
  };
}

async function googleBooks(isbn: string, f: Fetch): Promise<Partiel | null> {
  const r = await f(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  if (!r.ok) throw new Error(`Google Books ${r.status}`);
  const v = (await r.json()).items?.[0]?.volumeInfo;
  if (!v?.title) return null;
  return {
    titre: v.title,
    auteur: (v.authors ?? []).join(', '),
    categories: v.categories ?? [],
    couvertureUrl: https(v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail)
  };
}

/**
 * Cherche un livre par ISBN. Seul l'ISBN est envoyé : Open Library d'abord,
 * Google Books en secours ou pour compléter genres et couverture.
 */
export async function rechercherIsbn(isbn: string, f: Fetch = (u) => fetch(u)): Promise<ResultatIsbn> {
  const essayer = async (src: (i: string, f: Fetch) => Promise<Partiel | null>) => {
    try {
      return { ok: true as const, val: await src(isbn, f) };
    } catch {
      return { ok: false as const, val: null };
    }
  };

  const ol = await essayer(openLibrary);
  let gb: Awaited<ReturnType<typeof essayer>> | null = null;
  if (!ol.val || !ol.val.categories.length || !ol.val.couvertureUrl) gb = await essayer(googleBooks);

  if (!ol.val && !gb?.val) {
    if (!ol.ok && (!gb || !gb.ok)) throw new ErreurReseau();
    return { trouve: false };
  }
  const p = ol.val ?? gb!.val!;
  const genres = traduireCategories(p.categories);
  return {
    trouve: true,
    titre: p.titre!,
    auteur: p.auteur || gb?.val?.auteur || '',
    genres: genres.length ? genres : traduireCategories(gb?.val?.categories ?? []),
    couvertureUrl: p.couvertureUrl ?? gb?.val?.couvertureUrl
  };
}
