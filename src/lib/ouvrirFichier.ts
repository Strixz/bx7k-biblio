/**
 * Choix et lecture d'un fichier de sauvegarde, d'où qu'il vienne (stockage interne, Google Drive, Proton Drive…).
 *
 * Avec un simple <input type="file">, Chrome sur Android note la date du fichier au moment du choix.
 * Un fichier venant d'un Drive est téléchargé juste après : sa date change et Chrome refuse alors
 * de le lire (NotReadableError). Le sélecteur `showOpenFilePicker` donne un accès au fichier
 * qu'on peut relire : on redemande le fichier jusqu'à ce que le Drive ait fini de le livrer.
 */

interface PoigneeFichier {
  getFile(): Promise<File>;
}
type Selecteur = (options?: { multiple?: boolean }) => Promise<PoigneeFichier[]>;

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lit le fichier ; s'il est encore en cours d'arrivée, réessaie avec une copie à jour. */
export async function lireAvecReessais(poignee: PoigneeFichier, essais = 6, pause = 500): Promise<string> {
  for (let i = 1; ; i++) {
    try {
      return await (await poignee.getFile()).text();
    } catch (e) {
      if (i >= essais || (e as Error)?.name !== 'NotReadableError') throw e;
      await attendre(pause * i);
    }
  }
}

/**
 * À appeler directement depuis l'appui sur le bouton. Renvoie le texte du fichier, `null` si
 * l'utilisateur a annulé, ou `'selecteur-classique'` si le navigateur n'a pas ce sélecteur
 * (iPhone, Firefox…) : il faut alors passer par le <input type="file">.
 */
export async function choisirEtLire(): Promise<string | null | 'selecteur-classique'> {
  const choisir = (globalThis as { showOpenFilePicker?: Selecteur }).showOpenFilePicker;
  if (!choisir) return 'selecteur-classique';
  let poignee: PoigneeFichier;
  try {
    // Aucun filtre de type : certains Drive annoncent un type inattendu et le fichier serait masqué.
    [poignee] = await choisir({ multiple: false });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return null;
    return 'selecteur-classique';
  }
  if (!poignee) return null;
  return lireAvecReessais(poignee);
}
