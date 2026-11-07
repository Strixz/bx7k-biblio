import { afterEach, describe, expect, it, vi } from 'vitest';
import { choisirEtLire, lireAvecReessais } from '../src/lib/ouvrirFichier';

const illisible = () => Object.assign(new Error('illisible'), { name: 'NotReadableError' });

/** Un fichier de Drive : illisible tant qu'il n'est pas arrivé, lisible ensuite. */
function poigneeDrive(echecs: number, contenu = '{"ok":1}') {
  let appels = 0;
  return {
    getFile: vi.fn(async () => {
      appels++;
      const f = new File([contenu], 'biblio.txt');
      if (appels <= echecs) return Object.assign(f, { text: () => Promise.reject(illisible()) });
      return f;
    })
  };
}

afterEach(() => {
  delete (globalThis as { showOpenFilePicker?: unknown }).showOpenFilePicker;
});

describe('lireAvecReessais', () => {
  it('relit un fichier de Drive jusqu’à ce qu’il soit arrivé', async () => {
    const p = poigneeDrive(2);
    expect(await lireAvecReessais(p, 6, 1)).toBe('{"ok":1}');
    expect(p.getFile).toHaveBeenCalledTimes(3);
  });

  it('abandonne après le nombre d’essais', async () => {
    const p = poigneeDrive(99);
    await expect(lireAvecReessais(p, 3, 1)).rejects.toMatchObject({ name: 'NotReadableError' });
    expect(p.getFile).toHaveBeenCalledTimes(3);
  });

  it('ne réessaie pas pour une autre erreur', async () => {
    const p = { getFile: vi.fn(() => Promise.reject(Object.assign(new Error(), { name: 'SecurityError' }))) };
    await expect(lireAvecReessais(p, 6, 1)).rejects.toMatchObject({ name: 'SecurityError' });
    expect(p.getFile).toHaveBeenCalledTimes(1);
  });
});

describe('choisirEtLire', () => {
  it('passe au sélecteur classique si le navigateur n’a pas showOpenFilePicker', async () => {
    expect(await choisirEtLire()).toBe('selecteur-classique');
  });

  it('renvoie null si l’utilisateur annule', async () => {
    Object.assign(globalThis, { showOpenFilePicker: () => Promise.reject(Object.assign(new Error(), { name: 'AbortError' })) });
    expect(await choisirEtLire()).toBeNull();
  });

  it('lit le fichier choisi', async () => {
    Object.assign(globalThis, { showOpenFilePicker: async () => [poigneeDrive(0, 'sauvegarde')] });
    expect(await choisirEtLire()).toBe('sauvegarde');
  });
});
