<script lang="ts">
  import { onMount } from 'svelte';
  import { appliquerTheme } from './lib/themes';
  import { chargerReglages, reglages } from './lib/reglages.svelte';
  import { routeur, aller, lien } from './lib/routeur.svelte';
  import { completerEnAttente } from './lib/infos';
  import { toast } from './lib/dialogues.svelte';
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
  {#if r.page !== 'tutoriel'}<BarreNav />{/if}
  <Dialogues />
{/if}
