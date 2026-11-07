<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../lib/db';
  import type { Bibliotheque, Etagere, MegaCollection } from '../lib/types';

  /** Choix lieu › bibliothèque › étagère. `etagereId` est lié dans les deux sens. */
  let { etagereId = $bindable() }: { etagereId: number | undefined } = $props();

  let megas: MegaCollection[] = $state([]);
  let biblios: Bibliotheque[] = $state([]);
  let etageres: Etagere[] = $state([]);
  let megaId: number | undefined = $state();
  let biblioId: number | undefined = $state();

  onMount(() => {
    (async () => {
      megas = await db.megas.orderBy('ordre').toArray();
      biblios = await db.biblios.toArray();
      etageres = await db.etageres.toArray();
      const e = etageres.find((x) => x.id === etagereId);
      const b = e && biblios.find((x) => x.id === e.biblioId);
      if (e && b) {
        megaId = b.megaId;
        biblioId = b.id;
      } else {
        megaId = megas[0]?.id;
        choisirMega();
      }
    })();
  });

  const bibliosDuLieu = $derived(biblios.filter((b) => b.megaId === megaId).sort((a, b) => a.ordre - b.ordre));
  const etageresDeLaBiblio = $derived(etageres.filter((e) => e.biblioId === biblioId).sort((a, b) => a.ordre - b.ordre));

  function choisirMega() {
    biblioId = biblios.filter((b) => b.megaId === megaId).sort((a, b) => a.ordre - b.ordre)[0]?.id;
    choisirBiblio();
  }

  function choisirBiblio() {
    etagereId = etageres.filter((e) => e.biblioId === biblioId).sort((a, b) => a.ordre - b.ordre)[0]?.id;
  }
</script>

<div class="pile">
  <label class="champ">
    <span>Lieu</span>
    <select bind:value={megaId} onchange={choisirMega}>
      {#each megas as m (m.id)}<option value={m.id}>{m.nom}</option>{/each}
    </select>
  </label>
  <label class="champ">
    <span>Bibliothèque</span>
    <select bind:value={biblioId} onchange={choisirBiblio} disabled={!bibliosDuLieu.length}>
      {#each bibliosDuLieu as b (b.id)}<option value={b.id}>{b.nom}</option>{/each}
    </select>
  </label>
  <label class="champ">
    <span>Étagère</span>
    <select bind:value={etagereId} disabled={!etageresDeLaBiblio.length}>
      {#each etageresDeLaBiblio as e (e.id)}<option value={e.id}>{e.nom}</option>{/each}
    </select>
  </label>
  {#if megas.length && !bibliosDuLieu.length}
    <p class="doux">Ce lieu n’a pas encore de bibliothèque. <a href={`#/nouvelle-biblio/${megaId}`}>En créer une</a></p>
  {/if}
</div>

<style>
  .pile {
    gap: 0;
  }
</style>
