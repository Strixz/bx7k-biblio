import { exporterDonnees } from './sauvegarde';

/**
 * Ouvre la feuille de partage d'iOS avec le fichier de sauvegarde (« Enregistrer dans Fichiers »).
 * Repli : téléchargement. Renvoie false si l'utilisateur a annulé.
 */
export async function partagerSauvegarde(): Promise<boolean> {
  const json = await exporterDonnees();
  const nom = `biblio-scan-${new Date().toISOString().slice(0, 10)}.json`;
  const fichier = new File([json], nom, { type: 'application/json' });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: 'Sauvegarde Biblio-Scan' });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
      throw e;
    }
  }
  const url = URL.createObjectURL(fichier);
  const a = Object.assign(document.createElement('a'), { href: url, download: nom });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
