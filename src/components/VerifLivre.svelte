<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { InfosLivre } from '../lib/infos';
  import { informer } from '../lib/dialogues.svelte';
  import EditeurGenres from './EditeurGenres.svelte';
  import Couverture from './Couverture.svelte';

  /** Vérification des infos d'un livre scanné (ou saisi à la main) avant de le ranger. */
  let {
    infos = $bindable(),
    valider,
    annuler,
    libelleValider = 'Ranger ce livre',
    libelleAnnuler = 'Annuler',
    children
  }: {
    infos: InfosLivre;
    valider: () => void | Promise<void>;
    annuler: () => void;
    libelleValider?: string;
    libelleAnnuler?: string;
    /** Contenu affiché sous les genres (par exemple le choix de l'emplacement). */
    children?: Snippet;
  } = $props();

  function envoyer(e: Event) {
    e.preventDefault();
    if (!infos.titre.trim()) return informer('Il manque le titre', 'Écrivez au moins le titre du livre.');
    valider();
  }
</script>

<form onsubmit={envoyer}>
  {#if infos.infos === 'en-attente-reseau'}
    <div class="bandeau"><div class="principal"><strong>Pas de réseau</strong><br /><span class="doux">Le livre sera enregistré et complété automatiquement quand internet reviendra. Vous pouvez déjà le ranger.</span></div></div>
  {:else if infos.infos === 'introuvable'}
    <div class="bandeau"><div class="principal"><strong>Livre introuvable</strong><br /><span class="doux">Écrivez le titre et l’auteur vous-même.</span></div></div>
  {:else if infos.infos === 'completes'}
    <div class="trouve">
      <Couverture blob={infos.couverture} titre={infos.titre} petite />
      <p><strong>Livre trouvé !</strong><br /><span class="doux">Vérifiez et corrigez si besoin.</span></p>
    </div>
  {/if}

  <label class="champ"><span>Titre</span><input type="text" bind:value={infos.titre} /></label>
  <label class="champ"><span>Auteur</span><input type="text" bind:value={infos.auteur} /></label>
  <div class="champ"><span class="etiquette">Genres</span><EditeurGenres bind:genres={infos.genres} /></div>

  {@render children?.()}

  <div class="pile boutons">
    <button class="btn large" type="submit">{libelleValider}</button>
    <button class="btn second large" type="button" onclick={annuler}>{libelleAnnuler}</button>
  </div>
</form>

<style>
  .trouve {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-bottom: 16px;
  }
  .boutons {
    margin-top: 24px;
  }
  .etiquette {
    display: block;
    font-weight: 600;
    margin-bottom: 6px;
  }
</style>
