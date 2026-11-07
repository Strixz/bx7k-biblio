<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../lib/db';
  import { ajouterLivre, emplacement, trouverDoublon } from '../lib/depot';
  import { chercherInfos, type InfosLivre } from '../lib/infos';
  import { nettoyerIsbn } from '../lib/isbn';
  import { confirmer, informer } from '../lib/dialogues.svelte';
  import { changerReglage, reglages } from '../lib/reglages.svelte';
  import EnTete from '../components/EnTete.svelte';
  import Scanner from '../components/Scanner.svelte';
  import EditeurGenres from '../components/EditeurGenres.svelte';
  import ChoixEmplacement from '../components/ChoixEmplacement.svelte';
  import Couverture from '../components/Couverture.svelte';

  let { etagereId: etagereInitiale }: { etagereId?: number } = $props();

  type Etape = 'scan' | 'recherche' | 'verif' | 'fait';
  let etape: Etape = $state('scan');
  let isbn: string | undefined = $state();
  let infos: InfosLivre = $state({ infos: 'manuel', titre: '', auteur: '', genres: [] });
  let etagereId: number | undefined = $state(etagereInitiale ?? reglages.dernierEmplacement ?? undefined);
  let ajoute: { id: number; lieu: string } | undefined = $state();
  let codeRefuse = $state('');
  let occupe = false;

  const nbEtageres = liveQuery(() => db.etageres.count());

  async function surCode(code: string) {
    if (occupe || etape !== 'scan') return;
    const i = nettoyerIsbn(code);
    if (!i) {
      codeRefuse = 'Ce code-barres n’est pas celui d’un livre. Essayez celui qui commence par 978 ou 979.';
      return;
    }
    occupe = true;
    codeRefuse = '';
    const doublon = await trouverDoublon({ isbn: i, titre: '', auteur: '' });
    if (doublon && !(await avertirDoublon(doublon.etagereId, doublon.titre))) {
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
      `« ${titre} » est rangé : ${e?.mega.nom} › ${e?.biblio.nom} › ${e?.etagere.nom}. Voulez-vous ajouter un deuxième exemplaire ?`,
      'Ajouter quand même'
    );
  }

  function saisirMain() {
    isbn = undefined;
    infos = { infos: 'manuel', titre: '', auteur: '', genres: [] };
    etape = 'verif';
  }

  async function ranger(e: Event) {
    e.preventDefault();
    if (!infos.titre.trim()) return informer('Il manque le titre', 'Écrivez au moins le titre du livre.');
    if (!etagereId) return informer('Où est rangé ce livre ?', 'Choisissez un lieu, une bibliothèque et une étagère.');
    if (!isbn) {
      const doublon = await trouverDoublon({ titre: infos.titre, auteur: infos.auteur });
      if (doublon && !(await avertirDoublon(doublon.etagereId, doublon.titre))) return;
    }
    const id = await ajouterLivre({
      etagereId,
      isbn,
      titre: infos.titre.trim(),
      auteur: infos.auteur.trim(),
      genres: $state.snapshot(infos.genres),
      couverture: infos.couverture,
      statut: 'range',
      note: '',
      infos: infos.infos === 'introuvable' ? 'manuel' : infos.infos
    });
    await changerReglage('dernierEmplacement', etagereId);
    const lieu = await emplacement(etagereId);
    ajoute = { id, lieu: `${lieu?.mega.nom} › ${lieu?.biblio.nom} › ${lieu?.etagere.nom}` };
    etape = 'fait';
  }

  function recommencer() {
    isbn = undefined;
    ajoute = undefined;
    etape = 'scan';
  }
</script>

<EnTete titre="Ajouter un livre" aide="ajouter" />

<main>
  {#if $nbEtageres === 0}
    <div class="vide">
      <span class="grand" aria-hidden="true">📚</span>
      Avant d’ajouter des livres, créez un lieu et une bibliothèque.
    </div>
    <a class="btn large" href="#/">Créer un lieu</a>
  {:else if etape === 'scan'}
    <Scanner oncode={surCode} />
    {#if codeRefuse}<p class="alerte" role="alert">{codeRefuse}</p>{/if}
    <div class="pile choix">
      <button class="btn second large" onclick={saisirMain}>✎ Saisir à la main</button>
      <a class="btn second large" href={etagereInitiale ? `#/serie/${etagereInitiale}` : '#/serie'}>📷 Scanner toute une étagère</a>
    </div>
  {:else if etape === 'recherche'}
    <div class="vide" role="status">
      <span class="grand" aria-hidden="true">🔎</span>
      Je cherche ce livre…
    </div>
  {:else if etape === 'verif'}
    <form onsubmit={ranger}>
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

      <h2 class="ou">Où est-il rangé ?</h2>
      <ChoixEmplacement bind:etagereId />
      <p class="doux">Il sera placé à droite des livres déjà sur cette étagère.</p>

      <div class="pile">
        <button class="btn large" type="submit">Ranger ce livre</button>
        <button class="btn second large" type="button" onclick={recommencer}>Annuler</button>
      </div>
    </form>
  {:else if etape === 'fait' && ajoute}
    <div class="vide succes" role="status">
      <span class="grand" aria-hidden="true">✓</span>
      <strong>Livre rangé !</strong><br />{ajoute.lieu}
    </div>
    <div class="pile">
      <button class="btn large" onclick={recommencer}>Ajouter un autre livre</button>
      <a class="btn second large" href={`#/livre/${ajoute.id}`}>Voir le livre</a>
    </div>
  {/if}
</main>

<style>
  .choix {
    margin-top: 16px;
  }
  .alerte {
    margin: 12px 0 0;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--prete-bg);
    color: var(--prete-tx);
    font-weight: 600;
  }
  .trouve {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-bottom: 16px;
  }
  .etiquette {
    display: block;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .ou {
    margin: 22px 0 12px;
  }
  .succes .grand {
    color: var(--range-tx);
  }
</style>
