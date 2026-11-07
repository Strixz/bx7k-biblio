<script lang="ts">
  import { onMount } from 'svelte';
  import { appliquerTheme } from './lib/themes';
  import { chargerReglages, reglages } from './lib/reglages.svelte';
  import { routeur, aller, lien } from './lib/routeur.svelte';
  import { completerEnAttente } from './lib/infos';
  import { toast } from './lib/dialogues.svelte';
  import { miseAJour, mettreAJour } from './lib/miseAJour.svelte';
  import BarreNav from './components/BarreNav.svelte';
  import Dialogues from './components/Dialogues.svelte';
  import Accueil from './pages/Accueil.svelte';
  import Mega from './pages/Mega.svelte';
  import FormeBiblio from './pages/FormeBiblio.svelte';
  import Bibliotheque from './pages/Bibliotheque.svelte';
  import Livre from './pages/Livre.svelte';
  import Ajouter from './pages/Ajouter.svelte';
  import Serie from './pages/Serie.svelte';
  import Recherche from './pages/Recherche.svelte';
  import Options from './pages/Options.svelte';
  import Tutoriel from './pages/Tutoriel.svelte';
  import Installer from './pages/Installer.svelte';

  let pret = $state(false);
  const mq = matchMedia('(prefers-color-scheme: dark)');
  let systemeSombre = $state(mq.matches);
  mq.addEventListener('change', (e) => (systemeSombre = e.matches));

  const sombre = $derived(reglages.sombre ?? systemeSombre);
  $effect(() => appliquerTheme(reglages.theme, sombre));

  async function completer() {
    try {
      const n = await completerEnAttente();
      if (n) toast(`${n} livre${n > 1 ? 's' : ''} complété${n > 1 ? 's' : ''} grâce au réseau`);
    } catch {
      // Réessai au prochain retour du réseau.
    }
  }

  onMount(() => {
    chargerReglages().then(() => {
      pret = true;
      if (!reglages.tutorielVu && routeur.route.page !== 'tutoriel') aller({ page: 'tutoriel' }, true);
      completer();
    });
    // Demande à iOS de ne pas effacer les données de l'application.
    navigator.storage?.persist?.().catch(() => {});
    addEventListener('online', completer);
    return () => removeEventListener('online', completer);
  });

  const r = $derived(routeur.route);
</script>

{#if pret}
  {#key lien(r)}
    {#if r.page === 'accueil'}<Accueil />
    {:else if r.page === 'mega'}<Mega id={r.id} />
    {:else if r.page === 'nouvelle-biblio'}<FormeBiblio megaId={r.megaId} />
    {:else if r.page === 'forme'}<FormeBiblio biblioId={r.id} />
    {:else if r.page === 'biblio'}<Bibliotheque id={r.id} />
    {:else if r.page === 'livre'}<Livre id={r.id} />
    {:else if r.page === 'ajouter'}<Ajouter etagereId={r.etagereId} />
    {:else if r.page === 'serie'}<Serie etagereId={r.etagereId} />
    {:else if r.page === 'recherche'}<Recherche />
    {:else if r.page === 'options'}<Options sombreEffectif={sombre} />
    {:else if r.page === 'tutoriel'}<Tutoriel />
    {:else if r.page === 'installer'}<Installer />
    {/if}
  {/key}
  {#if miseAJour.disponible}
    <div class="maj" role="status">
      <span>Une nouvelle version est prête.</span>
      <button class="btn" onclick={mettreAJour}>Mettre à jour</button>
    </div>
  {/if}
  {#if r.page !== 'tutoriel'}<BarreNav />{/if}
  <Dialogues />
{/if}

<style>
  .maj {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(var(--nav) + 12px);
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 10px 10px 16px;
    border-radius: var(--rayon);
    background: var(--tx);
    color: var(--bg);
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.25);
    font-weight: 600;
  }
  .maj .btn {
    flex: none;
  }
</style>
