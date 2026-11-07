import { registerSW } from 'virtual:pwa-register';

/** Nouvelle version téléchargée en arrière-plan, en attente d'être appliquée. */
export const miseAJour = $state({ disponible: false });

const appliquer = registerSW({
  immediate: true,
  onNeedRefresh: () => (miseAJour.disponible = true),
  onRegisteredSW(_url, enregistrement) {
    // L'application installée reste souvent ouverte des jours : on revérifie à chaque retour dessus.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') enregistrement?.update().catch(() => {});
    });
  }
});

/** Recharge l'application sur la nouvelle version (les données ne sont pas touchées). */
export const mettreAJour = () => appliquer(true);
