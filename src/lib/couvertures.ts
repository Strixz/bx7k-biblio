const LARGEUR = 200;

/** Télécharge une couverture une seule fois et la réduit en miniature JPEG (~10 Ko). */
export async function telechargerMiniature(url: string): Promise<Blob | undefined> {
  try {
    const r = await fetch(url, { referrerPolicy: 'no-referrer' });
    if (!r.ok) return undefined;
    const source = await r.blob();
    const img = await createImageBitmap(source);
    // Open Library renvoie une image 1×1 quand il n'a pas de couverture.
    if (img.width < 10) return undefined;
    const h = Math.round((img.height * LARGEUR) / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(LARGEUR, img.width);
    canvas.height = img.width < LARGEUR ? img.height : h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | undefined>((ok) => canvas.toBlob((b) => ok(b ?? undefined), 'image/jpeg', 0.75));
  } catch {
    return undefined;
  }
}
