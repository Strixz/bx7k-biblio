<script lang="ts">
  import { nomEtagere } from '../lib/etageres';
  import { onMount } from 'svelte';
  import { db } from '../lib/db';
  import { deplacerVersEtagere, emplacement, majLivre, supprimerLivre, trouverDoublon } from '../lib/depot';
  import { chercherInfos, titreProvisoire } from '../lib/infos';
  import { confirmer, informer, toast } from '../lib/dialogues.svelte';
  import { aller } from '../lib/routeur.svelte';
  import type { Emplacement, Livre, Statut } from '../lib/types';
  import EnTete from '../components/EnTete.svelte';
  import Badges from '../components/Badges.svelte';
  import EditeurGenres from '../components/EditeurGenres.svelte';
  import ChoixEmplacement from '../components/ChoixEmplacement.svelte';
  import Couverture from '../components/Couverture.svelte';

  let { id }: { id: number } = $props();

  let livre: Livre | undefined = $state();
  let lieu: Emplacement | undefined = $state();
  let introuvable = $state(false);
  let changerLieu = $state(false);
  let enCours = $state(false);

  // Champs modifiables
  let titre = $state('');
  let auteur = $state('');
  let genres: string[] = $state([]);
  let statut: Statut = $state('range');
  let pretNom = $state('');
  let pretDate = $state('');
  let note = $state('');
  let etagereId: number | undefined = $state();

  const aujourdhui = () => new Date().toISOString().slice(0, 10);

  async function charger() {
    const l = await db.livres.get(id);
    if (!l) {
      introuvable = true;
      return;
    }
    livre = l;
    lieu = await emplacement(l.etagereId);
    ({ titre, auteur, statut, note, etagereId } = l);
    genres = [...l.genres];
    pretNom = l.pret?.nom ?? '';
    pretDate = l.pret?.date ?? aujourdhui();
  }

  onMount(charger);

  const position = $derived(livre ? livre.position + 1 : 0);

  function choisirStatut(s: Statut) {
    statut = s;
    if (s === 'prete' && !pretDate) pretDate = aujourdhui();
  }

  async function enregistrer() {
    if (!livre) return;
    if (!titre.trim()) return informer('Il manque le titre', 'Écrivez le titre du livre avant d’enregistrer.');
    if (statut === 'prete' && !pretNom.trim()) return informer('À qui l’avez-vous prêté ?', 'Écrivez le nom de la personne.');
    const doublon = await trouverDoublon({ titre, auteur }, id);
    if (doublon && (titre !== livre.titre || auteur !== livre.auteur)) {
      const e = await emplacement(doublon.etagereId);
      const ok = await confirmer('Vous avez déjà ce livre', `Il est rangé : ${e?.mega.nom} › ${e?.biblio.nom} › ${e ? nomEtagere(e.etagere) : ''}. Enregistrer quand même ?`, 'Enregistrer');
      if (!ok) return;
    }
    await majLivre(id, {
      titre: titre.trim(),
      auteur: auteur.trim(),
      genres: $state.snapshot(genres),
      statut,
      pret: statut === 'prete' ? { nom: pretNom.trim(), date: pretDate || aujourdhui() } : undefined,
      note,
      // Saisir soi-même le titre d'un livre introuvable le rend « complet ».
      ...(livre.infos === 'introuvable' && livre.isbn && titre.trim() !== titreProvisoire(livre.isbn) && { infos: 'manuel' as const })
    });
    if (etagereId && etagereId !== livre.etagereId) await deplacerVersEtagere(id, etagereId);
    toast('Enregistré ✓');
    history.back();
  }

  async function reessayer() {
    if (!livre?.isbn) return;
    enCours = true;
    const r = await chercherInfos(livre.isbn);
    enCours = false;
    if (r.infos === 'en-attente-reseau') return informer('Toujours pas de réseau', 'Le livre sera complété automatiquement quand internet reviendra.');
    if (r.infos === 'introuvable') {
      await majLivre(id, { infos: 'introuvable' });
      await charger();
      return informer('Livre introuvable', 'Ce livre n’est pas connu des bases de livres. Vous pouvez écrire son titre et son auteur vous-même.');
    }
    await majLivre(id, {
      infos: 'completes',
      titre: livre.titre === titreProvisoire(livre.isbn) ? r.titre : livre.titre,
      auteur: livre.auteur || r.auteur,
      genres: [...new Set([...livre.genres, ...r.genres])],
      ...(!livre.couverture && r.couverture && { couverture: r.couverture })
    });
    await charger();
    toast('Livre complété ✓');
  }

  async function supprimer() {
    if (await confirmer(`Supprimer « ${livre?.titre} » ?`, 'Le livre sera effacé de l’application.', 'Supprimer', true)) {
      const retour = lieu?.biblio.id;
      await supprimerLivre(id);
      aller(retour ? { page: 'biblio', id: retour } : { page: 'accueil' }, true);
    }
  }

  const STATUTS: { s: Statut; nom: string }[] = [
    { s: 'range', nom: 'Rangé' },
    { s: 'lecture', nom: 'En lecture' },
    { s: 'prete', nom: 'Prêté' }
  ];
