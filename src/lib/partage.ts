import { estAndroid } from './appareil.svelte';
import { exporterDonnees } from './sauvegarde';

/**
 * Le fichier de sauvegarde, prêt à être partagé ou téléchargé. Chrome sur Android refuse
 * de partager un fichier .json (types autorisés : images, vidéos, texte…) : on l'y nomme en .txt,
 * le contenu reste le même et la restauration accepte les deux.
 */
export async function preparerSauvegarde(): Promise<File> {
  const json = await exporterDonnees();
  const nom = `biblio-scan-${new Date().toISOString().slice(0, 10)}`;
  return estAndroid
    ? new File([json], `${nom}.txt`, { type: 'text/plain' })
    : new File([json], `${nom}.json`, { type: 'application/json' });
}

export type ResultatPartage = 'fait' | 'annule' | 'geste-requis';

/**
 * Ouvre la feuille de partage du téléphone avec le fichier (« Enregistrer dans Fichiers », Drive…).
 * Repli : téléchargement. Le téléphone refuse le partage (« geste-requis ») quand la préparation
 * a pris trop de temps après l'appui : il faut alors le relancer depuis un nouvel appui.
 */
export async function partagerFichier(fichier: File): Promise<ResultatPartage> {
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: 'Sauvegarde Biblio-Scan' });
      return 'fait';
    } catch (e) {
      const nom = (e as Error).name;
      if (nom === 'AbortError') return 'annule';
      if (nom === 'NotAllowedError') return 'geste-requis';
      // Partage impossible pour une autre raison : on télécharge le fichier à la place.
    }
  }
  telechargerFichier(fichier);
  return 'fait';
}

/** Enregistre le fichier dans les Téléchargements du téléphone. */
export function telechargerFichier(fichier: File) {
  const url = URL.createObjectURL(fichier);
  const a = Object.assign(document.createElement('a'), { href: url, download: fichier.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
