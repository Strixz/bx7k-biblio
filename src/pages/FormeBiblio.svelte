<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../lib/db';
  import { changerForme, creerBibliotheque, etageresSupprimeesAvecLivres, renommerBibliotheque } from '../lib/depot';
  import { genererEtageres, MAX_PAR_DIMENSION } from '../lib/formes';
  import { informer } from '../lib/dialogues.svelte';
  import { aller } from '../lib/routeur.svelte';
  import type { Etagere, Forme } from '../lib/types';
  import EnTete from '../components/EnTete.svelte';

  /** Création (megaId) ou modification (biblioId) d'une bibliothèque. */
  let { megaId, biblioId }: { megaId?: number; biblioId?: number } = $props();

  type Type = Forme['type'];
  let nom = $state('');
  let type = $state<Type>('classique');
  let n = $state(4); // étagères ou piles
  let lignes = $state(4);
  let colonnes = $state(4);
  let lieu = $state('');
  let lieuId = $state(0);
  let aRedistribuer: Etagere[] = $state([]);
  let cible = $state('');

  const TYPES: { type: Type; titre: string; texte: string; dessin: string }[] = [
    { type: 'classique', titre: 'Étagères', texte: 'Des étagères les unes au-dessus des autres', dessin: '▤' },
    { type: 'cases', titre: 'Meuble à cases', texte: 'Des cases en lignes et en colonnes', dessin: '▦' },
    { type: 'double', titre: 'Double rangée', texte: 'Des livres devant et d’autres derrière', dessin: '⧉' },
    { type: 'piles', titre: 'Piles', texte: 'Des livres couchés les uns sur les autres', dessin: '☰' }
  ];

  onMount(async () => {
    if (biblioId) {
      const b = await db.biblios.get(biblioId);
      if (!b) return aller({ page: 'accueil' }, true);
      nom = b.nom;
      type = b.forme.type;
      if (b.forme.type === 'cases') ({ lignes, colonnes } = b.forme);
      else n = b.forme.type === 'piles' ? b.forme.piles : b.forme.etageres;
      lieuId = b.megaId;
    } else lieuId = megaId!;
    lieu = (await db.megas.get(lieuId))?.nom ?? '';
  });

  const forme: Forme = $derived(
    type === 'cases' ? { type, lignes, colonnes } : type === 'piles' ? { type, piles: n } : { type, etageres: n }
  );
  const cibles = $derived(genererEtageres(forme));

  $effect(() => {
    if (biblioId) etageresSupprimeesAvecLivres(biblioId, forme).then((r) => (aRedistribuer = r));
  });
  $effect(() => {
    if (!cibles.some((c) => c.cle === cible)) cible = cibles.at(-1)?.cle ?? '';
  });

  const libelleN = $derived(type === 'piles' ? 'Nombre de piles' : 'Nombre d’étagères');

  async function valider(e: Event) {
    e.preventDefault();
    if (!nom.trim()) return informer('Il manque le nom', 'Donnez un nom à cette bibliothèque, par exemple « Salon gauche ».');
    if (biblioId) {
      await renommerBibliotheque(biblioId, nom);
      await changerForme(biblioId, forme, aRedistribuer.length ? cible : undefined);
      aller({ page: 'biblio', id: biblioId }, true);
    } else {
      aller({ page: 'biblio', id: await creerBibliotheque(megaId!, nom, forme) }, true);
    }
  }
</script>