</script>

{#if livre}
  <EnTete
    titre={livre.titre}
    chemin={lieu ? [{ nom: lieu.mega.nom, href: `#/mega/${lieu.mega.id}` }, { nom: lieu.biblio.nom, href: `#/biblio/${lieu.biblio.id}` }] : []}
    aide="livre"
    retour={lieu ? `#/biblio/${lieu.biblio.id}` : '#/'}
  />
  <main>
    <div class="haut">
      <Couverture blob={livre.couverture} titre={livre.titre} />
      <div class="resume">
        <Badges {livre} />
        {#if lieu}
          <p><strong>Rangé ici :</strong><br />{lieu.biblio.nom} › {nomEtagere(lieu.etagere)}<br /><span class="doux">{lieu.etagere.sens === 'haut-bas' ? `${position}ᵉ depuis le haut` : `${position}ᵉ en partant de la gauche`}</span></p>
        {/if}
        {#if livre.isbn}<p class="doux">ISBN {livre.isbn}</p>{/if}
      </div>
    </div>

    {#if livre.infos === 'en-attente-reseau' || livre.infos === 'introuvable'}
      <div class="bandeau">
        <div class="principal">
          {#if livre.infos === 'en-attente-reseau'}
            <strong>Infos en attente de réseau</strong><br />
            <span class="doux">Le livre a été scanné sans internet. Il sera complété automatiquement dès que le réseau reviendra.</span>
          {:else}
            <strong>Livre introuvable</strong><br />
            <span class="doux">Les bases de livres ne le connaissent pas : écrivez son titre et son auteur ci-dessous.</span>
          {/if}
        </div>
        {#if livre.isbn}
          <button class="btn second" onclick={reessayer} disabled={enCours}>{enCours ? '…' : 'Réessayer'}</button>
        {/if}
      </div>
    {/if}

    <label class="champ"><span>Titre</span><input type="text" bind:value={titre} /></label>
    <label class="champ"><span>Auteur</span><input type="text" bind:value={auteur} /></label>

    <div class="champ">
      <span class="etiquette">Où en est ce livre ?</span>
      <div class="segments" role="radiogroup" aria-label="Statut">
        {#each STATUTS as x (x.s)}
          <button type="button" role="radio" aria-checked={statut === x.s} class:actif={statut === x.s} onclick={() => choisirStatut(x.s)}>{x.nom}</button>
        {/each}
      </div>
    </div>
    {#if statut === 'prete'}
      <div class="carte pret">
        <label class="champ"><span>Prêté à</span><input type="text" bind:value={pretNom} placeholder="Nom de la personne" /></label>
        <label class="champ"><span>Depuis le</span><input type="date" bind:value={pretDate} /></label>
      </div>
    {/if}

    <div class="champ">
      <span class="etiquette">Genres</span>
      <EditeurGenres bind:genres />
    </div>

    <label class="champ"><span>Note</span><textarea bind:value={note} placeholder="Édition, dédicace, état du livre, à qui il appartient…"></textarea></label>

    <div class="champ">
      {#if changerLieu}
        <span class="etiquette">Nouvel emplacement</span>
        <ChoixEmplacement bind:etagereId />
      {:else}
        <button type="button" class="btn second large" onclick={() => (changerLieu = true)}>Ranger ailleurs (autre bibliothèque)</button>
      {/if}
    </div>

    <div class="pile bas">
      <button class="btn large" onclick={enregistrer}>Enregistrer</button>
      <button class="btn danger large" onclick={supprimer}>Supprimer ce livre</button>
    </div>
  </main>
{:else if introuvable}
  <EnTete titre="Livre introuvable" aide="livre" retour="#/" />
  <main><p>Ce livre n’existe plus.</p></main>
{/if}

<style>
  .haut {
    display: flex;
    gap: 16px;
    margin-bottom: 18px;
  }
  .resume {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .resume p {
    margin: 4px 0 0;
  }
  .etiquette {
    display: block;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .segments {
    display: flex;
    border-radius: 14px;
    background: var(--se);
    padding: 4px;
    gap: 4px;
  }
  .segments button {
    flex: 1;
    min-height: 48px;
    border: none;
    border-radius: 11px;
    background: transparent;
    font-weight: 600;
    cursor: pointer;
  }
  .segments .actif {
    background: var(--ac);
    color: var(--sur-ac);
  }
  .pret {
    padding: 14px 14px 0;
    margin: -4px 0 16px;
  }
  .bas {
    margin-top: 12px;
  }
</style>
