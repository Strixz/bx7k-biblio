/** Aide courte de chaque page (bouton « ? »). Phrases simples, sans jargon. */
export const AIDES: Record<string, { titre: string; points: string[] }> = {
  accueil: {
    titre: 'Vos lieux',
    points: [
      'Un lieu, c’est une maison ou un appartement (par exemple « Maison principale »).',
      'Touchez « Nouveau lieu » pour en créer un.',
      'Touchez un lieu pour voir ses bibliothèques.'
    ]
  },
  mega: {
    titre: 'Les bibliothèques de ce lieu',
    points: [
      'Une bibliothèque, c’est un meuble ou une pièce où vous rangez des livres (par exemple « Salon gauche »).',
      'Touchez « Nouvelle bibliothèque » pour en ajouter une.',
      'Touchez une bibliothèque pour voir ses étagères et ses livres.'
    ]
  },
  forme: {
    titre: 'Décrire le meuble',
    points: [
      'Donnez un nom au meuble, puis choisissez la forme qui lui ressemble le plus.',
      'Indiquez le nombre d’étagères (ou de cases, ou de piles) avec les boutons − et +.',
      'Si aucune forme ne convient, créez une bibliothèque pour chaque partie du meuble.'
    ]
  },
  biblio: {
    titre: 'Une bibliothèque',
    points: [
      'Touchez le nom d’une étagère pour l’ouvrir ou la fermer.',
      'Les livres sont dans l’ordre de l’étagère, de gauche à droite.',
      'Pour déplacer un livre : posez le doigt sur ⋮⋮, gardez-le appuyé et faites glisser.',
      'Pour le mettre sur une autre étagère : faites-le glisser sur le nom de cette étagère.',
      'Touchez un livre pour voir sa fiche.'
    ]
  },
  livre: {
    titre: 'La fiche du livre',
    points: [
      'Vous pouvez corriger le titre, l’auteur et ajouter des genres.',
      'Choisissez où en est le livre : rangé, en cours de lecture ou prêté.',
      'La note sert à écrire ce que vous voulez (édition, dédicace, état…).',
      'N’oubliez pas de toucher « Enregistrer ».'
    ]
  },
  ajouter: {
    titre: 'Ajouter un livre',
    points: [
      'Visez le code-barres au dos du livre avec l’appareil photo.',
      'Le livre est reconnu tout seul. Vérifiez puis choisissez où il est rangé.',
      'Pas de code-barres ? Touchez « Saisir à la main ».',
      'Sans internet, le livre est gardé et complété plus tard automatiquement.'
    ]
  },
  serie: {
    titre: 'Scanner une étagère',
    points: [
      'Choisissez l’étagère, puis scannez les livres un par un, de gauche à droite.',
      'Chaque livre est ajouté tout de suite à la suite des autres.',
      'Une erreur ? Touchez « Annuler le dernier ».',
      'Quand vous avez fini, touchez « J’ai fini ».'
    ]
  },
  recherche: {
    titre: 'Retrouver un livre',
    points: [
      'Tapez un titre, un auteur ou un genre : pas besoin d’accents ni de majuscules.',
      'Sous chaque livre, vous voyez où il est rangé.',
      'Les boutons en dessous permettent de voir par exemple tous les livres prêtés.'
    ]
  },
  options: {
    titre: 'Les options',
    points: [
      'Choisissez les couleurs de l’application et le mode sombre.',
      'Pensez à faire une sauvegarde de temps en temps : elle protège votre bibliothèque si le téléphone a un souci.',
      'La sauvegarde est un fichier que vous rangez où vous voulez (par exemple dans iCloud Drive).'
    ]
  }
};
