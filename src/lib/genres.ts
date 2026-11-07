import { normaliser } from './recherche';

export const GENRES_BASE = [
  'Roman', 'Policier', 'Thriller', 'Science-fiction', 'Fantasy', 'Horreur', 'Romance', 'Jeunesse', 'BD',
  'Histoire', 'Biographie', 'Cuisine', 'Art', 'Voyage', 'Essai', 'Poésie', 'Théâtre', 'Philosophie',
  'Sciences', 'Humour', 'Développement personnel', 'Religion', 'Nature', 'Sport'
];

/** Mots-clés (anglais ou français, normalisés) → genre français. Le premier qui correspond gagne. */
const CORRESPONDANCES: [string[], string][] = [
  [['science fiction', 'science-fiction', 'sci-fi'], 'Science-fiction'],
  [['fantasy', 'fantastique'], 'Fantasy'],
  [['detective', 'mystery', 'crime', 'policier', 'polar'], 'Policier'],
  [['thriller', 'suspense'], 'Thriller'],
  [['horror', 'horreur'], 'Horreur'],
  [['romance', 'love stories'], 'Romance'],
  [['juvenile', 'young adult', 'children', 'jeunesse'], 'Jeunesse'],
  [['comics', 'graphic novel', 'bandes dessinees', 'bande dessinee', 'manga'], 'BD'],
  [['biography', 'autobiography', 'biographie', 'memoir'], 'Biographie'],
  [['history', 'histoire'], 'Histoire'],
  [['cooking', 'cookery', 'cuisine', 'recipes'], 'Cuisine'],
  [['travel', 'voyage'], 'Voyage'],
  [['poetry', 'poesie', 'poems'], 'Poésie'],
  [['drama', 'theatre', 'plays'], 'Théâtre'],
  [['philosophy', 'philosophie'], 'Philosophie'],
  [['humor', 'humour'], 'Humour'],
  [['self-help', 'personal development', 'developpement personnel'], 'Développement personnel'],
  [['religion', 'spirituality', 'bible'], 'Religion'],
  [['nature', 'gardening', 'jardinage'], 'Nature'],
  [['sports', 'sport'], 'Sport'],
  [['art', 'arts', 'photography', 'architecture', 'music'], 'Art'],
  [['science', 'mathematics', 'sciences'], 'Sciences'],
  [['essays', 'essai', 'political science', 'social science'], 'Essai']
];

const contientMot = (texte: string, cle: string) =>
  new RegExp(`(^|[^a-z])${cle.replace(/[-]/g, '\\-')}([^a-z]|$)`).test(texte);

/** Traduit les catégories des API (souvent en anglais) en genres français connus. */
export function traduireCategories(categories: string[]): string[] {
  const res = new Set<string>();
  let fiction = false;
  for (const brut of categories) {
    const c = normaliser(brut);
    const trouve = CORRESPONDANCES.find(([cles]) => cles.some((k) => contientMot(c, k)));
    if (trouve) res.add(trouve[1]);
    else if (contientMot(c, 'fiction') || contientMot(c, 'roman')) fiction = true;
  }
  if (fiction && res.size === 0) res.add('Roman');
  return [...res];
}
