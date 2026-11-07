import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/lib/db';
import * as d from '../src/lib/depot';
import { chercherInfos, completerEnAttente, titreProvisoire } from '../src/lib/infos';
import { ErreurReseau } from '../src/lib/isbn';

const trouve = { trouve: true as const, titre: 'Dune', auteur: 'Frank Herbert', genres: ['Science-fiction'], couvertureUrl: 'https://c/d.jpg' };
const image = new Blob(['jpg'], { type: 'image/jpeg' });

describe('chercherInfos', () => {
  it('livre trouvé : infos complètes et miniature', async () => {
    const r = await chercherInfos('9780441013593', { recherche: async () => trouve, miniature: async () => image });
    expect(r).toEqual({ infos: 'completes', titre: 'Dune', auteur: 'Frank Herbert', genres: ['Science-fiction'], couverture: image });
  });
  it('pas de réseau : état « en attente » et titre provisoire', async () => {
    const r = await chercherInfos('9780441013593', { recherche: () => Promise.reject(new ErreurReseau()), miniature: async () => image });
    expect(r).toEqual({ infos: 'en-attente-reseau', titre: titreProvisoire('9780441013593'), auteur: '', genres: [] });
  });
  it('ISBN inconnu : état « introuvable »', async () => {
    const r = await chercherInfos('9780441013593', { recherche: async () => ({ trouve: false }), miniature: async () => image });
    expect(r.infos).toBe('introuvable');
  });
});

describe('completerEnAttente', () => {
  let etagereId: number;
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    const m = await d.creerMega('M');
    const b = await d.creerBibliotheque(m, 'B', { type: 'classique', etageres: 1 });
    etagereId = (await d.listerEtageres(b))[0].id!;
  });

  const enAttente = (isbn: string, extra = {}) =>
    d.ajouterLivre({ etagereId, isbn, titre: titreProvisoire(isbn), auteur: '', genres: [], statut: 'range', note: 'ma note', infos: 'en-attente-reseau', ...extra });

  it('complète les livres en attente sans écraser ce que l’utilisateur a saisi', async () => {
    const a = await enAttente('9780441013593');
    const b = await enAttente('9780306406157', { titre: 'Mon titre', genres: ['Roman'] });
    const n = await completerEnAttente({ recherche: async () => trouve, miniature: async () => image });
    expect(n).toBe(2);
    expect(await db.livres.get(a)).toMatchObject({ titre: 'Dune', auteur: 'Frank Herbert', genres: ['Science-fiction'], infos: 'completes', note: 'ma note' });
    expect(await db.livres.get(b)).toMatchObject({ titre: 'Mon titre', genres: ['Roman', 'Science-fiction'], infos: 'completes' });
  });

  it('marque introuvable un ISBN inconnu', async () => {
    const a = await enAttente('9780441013593');
    await completerEnAttente({ recherche: async () => ({ trouve: false }), miniature: async () => undefined });
    expect((await db.livres.get(a))!.infos).toBe('introuvable');
  });

  it('s’arrête et ne change rien si le réseau est toujours absent', async () => {
    const a = await enAttente('9780441013593');
    const recherche = vi.fn().mockRejectedValue(new ErreurReseau());
    await enAttente('9780306406157');
    expect(await completerEnAttente({ recherche, miniature: async () => undefined })).toBe(0);
    expect(recherche).toHaveBeenCalledTimes(1);
    expect((await db.livres.get(a))!.infos).toBe('en-attente-reseau');
  });
});
