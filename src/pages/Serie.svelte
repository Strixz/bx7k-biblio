<script lang="ts">
  import { ajouterLivre, emplacement, majLivre, supprimerLivre, trouverDoublon } from '../lib/depot';
  import { chercherInfos, titreProvisoire } from '../lib/infos';
  import { nettoyerIsbn } from '../lib/isbn';
  import { demander, informer } from '../lib/dialogues.svelte';
  import { changerReglage, reglages } from '../lib/reglages.svelte';
  import type { EtatInfos } from '../lib/types';
  import EnTete from '../components/EnTete.svelte';
  import Scanner from '../components/Scanner.svelte';
  import ChoixEmplacement from '../components/ChoixEmplacement.svelte';

  let { etagereId: etagereInitiale }: { etagereId?: number } = $props();

  interface Ajout {
    id: number;
    titre: string;
    etat: EtatInfos | 'recherche';
    doublon?: string;
  }

  let etape: 'choix' | 'scan' | 'fin' = $state('choix');
  let etagereId: number | undefined = $state(etagereInitiale ?? reglages.dernierEmplacement ?? undefined);
  let nomEtagere = $state('');
  let biblioId: number | undefined = $state();
  let ajouts: Ajout[] = $state([]);
  let flash = $state('');
  let refus = $state('');
  let dernier = { isbn: '', quand: 0 };
  let audio: AudioContext | undefined;

  function bip() {
    if (!audio) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.15);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.15);
  }

  async function commencer() {
    if (!etagereId) return informer('Choisissez une étagère', 'Indiquez sur quelle étagère vous allez scanner les livres.');
    // Le son doit être autorisé par un geste de l'utilisateur (règle d'iOS).
    try {
      audio = new AudioContext();
    } catch {
      audio = undefined;
    }
    const e = await emplacement(etagereId);
    nomEtagere = `${e?.biblio.nom} › ${e?.etagere.nom}`;
    biblioId = e?.biblio.id;
    await changerReglage('dernierEmplacement', etagereId);
    etape = 'scan';
  }

  async function surCode(code: string) {
    const isbn = nettoyerIsbn(code);
    if (!isbn) {
      refus = 'Ce code-barres n’est pas celui d’un livre.';
      return;
    }
    // Le même livre lu deux fois de suite en moins de 3 s : on l'ignore.
    const maintenant = Date.now();
    if (isbn === dernier.isbn && maintenant - dernier.quand < 3000) {
      dernier.quand = maintenant;
      return;
    }
    dernier = { isbn, quand: maintenant };
    refus = '';

    const doublon = await trouverDoublon({ isbn, titre: '', auteur: '' });
    const lieuDoublon = doublon && (await emplacement(doublon.etagereId));
    const id = await ajouterLivre({
      etagereId: etagereId!, isbn, titre: titreProvisoire(isbn), auteur: '', genres: [], statut: 'range', note: '', infos: 'en-attente-reseau'
    });
    const ajout: Ajout = {
      id,
      titre: titreProvisoire(isbn),
      etat: 'recherche',
      doublon: lieuDoublon ? `${lieuDoublon.biblio.nom} › ${lieuDoublon.etagere.nom}` : undefined
    };
    ajouts.push(ajout);
    bip();
    flash = `✓ Livre n° ${ajouts.length} ajouté`;

    // Recherche des infos en arrière-plan : le scan continue pendant ce temps.
    const r = await chercherInfos(isbn);
    const a = ajouts.find((x) => x.id === id);
    if (!a) return; // annulé entre-temps
    if (r.infos === 'completes') {
      await majLivre(id, { titre: r.titre, auteur: r.auteur, genres: r.genres, couverture: r.couverture, infos: 'completes' });
      a.titre = r.titre;
      if (ajouts.at(-1)?.id === id) flash = `✓ ${r.titre} — ${ajouts.length} livre${ajouts.length > 1 ? 's' : ''}`;
    } else if (r.infos === 'introuvable') {
      await majLivre(id, { infos: 'introuvable' });
    }
    a.etat = r.infos;
  }

  async function annulerDernier() {
    const a = ajouts.pop();
    if (!a) return;
    await supprimerLivre(a.id);
    dernier = { isbn: '', quand: 0 };
    flash = `« ${a.titre} » retiré`;
  }

  async function sansCode() {
    const titre = await demander('Titre du livre', '', 'Par exemple : Les Misérables', 'Suivant');
    if (!titre) return;
    const auteur = (await demander('Auteur (facultatif)', '', 'Par exemple : Victor Hugo', 'Ajouter')) ?? '';
    const id = await ajouterLivre({ etagereId: etagereId!, titre, auteur, genres: [], statut: 'range', note: '', infos: 'manuel' });
    ajouts.push({ id, titre, etat: 'manuel' });
    flash = `✓ ${titre} — ${ajouts.length} livre${ajouts.length > 1 ? 's' : ''}`;
  }

  const aCompleter = $derived(ajouts.filter((a) => a.etat === 'introuvable' || a.etat === 'en-attente-reseau' || a.etat === 'recherche'));
  const doublons = $derived(ajouts.filter((a) => a.doublon));
