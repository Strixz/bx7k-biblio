import { traduireCategories } from './genres';
import { normaliser } from './recherche';

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

/** ISBN-10 équivalent d'un ISBN-13 en 978 (les vieux livres ne sont catalogués que sous cette forme). */
export function isbn10(isbn13: string): string | null {
  if (!isbn13.startsWith('978')) return null;
  const neuf = isbn13.slice(3, 12);
  let somme = 0;
  for (let i = 0; i < 9; i++) somme += Number(neuf[i]) * (10 - i);
  const cle = (11 - (somme % 11)) % 11;
  return neuf + (cle === 10 ? 'X' : String(cle));
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

interface Partiel {
  titre?: string;
  auteur?: string;
  categories: string[];
  couvertureUrl?: string;
}

const https = (url?: string) => url?.replace(/^http:/, 'https:');

async function openLibrary(isbn: string, f: Fetch): Promise<Partiel | null> {
  const cles = [isbn, isbn10(isbn)].filter(Boolean).map((i) => `ISBN:${i}`);
  const r = await f(`https://openlibrary.org/api/books?bibkeys=${cles.join(',')}&jscmd=data&format=json`);
  if (!r.ok) throw new Error(`Open Library ${r.status}`);
  const json = await r.json();
  const d = cles.map((c) => json[c]).find((x) => x?.title);
  if (!d) return null;
  return {
    titre: d.subtitle ? `${d.title} : ${d.subtitle}` : d.title,
    auteur: (d.authors ?? []).map((a: { name: string }) => a.name).join(', '),
    categories: (d.subjects ?? []).map((s: { name: string }) => s.name),
    couvertureUrl: https(d.cover?.medium ?? d.cover?.small)
  };
}

async function googleBooks(isbn: string, f: Fetch, cle: string): Promise<Partiel | null> {
  // La clé est limitée au site : le navigateur doit envoyer l'origine (sans chemin ni donnée).
  const r = await f(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${encodeURIComponent(cle)}`, {
    referrerPolicy: 'strict-origin'
  });
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

const ENTITES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decoder = (t: string) =>
  t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, e) => ENTITES[e] ?? m)
    .trim();

type SousChamps = Record<string, string[]>;

/** Zones UNIMARC de la première notice d'une réponse SRU de la BnF : tag → liste de sous-champs. */
function zonesUnimarc(xml: string): Map<string, SousChamps[]> {
  const notice = xml.split(/<srw:record>/)[1] ?? '';
  const zones = new Map<string, SousChamps[]>();
  for (const [, tag, corps] of notice.matchAll(/<mxc:datafield[^>]*tag="(\d{3})"[^>]*>([\s\S]*?)<\/mxc:datafield>/g)) {
    const sc: SousChamps = {};
    for (const [, code, val] of corps.matchAll(/<mxc:subfield code="(\w)">([\s\S]*?)<\/mxc:subfield>/g)) {
      (sc[code] ??= []).push(decoder(val));
    }
    zones.set(tag, [...(zones.get(tag) ?? []), sc]);
  }
  return zones;
}

const numeroTome = (v?: string) => v?.replace(/^(tome|t\.|vol\.?|volume)\s*/i, '').trim();

/** Lit une notice BnF (UNIMARC) : « One piece — tome 1 : Romance dawn ». Exportée pour les tests. */
export function lireNoticeBnf(xml: string): Partiel | null {
  const z = zonesUnimarc(xml);
  const t = z.get('200')?.[0];
  const base = t?.a?.[0];
  if (!base) return null;
  const serie = z.get('461')?.find((s) => s.t?.[0]);
  const memeSerie = serie && normaliser(serie.t![0]) === normaliser(base);
  const tome = numeroTome(t.h?.[0] ?? serie?.v?.[0]);
  let titre: string;
  if (serie && !memeSerie) {
    titre = `${serie.t![0]}${tome ? ` — tome ${tome}` : ''} : ${base}`;
  } else {
    titre = base + (t.e?.[0] ? ` : ${t.e[0]}` : '') + (tome ? ` — tome ${tome}` : '');
  }

  // Auteurs (070) et illustrateurs (440) ; à défaut, la mention de responsabilité.
  const personnes = ['700', '701']
    .flatMap((tag) => z.get(tag) ?? [])
    .filter((p) => p.a?.[0] && (!p['4'] || p['4'].some((r) => r === '070' || r === '440')))
    .map((p) => [p.b?.[0], p.a![0]].filter(Boolean).join(' '));
  const auteur = personnes.length ? personnes.join(', ') : (t.f?.[0] ?? '');

  const categories = [
    ...['606', '608'].flatMap((tag) => (z.get(tag) ?? []).flatMap((s) => s.a ?? [])),
    ...(z.get('225') ?? []).flatMap((s) => s.a ?? [])
  ];
  return { titre, auteur, categories };
}

async function bnf(isbn: string, f: Fetch): Promise<Partiel | null> {
  const requete = [isbn, isbn10(isbn)]
    .filter(Boolean)
    .map((i) => `bib.isbn adj "${i}"`)
    .join(' or ');
  const r = await f(
    `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&recordSchema=unimarcXchange&maximumRecords=1&query=${encodeURIComponent(requete)}`
  );
  if (!r.ok) throw new Error(`BnF ${r.status}`);
  return lireNoticeBnf(await r.text());
}

const estFrancais = (isbn: string) => isbn.startsWith('9782') || isbn.startsWith('97910');

/**
 * Cherche un livre par ISBN. Seul l'ISBN est envoyé : Open Library et la BnF en parallèle,
 * plus Google Books si une clé est configurée (sans clé, son quota partagé est toujours épuisé).
 */
export async function rechercherIsbn(
  isbn: string,
  f: Fetch = (u, i) => fetch(u, i),
  cleGoogle: string | undefined = import.meta.env.VITE_GOOGLE_BOOKS_CLE
): Promise<ResultatIsbn> {
  const essayer = async (src: () => Promise<Partiel | null>) => {
    try {
      return { ok: true, val: await src() };
    } catch {
      return { ok: false, val: null };
    }
  };

  const sources = await Promise.all([
    essayer(() => openLibrary(isbn, f)),
    essayer(() => bnf(isbn, f)),
    ...(cleGoogle ? [essayer(() => googleBooks(isbn, f, cleGoogle))] : [])
  ]);
  const [ol, bn, gb] = sources.map((s) => s.val);
  if (!ol && !bn && !gb) {
    if (sources.every((s) => !s.ok)) throw new ErreurReseau();
    return { trouve: false };
  }

  // La BnF a les titres les plus fiables pour les livres français (séries, tomes).
  const ordre = (estFrancais(isbn) ? [bn, ol, gb] : [ol, gb, bn]).filter((p): p is Partiel => !!p);
  const premier = <K extends keyof Partiel>(k: K) => ordre.map((p) => p[k]).find((v) => v && v.length);
  // Genres de la source la plus fiable qui en donne : les cumuler en produit trop.
  const genres = ordre.map((p) => traduireCategories(p.categories)).find((g) => g.length) ?? [];
  return {
    trouve: true,
    titre: premier('titre') as string,
    auteur: (premier('auteur') as string | undefined) ?? '',
    genres: genres.slice(0, 3),
    couvertureUrl:
      (premier('couvertureUrl') as string | undefined) ?? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`
  };
}
