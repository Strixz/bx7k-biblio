import { exporterDonnees } from './sauvegarde';

/** Le fichier de sauvegarde, prêt à être partagé ou téléchargé. */
export async function preparerSauvegarde(): Promise<File> {
  const json = await exporterDonnees();
  const nom = `biblio-scan-${new Date().toISOString().slice(0, 10)}.json`;
  return new File([json], nom, { type: 'application/json' });
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
  const url = URL.createObjectURL(fichier);
  const a = Object.assign(document.createElement('a'), { href: url, download: fichier.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'fait';
}
