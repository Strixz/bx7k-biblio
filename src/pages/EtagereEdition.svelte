<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../lib/db';
  import {
    compterLivresGroupe,
    creerEtagere,
    groupeEtagere,
    livresDerriere,
    modifierEtagere,
    nomParDefaut,
    supprimerEtagere
  } from '../lib/depot';
  import { confirmer, informer, toast } from '../lib/dialogues.svelte';
  import { aller } from '../lib/routeur.svelte';
  import type { Bibliotheque, Etagere, FormeEtagere, MegaCollection } from '../lib/types';
  import EnTete from '../components/EnTete.svelte';

  /** Création (biblioId) ou modification (id d'une des rangées) d'une étagère. */
  let { biblioId, id }: { biblioId?: number; id?: number } = $props();

  let biblio: Bibliotheque | undefined = $state();
  let mega: MegaCollection | undefined = $state();
  let nom = $state('');
  let forme = $state<FormeEtagere>('simple');
  /** Tant que le nom proposé n'a pas été touché, il suit la forme (« Étagère 2 » ↔ « Pile 1 »). */
  let nomTouche = $state(false);
  let formeInitiale = $state<FormeEtagere>('simple');
  let derriere = $state(0);
  let creee: Etagere[] = $state([]);

  const FORMES: { forme: FormeEtagere; titre: string; texte: string; dessin: string }[] = [
    { forme: 'simple', titre: 'Étagère simple', texte: 'Une rangée de livres debout', dessin: '▤' },
    { forme: 'double', titre: 'Double rangée', texte: 'Des livres devant et d’autres derrière', dessin: '⧉' },
    { forme: 'pile', titre: 'Pile', texte: 'Des livres couchés les uns sur les autres', dessin: '☰' }
  ];

  onMount(async () => {
    let bid = biblioId;
    if (id) {
      const groupe = await groupeEtagere(id);
      if (!groupe.length) return aller({ page: 'accueil' }, true);
      ({ nom, forme } = groupe[0]);
      formeInitiale = forme;
      nomTouche = true;
      bid = groupe[0].biblioId;
      derriere = await livresDerriere(id);
    }
    biblio = await db.biblios.get(bid!);
    if (!biblio) return aller({ page: 'accueil' }, true);
    mega = await db.megas.get(biblio.megaId);
    if (!id) nom = await nomParDefaut(biblio.id!, forme);
  });

  async function choisirForme(f: FormeEtagere) {
    forme = f;
    if (!nomTouche && biblio) nom = await nomParDefaut(biblio.id!, f);
  }

  const perdDerriere = $derived(!!id && formeInitiale === 'double' && forme !== 'double' && derriere > 0);

  async function valider(e: Event) {
    e.preventDefault();
    if (!biblio) return;
    if (!nom.trim()) return informer('Il manque le nom', 'Donnez un nom à cette étagère, par exemple « Étagère du haut ».');
    if (id) {
      await modifierEtagere(id, nom, forme);
      toast('Étagère modifiée ✓');
      aller({ page: 'biblio', id: biblio.id! }, true);
    } else {
      creee = await groupeEtagere(await creerEtagere(biblio.id!, nom, forme));
      scrollTo(0, 0);
    }
  }

  async function encoreUne() {
    creee = [];
    nomTouche = false;
    nom = await nomParDefaut(biblio!.id!, forme);
  }

  async function supprimer() {
    const n = await compterLivresGroupe(id!);
    const ok = await confirmer(
      `Supprimer « ${nom} » ?`,
      n === 0
        ? 'Cette étagère est vide.'
        : n === 1
          ? 'Le livre rangé sur cette étagère sera supprimé avec elle.'
          : `Les ${n} livres rangés sur cette étagère seront supprimés avec elle.`,
      'Supprimer',
      true
    );
    if (!ok) return;
    const sur = await confirmer(
      'Vraiment supprimer ?',
      `« ${nom} »${n === 1 ? ' et son livre seront effacés' : n ? ` et ses ${n} livres seront effacés` : ' sera effacée'} définitivement. Il ne sera pas possible de revenir en arrière.`,
      'Oui, supprimer définitivement',
      true
    );
    if (!sur) return;
    await supprimerEtagere(id!);
    toast('Étagère supprimée');
    aller({ page: 'biblio', id: biblio!.id! }, true);
  }
