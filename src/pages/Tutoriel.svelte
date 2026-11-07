<script lang="ts">
  import { changerReglage } from '../lib/reglages.svelte';
  import { aller } from '../lib/routeur.svelte';

  const ECRANS = [
    { dessin: '🏠', titre: 'Bienvenue !', texte: 'Cette application vous aide à savoir où sont rangés tous vos livres. Tout reste sur votre téléphone.' },
    { dessin: '📚', titre: 'Vos lieux et vos meubles', texte: 'Créez d’abord un lieu (votre maison), puis une bibliothèque pour chaque meuble, avec son nombre d’étagères.' },
    { dessin: '📷', titre: 'Scannez vos livres', texte: 'Touchez « Ajouter » et visez le code-barres au dos du livre. Il est reconnu tout seul.' },
    { dessin: '⋮⋮', titre: 'Rangez en faisant glisser', texte: 'Pour changer un livre de place, appuyez sur ⋮⋮ et faites-le glisser. Le bouton « ? » en haut de chaque page vous aide.' },
    { dessin: '💾', titre: 'Pensez à sauvegarder', texte: 'De temps en temps, allez dans Options et touchez « Faire une sauvegarde ». Votre bibliothèque sera à l’abri.' }
  ];

  let i = $state(0);
  const e = $derived(ECRANS[i]);

  async function terminer() {
    await changerReglage('tutorielVu', true);
    aller({ page: 'accueil' }, true);
  }
</script>

<div class="tuto">
  <button class="passer" onclick={terminer}>Passer</button>
  <div class="ecran" aria-live="polite">
    <div class="dessin" aria-hidden="true">{e.dessin}</div>
    <h1>{e.titre}</h1>
    <p>{e.texte}</p>
  </div>
  <div class="points" aria-hidden="true">
    {#each ECRANS as _, j (j)}<span class:actif={j === i}></span>{/each}
  </div>
  <p class="sr">Étape {i + 1} sur {ECRANS.length}</p>
  <div class="boutons">
    {#if i > 0}<button class="btn second" onclick={() => i--}>Précédent</button>{/if}
    {#if i < ECRANS.length - 1}
      <button class="btn" onclick={() => i++}>Suivant</button>
    {:else}
      <button class="btn" onclick={terminer}>C’est parti !</button>
    {/if}
  </div>
</div>

<style>
  .tuto {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: calc(env(safe-area-inset-top) + 12px) 24px calc(env(safe-area-inset-bottom) + 24px);
    max-width: 560px;
    margin: 0 auto;
  }
  .passer {
    align-self: flex-end;
    min-height: 44px;
    background: none;
    border: none;
    color: var(--doux);
    font-weight: 600;
    cursor: pointer;
  }
  .ecran {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 16px;
  }
  .dessin {
    width: 150px;
    height: 150px;
    border-radius: 40px;
    background: var(--se);
    color: var(--ac);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4.5rem;
    font-weight: 800;
  }
  p {
    font-size: 1.15rem;
    margin: 0;
  }
  .points {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 24px 0;
  }
  .points span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--bo);
  }
  .points .actif {
    background: var(--ac);
  }
  .boutons {
    display: flex;
    gap: 12px;
  }
  .boutons .btn {
    flex: 1;
  }
</style>
