<script lang="ts">
  import { GENRES_BASE } from '../lib/genres';
  import { demander } from '../lib/dialogues.svelte';

  let { genres = $bindable() }: { genres: string[] } = $props();
  let ouvert = $state(false);

  const proposes = $derived(GENRES_BASE.filter((g) => !genres.includes(g)));

  const retirer = (g: string) => (genres = genres.filter((x) => x !== g));
  const ajouter = (g: string) => {
    if (!genres.includes(g)) genres = [...genres, g];
  };

  async function autre() {
    const g = await demander('Nouveau genre', '', 'Par exemple : Romans régionaux');
    if (g) ajouter(g);
  }
</script>

<div class="genres">
  {#each genres as g (g)}
    <button type="button" class="puce choisie" onclick={() => retirer(g)} aria-label={`Retirer ${g}`}>{g} ✕</button>
  {/each}
  <button type="button" class="puce ajout" onclick={() => (ouvert = !ouvert)} aria-expanded={ouvert}>
    {ouvert ? 'Fermer la liste' : '＋ Ajouter un genre'}
  </button>
</div>
{#if ouvert}
  <div class="genres liste-genres">
    {#each proposes as g (g)}
      <button type="button" class="puce" onclick={() => ajouter(g)}>{g}</button>
    {/each}
    <button type="button" class="puce ajout" onclick={autre}>Autre…</button>
  </div>
{/if}

<style>
  .genres {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .liste-genres {
    margin-top: 10px;
    padding: 12px;
    border-radius: 12px;
    background: var(--se);
  }
  .puce {
    min-height: 44px;
    padding: 8px 14px;
    border-radius: 22px;
    border: 1px solid var(--bo);
    background: var(--su);
    cursor: pointer;
  }
  .choisie {
    background: var(--ac);
    color: var(--sur-ac);
    border-color: transparent;
    font-weight: 600;
  }
  .ajout {
    border-style: dashed;
    color: var(--ac);
    font-weight: 600;
  }
</style>
