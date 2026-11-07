<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../lib/db';
  import { compterEtageres, compterLivresBiblio, compterLivresMega, creerBibliotheque, listerBibliotheques, renommerMega, supprimerMega } from '../lib/depot';
  import { confirmer, demander } from '../lib/dialogues.svelte';
  import { aller } from '../lib/routeur.svelte';
  import EnTete from '../components/EnTete.svelte';

  let { id }: { id: number } = $props();

  const mega = $derived(liveQuery(() => db.megas.get(id)));
  const biblios = $derived(
    liveQuery(async () =>
      Promise.all(
        (await listerBibliotheques(id)).map(async (b) => ({ ...b, livres: await compterLivresBiblio(b.id!), etageres: await compterEtageres(b.id!) }))
      )
    )
  );

  async function nouvelle() {
    const nom = await demander('Nouvelle bibliothèque', '', 'Par exemple : Salon gauche', 'Créer');
    if (nom) aller({ page: 'nouvelle-etagere', id: await creerBibliotheque(id, nom) });
  }

  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  async function renommer() {
    const nom = await demander('Renommer le lieu', $mega?.nom ?? '', '', 'Renommer');
    if (nom) await renommerMega(id, nom);
  }

  async function supprimer() {
    const n = await compterLivresMega(id);
    const ok = await confirmer(
      `Supprimer « ${$mega?.nom} » ?`,
      n
        ? `Ses bibliothèques et ses ${n} livre${n > 1 ? 's' : ''} seront effacés de l’application. Cette action est définitive.`
        : 'Ce lieu et ses bibliothèques vides seront supprimés.',
      'Supprimer',
      true
    );
    if (ok) {
      await supprimerMega(id);
      aller({ page: 'accueil' }, true);
    }
  }
</script>

<EnTete titre={$mega?.nom ?? ''} aide="mega" retour="#/" />

<main>
  {#if $biblios?.length}
    <ul class="liste">
      {#each $biblios as b (b.id)}
        <li>
          <a class="carte element" href={`#/biblio/${b.id}`}>
            <span aria-hidden="true" class="icone">📚</span>
            <span class="principal">
              <span class="nom">{b.nom}</span><br />
              <span class="doux">{pluriel(b.etageres, 'étagère')} · {pluriel(b.livres, 'livre')}</span>
            </span>
            <span class="chevron">›</span>
          </a>
        </li>
      {/each}
    </ul>
  {:else if $biblios}
    <div class="vide">
      <span class="grand" aria-hidden="true">📚</span>
      Ajoutez une bibliothèque,<br />par exemple « Salon gauche » ou « Chambre ».
    </div>
  {/if}

  <button class="btn large ajout" onclick={nouvelle}>＋ Nouvelle bibliothèque</button>

  <div class="section pile">
    <button class="btn second large" onclick={renommer}>Renommer ce lieu</button>
    <button class="btn danger large" onclick={supprimer}>Supprimer ce lieu</button>
  </div>
</main>

<style>
  .icone {
    font-size: 1.8rem;
  }
  .ajout {
    margin-top: 20px;
  }
</style>