</script>

<EnTete
  titre={creee.length ? 'Étagère ajoutée' : id ? 'Modifier l’étagère' : 'Nouvelle étagère'}
  chemin={[
    ...(mega ? [{ nom: mega.nom, href: `#/mega/${mega.id}` }] : []),
    ...(biblio ? [{ nom: biblio.nom, href: `#/biblio/${biblio.id}` }] : [])
  ]}
  aide="etagere"
  retour={biblio ? `#/biblio/${biblio.id}` : '#/'}
/>

<main>
  {#if creee.length}
    <div class="carte bravo">
      <span class="grand" aria-hidden="true">✓</span>
      <p><strong>« {creee[0].nom} » est ajoutée</strong> à « {biblio?.nom} ».</p>
    </div>
    <h2>Et maintenant ?</h2>
    <div class="pile">
      {#each creee as e (e.id)}
        <a class="btn large" href={`#/serie/${e.id}`}>
          📷 {e.rangee ? `Scanner la rangée de ${e.rangee === 'devant' ? 'devant' : 'derrière'}` : 'Scanner les livres de cette étagère'}
        </a>
      {/each}
      <button class="btn second large" onclick={encoreUne}>＋ Créer une autre étagère</button>
      <a class="btn second large" href={`#/biblio/${biblio?.id}`}>✓ Le meuble est terminé</a>
    </div>
  {:else}
    <form onsubmit={valider}>
      {#if !id}
        <p class="doux intro">Ajoutez les étagères de votre meuble une par une, par exemple de haut en bas.</p>
      {/if}

      <fieldset>
        <legend>À quoi ressemble cette étagère ?</legend>
        <div class="formes">
          {#each FORMES as f (f.forme)}
            <label class="carte forme" class:choisi={forme === f.forme}>
              <input type="radio" name="forme" value={f.forme} checked={forme === f.forme} onchange={() => choisirForme(f.forme)} class="sr" />
              <span class="dessin" aria-hidden="true">{f.dessin}</span>
              <span class="texte"><strong>{f.titre}</strong><br /><span class="doux">{f.texte}</span></span>
            </label>
          {/each}
        </div>
      </fieldset>

      <label class="champ">
        <span>Nom</span>
        <input type="text" bind:value={nom} oninput={() => (nomTouche = true)} placeholder="Par exemple : Étagère du haut" />
      </label>

      {#if perdDerriere}
        <div class="bandeau avertissement">
          <span class="principal">
            {derriere > 1
              ? `Les ${derriere} livres de la rangée de derrière seront mis à la suite de ceux de devant.`
              : 'Le livre de la rangée de derrière sera mis à la suite de ceux de devant.'}
          </span>
        </div>
      {/if}

      <button class="btn large" type="submit">{id ? 'Enregistrer' : 'Créer l’étagère'}</button>
    </form>

    {#if id}
      <div class="section">
        <button class="btn danger large" onclick={supprimer}>Supprimer cette étagère</button>
      </div>
    {/if}
  {/if}
</main>

<style>
  .intro {
    margin: 0 0 14px;
  }
  fieldset {
    border: none;
    padding: 0;
    margin: 0 0 16px;
  }
  legend {
    font-weight: 600;
    margin-bottom: 8px;
  }
  .formes {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .forme {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    cursor: pointer;
    border-width: 2px;
  }
  .forme.choisi {
    border-color: var(--ac);
    background: color-mix(in srgb, var(--ac) 8%, var(--su));
  }
  .forme:has(:focus-visible) {
    outline: 3px solid color-mix(in srgb, var(--ac) 60%, transparent);
  }
  .dessin {
    font-size: 2rem;
    color: var(--ac);
    line-height: 1;
    width: 2.2rem;
    text-align: center;
    flex: none;
  }
  .bravo {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    margin-bottom: 18px;
  }
  .bravo p {
    margin: 0;
  }
  .grand {
    font-size: 2rem;
    color: var(--ac);
    font-weight: 700;
  }
  h2 {
    margin: 0 0 10px;
  }
</style>
