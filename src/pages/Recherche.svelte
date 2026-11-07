<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../lib/db';
  import { rechercher, type Filtres } from '../lib/recherche';
  import EnTete from '../components/EnTete.svelte';
  import Badges from '../components/Badges.svelte';

  let requete = $state('');
  let filtre = $state('tous');

  const FILTRES: { id: string; nom: string; f: Filtres }[] = [
    { id: 'tous', nom: 'Tous', f: {} },
    { id: 'prete', nom: 'Prêtés', f: { statut: 'prete' } },
    { id: 'lecture', nom: 'En lecture', f: { statut: 'lecture' } },
    { id: 'range', nom: 'Rangés', f: { statut: 'range' } },
    { id: 'attente', nom: 'Attendent le réseau', f: { infos: 'en-attente-reseau' } },
    { id: 'introuvable', nom: 'À compléter', f: { infos: 'introuvable' } }
  ];

  const donnees = liveQuery(async () => {
    const [livres, etageres, biblios, megas] = await Promise.all([db.livres.toArray(), db.etageres.toArray(), db.biblios.toArray(), db.megas.toArray()]);
    const b = new Map(biblios.map((x) => [x.id, x]));
    const m = new Map(megas.map((x) => [x.id, x.nom]));
    const chemins = new Map(
      etageres.map((e) => {
        const bi = b.get(e.biblioId);
        return [e.id, bi ? `${m.get(bi.megaId)} › ${bi.nom} › ${e.nom}` : ''];
      })
    );
    return { livres, chemins };
  });

  const resultats = $derived(
    $donnees ? rechercher($donnees.livres, requete, FILTRES.find((x) => x.id === filtre)!.f) : []
  );
  const actif = $derived(requete.trim() !== '' || filtre !== 'tous');
</script>

<EnTete titre="Chercher un livre" aide="recherche" />

<main>
  <input type="search" bind:value={requete} placeholder="Titre, auteur ou genre…" aria-label="Rechercher" enterkeyhint="search" autocomplete="off" />

  <div class="filtres" role="group" aria-label="Filtrer">
    {#each FILTRES as f (f.id)}
      <button class:actif={filtre === f.id} aria-pressed={filtre === f.id} onclick={() => (filtre = f.id)}>{f.nom}</button>
    {/each}
  </div>

  {#if $donnees && actif}
    <p class="doux compte" aria-live="polite">{resultats.length} livre{resultats.length > 1 ? 's' : ''}</p>
    <ul class="liste">
      {#each resultats.slice(0, 200) as l (l.id)}
        <li>
          <a class="carte element" href={`#/livre/${l.id}`}>
            <span class="principal">
              <span class="nom">{l.titre}</span>
              {#if l.auteur}<br /><span>{l.auteur}</span>{/if}
              <br /><span class="doux">📍 {$donnees.chemins.get(l.etagereId)}</span>
            </span>
            <Badges livre={l} />
          </a>
        </li>
      {/each}
    </ul>
    {#if !resultats.length}
      <div class="vide"><span class="grand" aria-hidden="true">🔍</span>Aucun livre ne correspond.</div>
    {/if}
  {:else if $donnees}
    <div class="vide"><span class="grand" aria-hidden="true">🔍</span>{$donnees.livres.length} livres dans toute la maison.<br />Tapez un titre, un auteur ou un genre.</div>
  {/if}
</main>

<style>
  .filtres {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 12px 0 4px;
    scrollbar-width: none;
  }
  .filtres button {
    flex: none;
    min-height: 44px;
    padding: 8px 16px;
    border-radius: 22px;
    border: 1px solid var(--bo);
    background: var(--su);
    font-weight: 600;
    cursor: pointer;
  }
  .filtres .actif {
    background: var(--ac);
    color: var(--sur-ac);
    border-color: transparent;
  }
  .compte {
    margin: 10px 0;
  }
  .element {
    align-items: flex-start;
  }
</style>
