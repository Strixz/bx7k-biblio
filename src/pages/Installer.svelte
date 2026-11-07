<script lang="ts">
  import EnTete from '../components/EnTete.svelte';

  const installee = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
</script>

<EnTete titre="Installer l’application" aide="" retour="#/" />

<main>
  {#if installee}
    <div class="vide"><span class="grand" aria-hidden="true">✓</span>L’application est bien installée sur ce téléphone.</div>
  {:else}
    <p>Installer l’application sur l’écran d’accueil permet de l’ouvrir comme les autres applications et de <strong>bien garder vos livres sur ce téléphone</strong>.</p>
    <ol class="etapes">
      <li><span class="num">1</span><span>Ouvrez cette page dans <strong>Safari</strong>.</span></li>
      <li><span class="num">2</span><span>Touchez le bouton <strong>Partager</strong> <span class="ic" aria-label="(un carré avec une flèche vers le haut)">⬆︎</span> en bas de l’écran.</span></li>
      <li><span class="num">3</span><span>Faites défiler et touchez <strong>« Sur l’écran d’accueil »</strong>.</span></li>
      <li><span class="num">4</span><span>Touchez <strong>Ajouter</strong> en haut à droite.</span></li>
      <li><span class="num">5</span><span>Ouvrez l’application depuis sa nouvelle icône 📚 sur l’écran d’accueil.</span></li>
    </ol>
    <p class="doux">Important : utilisez toujours l’icône de l’écran d’accueil. Les livres ajoutés depuis Safari ne sont pas les mêmes que ceux de l’application installée.</p>
  {/if}
</main>

<style>
  .etapes {
    list-style: none;
    padding: 0;
    margin: 20px 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .etapes li {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    font-size: 1.1rem;
  }
  .num {
    flex: none;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--ac);
    color: var(--sur-ac);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }
  .ic {
    display: inline-block;
    padding: 0 6px;
    border-radius: 6px;
    background: var(--se);
  }
</style>
