<script lang="ts">
  import { nomEtagere as libelleEtagere } from '../lib/etageres';
  import { ajouterLivre, emplacement, supprimerLivre, trouverDoublon } from '../lib/depot';
  import { chercherInfos, type InfosLivre } from '../lib/infos';
  import { nettoyerIsbn } from '../lib/isbn';
  import { confirmer, informer } from '../lib/dialogues.svelte';
  import { changerReglage, reglages } from '../lib/reglages.svelte';
  import type { EtatInfos } from '../lib/types';
  import EnTete from '../components/EnTete.svelte';
  import Scanner from '../components/Scanner.svelte';
  import ChoixEmplacement from '../components/ChoixEmplacement.svelte';
  import VerifLivre from '../components/VerifLivre.svelte';

  let { etagereId: etagereInitiale }: { etagereId?: number } = $props();

  interface Ajout {
    id: number;
    titre: string;
    etat: EtatInfos;
  }

  /** Même parcours que l'ajout d'un livre, en boucle sur une étagère : scan → vérification → scan… */
  let etape: 'choix' | 'scan' | 'recherche' | 'verif' | 'fin' = $state('choix');
  let etagereId: number | undefined = $state(etagereInitiale ?? reglages.dernierEmplacement ?? undefined);
  let nomEtagere = $state('');
  let biblioId: number | undefined = $state();
  let ajouts: Ajout[] = $state([]);
  let isbn: string | undefined = $state();
  let infos: InfosLivre = $state({ infos: 'manuel', titre: '', auteur: '', genres: [] });
  let flash = $state('');
  let refus = $state('');
  /** Le livre qu'on vient de ranger est souvent encore devant la caméra : on l'ignore quelques secondes. */
  let dernier = { isbn: '', quand: 0 };
  let occupe = false;
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
    nomEtagere = `${e?.biblio.nom} › ${e ? libelleEtagere(e.etagere) : ''}`;
    biblioId = e?.biblio.id;
    await changerReglage('dernierEmplacement', etagereId);
    etape = 'scan';
  }

  async function surCode(code: string) {
    if (occupe || etape !== 'scan') return;
    const i = nettoyerIsbn(code);
    if (!i) {
      refus = 'Ce code-barres n’est pas celui d’un livre. Essayez celui qui commence par 978 ou 979.';
      return;
    }
    const maintenant = Date.now();
    if (i === dernier.isbn && maintenant - dernier.quand < 4000) {
      dernier.quand = maintenant;
      return;
    }
    occupe = true;
    refus = '';
    bip();
    const doublon = await trouverDoublon({ isbn: i, titre: '', auteur: '' });
    if (doublon && !(await avertirDoublon(doublon.etagereId, doublon.titre))) {
      dernier = { isbn: i, quand: Date.now() };
      occupe = false;
      return;
    }
    isbn = i;
    etape = 'recherche';
    infos = await chercherInfos(i);
    if (infos.infos === 'introuvable') infos.titre = '';
    etape = 'verif';
    occupe = false;
  }

  async function avertirDoublon(eid: number, titre: string) {
    const e = await emplacement(eid);
    return confirmer(
      'Vous avez déjà ce livre',
      `« ${titre} » est rangé : ${e?.mega.nom} › ${e?.biblio.nom} › ${e ? libelleEtagere(e.etagere) : ''}. Voulez-vous ajouter un deuxième exemplaire ?`,
      'Ajouter quand même'
    );
  }

  function sansCode() {
    isbn = undefined;
    infos = { infos: 'manuel', titre: '', auteur: '', genres: [] };
    etape = 'verif';
  }

  async function ranger() {
    if (!isbn) {
      const doublon = await trouverDoublon({ titre: infos.titre, auteur: infos.auteur });
      if (doublon && !(await avertirDoublon(doublon.etagereId, doublon.titre))) return;
    }
    const etat: EtatInfos = infos.infos === 'introuvable' ? 'manuel' : infos.infos;
    const titre = infos.titre.trim();
    const id = await ajouterLivre({
      etagereId: etagereId!,
      isbn,
      titre,
      auteur: infos.auteur.trim(),
      genres: $state.snapshot(infos.genres),
      couverture: infos.couverture,
      statut: 'range',
      note: '',
      infos: etat
    });
    ajouts.push({ id, titre, etat });
    flash = `✓ « ${titre} » rangé · ${ajouts.length} livre${ajouts.length > 1 ? 's' : ''}`;
    retourScan();
  }

  function passer() {
    flash = 'Livre passé, il n’a pas été ajouté.';
    retourScan();
  }

  function retourScan() {
    if (isbn) dernier = { isbn, quand: Date.now() };
    isbn = undefined;
    etape = 'scan';
  }

  async function annulerDernier() {
    const a = ajouts.pop();
    if (!a) return;
    await supprimerLivre(a.id);
    dernier = { isbn: '', quand: 0 };
    flash = `« ${a.titre} » retiré de l’étagère`;
  }

  const enAttente = $derived(ajouts.filter((a) => a.etat === 'en-attente-reseau'));
