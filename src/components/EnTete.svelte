<script lang="ts">
  import { AIDES } from '../lib/aide';
  import { reglages, changerReglage } from '../lib/reglages.svelte';
  import Feuille from './Feuille.svelte';

  interface Props {
    titre: string;
    /** Fil d'Ariane : éléments parents, du plus haut au plus proche. */
    chemin?: { nom: string; href: string }[];
    /** Clé de l'aide de la page (voir lib/aide.ts). */
    aide: string;
    retour?: string;
  }

  let { titre, chemin = [], aide, retour }: Props = $props();
  let aideOuverte = $state(false);
  const contenu = $derived(AIDES[aide]);

  // La première visite d'une page ouvre son aide une fois (après le tutoriel).
  $effect(() => {
    if (reglages.tutorielVu && contenu && !reglages.aidesVues.includes(aide)) {
      aideOuverte = true;
      changerReglage('aidesVues', [...reglages.aidesVues, aide]);
    }
  });
</script>

<header>
  <div class="haut">
    {#if retour}
      <a class="retour" href={retour} aria-label="Retour">‹ Retour</a>
    {:else}
      <span></span>
    {/if}
    {#if contenu}
      <button class="aide" onclick={() => (aideOuverte = true)} aria-label="Aide sur cette page">?</button>
    {/if}
  </div>
  {#if chemin.length}
    <nav class="chemin" aria-label="Vous êtes ici">
      {#each chemin as c, i (c.href)}
        <a href={c.href}>{c.nom}</a>{#if i < chemin.length - 1}<span aria-hidden="true"> › </span>{/if}
      {/each}
    </nav>
  {/if}
  <h1>{titre}</h1>
</header>

{#if aideOuverte && contenu}
  <Feuille titre={contenu.titre} onfermer={() => (aideOuverte = false)}>
    <ul class="points">
      {#each contenu.points as p (p)}
        <li>{p}</li>
      {/each}
    </ul>
    <button class="btn large" onclick={() => (aideOuverte = false)}>J’ai compris</button>
  </Feuille>
{/if}

<style>
  header {
    padding: calc(env(safe-area-inset-top) + 8px) 16px 12px;
    max-width: 640px;
    margin: 0 auto;
  }
  .haut {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 48px;
  }
  .retour {
    font-weight: 600;
    font-size: 1.05rem;
    text-decoration: none;
    padding: 10px 10px 10px 0;
  }
  .aide {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: var(--se);
    color: var(--ac);
    font-weight: 800;
    font-size: 1.3rem;
    cursor: pointer;
  }
  .chemin {
    font-size: 0.92rem;
    color: var(--doux);
    margin-bottom: 2px;
  }
  .chemin a {
    color: var(--doux);
  }
  .points {
    padding-left: 1.2em;
    margin: 0 0 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 1.05rem;
  }
</style>