{#snippet compteur(label: string, valeur: number, changer: (v: number) => void)}
  <div class="compteur">
    <span>{label}</span>
    <div class="boutons">
      <button type="button" onclick={() => changer(Math.max(1, valeur - 1))} aria-label={`${label} : moins`} disabled={valeur <= 1}>−</button>
      <output aria-live="polite">{valeur}</output>
      <button type="button" onclick={() => changer(Math.min(MAX_PAR_DIMENSION, valeur + 1))} aria-label={`${label} : plus`} disabled={valeur >= MAX_PAR_DIMENSION}>+</button>
    </div>
  </div>
{/snippet}

<EnTete
  titre={biblioId ? 'Modifier la bibliothèque' : 'Nouvelle bibliothèque'}
  chemin={lieu ? [{ nom: lieu, href: `#/mega/${lieuId}` }] : []}
  aide="forme"
  retour={biblioId ? `#/biblio/${biblioId}` : `#/mega/${megaId}`}
/>

<main>
  <form onsubmit={valider}>
    <label class="champ">
      <span>Nom</span>
      <input type="text" bind:value={nom} placeholder="Par exemple : Salon gauche" />
    </label>

    <fieldset>
      <legend>À quoi ressemble ce meuble ?</legend>
      <div class="types">
        {#each TYPES as t (t.type)}
          <label class="carte type" class:choisi={type === t.type} class:bloque={biblioId && type !== t.type}>
            <input type="radio" name="type" value={t.type} bind:group={type} disabled={!!biblioId && type !== t.type} class="sr" />
            <span class="dessin" aria-hidden="true">{t.dessin}</span>
            <strong>{t.titre}</strong>
            <span class="doux">{t.texte}</span>
          </label>
        {/each}
      </div>
      <p class="astuce doux">
        Votre meuble ne ressemble à aucune de ces formes ? Créez une bibliothèque pour chaque partie du meuble (par exemple
        « Salon gauche – partie haute »).
      </p>
    </fieldset>

    <div class="carte reglage">
      {#if type === 'cases'}
        {@render compteur('Lignes', lignes, (v) => (lignes = v))}
        {@render compteur('Colonnes', colonnes, (v) => (colonnes = v))}
      {:else}
        {@render compteur(libelleN, n, (v) => (n = v))}
      {/if}
      <p class="doux apercu">Cela fera {cibles.length} emplacement{cibles.length > 1 ? 's' : ''} : {cibles.slice(0, 3).map((c) => c.nom).join(', ')}{cibles.length > 3 ? '…' : ''}</p>
    </div>

    {#if aRedistribuer.length}
      <div class="bandeau avertissement">
        <div class="principal">
          <strong>Des livres sont sur {aRedistribuer.map((e) => `« ${e.nom} »`).join(', ')}</strong>
          <label class="champ">
            <span>Où faut-il les ranger ?</span>
            <select bind:value={cible}>
              {#each cibles as c (c.cle)}<option value={c.cle}>{c.nom}</option>{/each}
            </select>
          </label>
        </div>
      </div>
    {/if}

    <button class="btn large" type="submit">{biblioId ? 'Enregistrer' : 'Créer la bibliothèque'}</button>
  </form>
</main>

<style>
  fieldset {
    border: none;
    padding: 0;
    margin: 8px 0 0;
  }
  legend {
    font-weight: 600;
    margin-bottom: 8px;
  }
  .types {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .type {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px;
    cursor: pointer;
    border-width: 2px;
  }
  .type.choisi {
    border-color: var(--ac);
    background: color-mix(in srgb, var(--ac) 8%, var(--su));
  }
  .type.bloque {
    opacity: 0.45;
  }
  .type:has(:focus-visible) {
    outline: 3px solid color-mix(in srgb, var(--ac) 60%, transparent);
  }
  .dessin {
    font-size: 2rem;
    color: var(--ac);
    line-height: 1;
    margin-bottom: 4px;
  }
  .astuce {
    margin: 12px 0 18px;
  }
  .reglage {
    padding: 8px 16px;
    margin-bottom: 18px;
  }
  .compteur {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 64px;
    font-weight: 600;
  }
  .boutons {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .boutons button {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: none;
    background: var(--se);
    color: var(--ac);
    font-size: 1.6rem;
    font-weight: 700;
    cursor: pointer;
  }
  output {
    min-width: 2ch;
    text-align: center;
    font-size: 1.3rem;
  }
  .apercu {
    margin: 4px 0 8px;
  }
  .avertissement .champ {
    margin: 10px 0 0;
  }
</style>
