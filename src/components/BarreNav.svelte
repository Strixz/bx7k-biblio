<script lang="ts">
  import { routeur } from '../lib/routeur.svelte';

  const page = $derived(routeur.route.page);
  const actif = (pages: string[]) => pages.includes(page);
</script>

<nav aria-label="Menu principal">
  <a href="#/" class:actif={actif(['accueil', 'mega', 'biblio', 'nouvelle-etagere', 'etagere', 'livre'])}>
    <span class="ic" aria-hidden="true">⌂</span>Mes livres
  </a>
  <a href="#/recherche" class:actif={actif(['recherche'])}>
    <span class="ic" aria-hidden="true">⌕</span>Chercher
  </a>
  <a href="#/ajouter" class="ajouter" class:actif={actif(['ajouter', 'serie'])}>
    <span class="ic" aria-hidden="true">＋</span>Ajouter
  </a>
  <a href="#/options" class:actif={actif(['options'])}>
    <span class="ic" aria-hidden="true">⚙︎</span>Options
  </a>
</nav>

<style>
  nav {
    position: fixed;
    inset: auto 0 0 0;
    height: var(--nav);
    padding-bottom: env(safe-area-inset-bottom);
    display: flex;
    background: var(--su);
    border-top: 1px solid var(--bo);
    z-index: 20;
  }
  a {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--doux);
    text-decoration: none;
  }
  .ic {
    font-size: 1.5rem;
    line-height: 1;
  }
  a.actif {
    color: var(--ac);
  }
  .ajouter .ic {
    width: 40px;
    height: 32px;
    border-radius: 16px;
    background: var(--ac);
    color: var(--sur-ac);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
  }
</style>
