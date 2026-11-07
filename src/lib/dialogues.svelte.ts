export interface Dialogue {
  titre: string;
  message?: string;
  /** Présent : affiche un champ de saisie avec cette valeur initiale. */
  saisie?: string;
  placeholder?: string;
  ok: string;
  annuler?: string;
  danger?: boolean;
  resoudre: (v: string | boolean | null) => void;
}

export const dialogues = $state({ courant: null as Dialogue | null, toast: '' });

function ouvrir(d: Omit<Dialogue, 'resoudre'>) {
  return new Promise<string | boolean | null>((resoudre) => {
    dialogues.courant = { ...d, resoudre };
  });
}

export const confirmer = (titre: string, message: string, ok = 'Oui', danger = false) =>
  ouvrir({ titre, message, ok, annuler: 'Annuler', danger }).then((v) => v === true);

export const demander = (titre: string, valeur = '', placeholder = '', ok = 'Valider') =>
  ouvrir({ titre, saisie: valeur, placeholder, ok, annuler: 'Annuler' }).then((v) =>
    typeof v === 'string' && v.trim() ? v.trim() : null
  );

export const informer = (titre: string, message: string) => ouvrir({ titre, message, ok: 'D’accord' }).then(() => {});

let minuteur: ReturnType<typeof setTimeout>;
export function toast(texte: string) {
  dialogues.toast = texte;
  clearTimeout(minuteur);
  minuteur = setTimeout(() => (dialogues.toast = ''), 2500);
}
