<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../lib/db';
  import { creerMega, compterLivresMega, listerMegas } from '../lib/depot';
  import { demander } from '../lib/dialogues.svelte';
  import { aller } from '../lib/routeur.svelte';
  import { joursDepuisSauvegarde, reglages } from '../lib/reglages.svelte';
  import EnTete from '../components/EnTete.svelte';

  const megas = liveQuery(async () => {
    const liste = await listerMegas();
    return Promise.all(
      liste.map(async (m) => ({ ...m, livres: await compterLivresMega(m.id!), biblios: await db.biblios.where({ megaId: m.id! }).count() }))
    );
  });
  const totalLivres = liveQuery(() => db.livres.count());

  const installee = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

  const jours = $derived(joursDepuisSauvegarde());
  const rappel = $derived(($totalLivres ?? 0) > 0 && (jours === null ? ($totalLivres ?? 0) >= 10 : jours >= reglages.rappelJours));

  async function nouveau() {
    const nom = await demander('Nouveau lieu', '', 'Par exemple : Maison principale', 'Créer');
    if (nom) aller({ page: 'mega', id: await creerMega(nom) });
  }

  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
</script>

<EnTete titre="Mes livres" aide="accueil" />

<main>
  {#if !installee}
    <a class="bandeau" href="#/installer">
      <span class="principal"><strong>Installez l’application</strong><br /><span class="doux">Pour garder vos livres en sécurité sur ce téléphone.</span></span>
      <span class="chevron">›</span>
    </a>
  {/if}

  {#if rappel}
    <a class="bandeau" href="#/options">
      <span class="principal">
        <strong>Pensez à sauvegarder</strong><br />
        <span class="doux">{jours === null ? 'Vous n’avez encore jamais fait de sauvegarde.' : `Dernière sauvegarde il y a ${jours} jours.`}</span>
      </span>
      <span class="chevron">›</span>
    </a>
  {/if}

  {#if $megas?.length}
    <ul class="liste">
      {#each $megas as m (m.id)}
        <li>
          <a class="carte element" href={`#/mega/${m.id}`}>
            <span aria-hidden="true" class="icone">🏠</span>
            <span class="principal">
              <span class="nom">{m.nom}</span><br />
              <span class="doux">{pluriel(m.biblios, 'bibliothèque')} · {pluriel(m.livres, 'livre')}</span>
            </span>
            <span class="chevron">›</span>
          </a>
        </li>
      {/each}
    </ul>
  {:else if $megas}
    <div class="vide">
      <span class="grand" aria-hidden="true">🏠</span>
      Commencez par créer un lieu,<br />par exemple « Maison principale ».
    </div>
  {/if}

  <button class="btn large ajout" onclick={nouveau}>＋ Nouveau lieu</button>
</main>

<style>
  .icone {
    font-size: 1.8rem;
  }
  .ajout {
    margin-top: 20px;
  }
  a.bandeau {
    color: inherit;
    text-decoration: none;
  }
</style>
