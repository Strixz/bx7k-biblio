import { db } from './db';
import type { Livre } from './types';

export const FORMAT = 'biblio-scan';
export const VERSION = 1;

export class ErreurSauvegarde extends Error {}

interface CouvertureExportee {
  type: string;
  base64: string;
}

type LivreExporte = Omit<Livre, 'couverture'> & { couverture?: CouvertureExportee };

async function versBase64(b: Blob): Promise<CouvertureExportee> {
  const octets = new Uint8Array(await b.arrayBuffer());
  let bin = '';
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return { type: b.type, base64: btoa(bin) };
}

function depuisBase64(c: CouvertureExportee): Blob {
  const bin = atob(c.base64);
  const octets = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
  return new Blob([octets], { type: c.type });
}

/** Toute la bibliothèque (réglages compris) en JSON, couvertures en base64. */
export async function exporterDonnees(): Promise<string> {
  const livres: LivreExporte[] = [];
  for (const l of await db.livres.toArray()) {
    const { couverture, ...reste } = l;
    livres.push(couverture ? { ...reste, couverture: await versBase64(couverture) } : reste);
  }
  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    date: new Date().toISOString(),
    megas: await db.megas.toArray(),
    biblios: await db.biblios.toArray(),
    etageres: await db.etageres.toArray(),
    livres,
    reglages: (await db.reglages.toArray()).filter((r) => r.cle !== 'derniereSauvegarde')
  });
}

/** Remplace toute la bibliothèque par le contenu de la sauvegarde. */
export async function importerDonnees(json: string): Promise<{ livres: number }> {
  let d;
  try {
    d = JSON.parse(json);
  } catch {
    throw new ErreurSauvegarde("Ce fichier n'est pas une sauvegarde Biblio-Scan.");
  }
  if (d?.format !== FORMAT || !Array.isArray(d.livres) || !Array.isArray(d.megas)) {
    throw new ErreurSauvegarde("Ce fichier n'est pas une sauvegarde Biblio-Scan.");
  }
  if (d.version > VERSION) {
    throw new ErreurSauvegarde('Cette sauvegarde vient d’une version plus récente de l’application. Mettez l’application à jour.');
  }
  const livres: Livre[] = (d.livres as LivreExporte[]).map(({ couverture, ...l }) =>
    couverture ? { ...l, couverture: depuisBase64(couverture) } : l
  );
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.filter((t) => t.name !== 'reglages').map((t) => t.clear()));
    await db.megas.bulkAdd(d.megas);
    await db.biblios.bulkAdd(d.biblios ?? []);
    await db.etageres.bulkAdd(d.etageres ?? []);
    await db.livres.bulkAdd(livres);
    if (Array.isArray(d.reglages)) await db.reglages.bulkPut(d.reglages);
  });
  return { livres: livres.length };
}