</script>

<EnTete titre="Scanner une étagère" aide="serie" retour={etagereInitiale ? undefined : '#/ajouter'} />

<main>
  {#if etape === 'choix'}
    <p>Vous allez scanner les livres <strong>un par un, de gauche à droite</strong>. Après chaque livre, vérifiez ses infos puis validez : le scanner revient pour le suivant.</p>
    <h2 class="ou">Sur quelle étagère ?</h2>
    <ChoixEmplacement bind:etagereId />
    <button class="btn large" onclick={commencer}>Commencer</button>
  {:else if etape === 'scan'}
    <p class="doux cible">Étagère : <strong>{nomEtagere}</strong></p>
    <Scanner oncode={surCode} />
    <p class="flash" role="status" aria-live="polite">
      {refus || flash || 'Scannez le premier livre (le plus à gauche).'}
    </p>
    <div class="actions">
      <button class="btn second" onclick={annulerDernier} disabled={!ajouts.length}>↶ Retirer le dernier</button>
      <button class="btn second" onclick={sansCode}>✎ Sans code-barres</button>
    </div>
    <button class="btn large fini" onclick={() => (etape = 'fin')}>J’ai fini ({ajouts.length})</button>
  {:else if etape === 'recherche'}
    <div class="vide" role="status">
      <span class="grand" aria-hidden="true">🔎</span>
      Je cherche ce livre…
    </div>
  {:else if etape === 'verif'}
    <p class="doux cible">Livre n° {ajouts.length + 1} · <strong>{nomEtagere}</strong></p>
    <VerifLivre bind:infos valider={ranger} annuler={passer} libelleValider="Valider et scanner le suivant" libelleAnnuler="Ne pas ajouter ce livre" />
  {:else}
    <div class="vide" role="status">
      <span class="grand" aria-hidden="true">✓</span>
      <strong>{ajouts.length} livre{ajouts.length > 1 ? 's' : ''} ajouté{ajouts.length > 1 ? 's' : ''}</strong><br />{nomEtagere}
    </div>

    {#if enAttente.length}
      <h2>En attente du réseau</h2>
      <p class="doux">Ces livres seront complétés automatiquement quand internet reviendra.</p>
      <ul class="liste">
        {#each enAttente as a (a.id)}
          <li><a class="carte element" href={`#/livre/${a.id}`}><span class="principal">{a.titre}</span><span class="chevron">›</span></a></li>
        {/each}
      </ul>
    {/if}

    <div class="pile section">
      {#if biblioId}<a class="btn large" href={`#/biblio/${biblioId}`}>Voir l’étagère</a>{/if}
      <button class="btn second large" onclick={() => { ajouts = []; flash = ''; etape = 'scan'; }}>Continuer à scanner</button>
      {#if biblioId}<a class="btn second large" href={`#/nouvelle-etagere/${biblioId}`}>＋ Créer l’étagère suivante</a>{/if}
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