</script>

<EnTete titre="Scanner une étagère" aide="serie" retour={etagereInitiale ? undefined : '#/ajouter'} />

<main>
  {#if etape === 'choix'}
    <p>Vous allez scanner les livres <strong>un par un, de gauche à droite</strong>. Chacun sera ajouté à la suite du précédent.</p>
    <h2 class="ou">Sur quelle étagère ?</h2>
    <ChoixEmplacement bind:etagereId />
    <button class="btn large" onclick={commencer}>Commencer</button>
  {:else if etape === 'scan'}
    <p class="doux cible">Étagère : <strong>{nomEtagere}</strong></p>
    <Scanner oncode={surCode} />
    <p class="flash" role="status" aria-live="polite">{refus || flash || 'Scannez le premier livre (le plus à gauche).'}</p>
    <div class="actions">
      <button class="btn second" onclick={annulerDernier} disabled={!ajouts.length}>↶ Annuler le dernier</button>
      <button class="btn second" onclick={sansCode}>✎ Sans code-barres</button>
    </div>
    <button class="btn large fini" onclick={() => (etape = 'fin')}>J’ai fini ({ajouts.length})</button>
  {:else}
    <div class="vide" role="status">
      <span class="grand" aria-hidden="true">✓</span>
      <strong>{ajouts.length} livre{ajouts.length > 1 ? 's' : ''} ajouté{ajouts.length > 1 ? 's' : ''}</strong><br />{nomEtagere}
    </div>

    {#if aCompleter.length}
      <h2>À vérifier</h2>
      <p class="doux">Ces livres n’ont pas encore toutes leurs infos. Ceux qui attendent le réseau seront complétés automatiquement.</p>
      <ul class="liste">
        {#each aCompleter as a (a.id)}
          <li><a class="carte element" href={`#/livre/${a.id}`}><span class="principal">{a.titre}<br /><span class="doux">{a.etat === 'introuvable' ? 'Introuvable : à compléter à la main' : a.etat === 'recherche' ? 'Recherche en cours…' : 'Attend le réseau'}</span></span><span class="chevron">›</span></a></li>
        {/each}
      </ul>
    {/if}

    {#if doublons.length}
      <h2 class="section">Déjà présents ailleurs</h2>
      <ul class="liste">
        {#each doublons as a (a.id)}
          <li><a class="carte element" href={`#/livre/${a.id}`}><span class="principal">{a.titre}<br /><span class="doux">Un exemplaire est aussi dans {a.doublon}</span></span><span class="chevron">›</span></a></li>
        {/each}
      </ul>
    {/if}

    <div class="pile section">
      {#if biblioId}<a class="btn large" href={`#/biblio/${biblioId}`}>Voir l’étagère</a>{/if}
      <button class="btn second large" onclick={() => { ajouts = []; etape = 'scan'; }}>Continuer à scanner</button>
    </div>
  {/if}
</main>

<style>
  .ou {
    margin: 18px 0 12px;
  }
  .cible {
    margin: 0 0 10px;
  }
  .flash {
    min-height: 3em;
    margin: 12px 0;
    font-size: 1.15rem;
    font-weight: 700;
    text-align: center;
  }
  .actions {
    display: flex;
    gap: 10px;
  }
  .actions .btn {
    flex: 1;
    font-size: 0.98rem;
    padding: 10px;
  }
  .fini {
    margin-top: 14px;
  }
  h2 {
    margin-bottom: 8px;
  }
</style>
