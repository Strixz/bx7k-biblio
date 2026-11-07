<script lang="ts">
  import { THEMES } from '../lib/themes';
  import { changerReglage, joursDepuisSauvegarde, reglages } from '../lib/reglages.svelte';
  import { partagerSauvegarde } from '../lib/partage';
  import { importerDonnees, ErreurSauvegarde } from '../lib/sauvegarde';
  import { chargerReglages } from '../lib/reglages.svelte';
  import { confirmer, informer, toast } from '../lib/dialogues.svelte';
  import { estAndroid } from '../lib/appareil.svelte';
  import EnTete from '../components/EnTete.svelte';

  let { sombreEffectif }: { sombreEffectif: boolean } = $props();
  let fichier: HTMLInputElement;
  let enCours = $state(false);

  const jours = $derived(joursDepuisSauvegarde());
  const RAPPELS = [7, 14, 30, 60, 90];

  async function exporter() {
    enCours = true;
    try {
      if (await partagerSauvegarde()) {
        await changerReglage('derniereSauvegarde', new Date().toISOString());
        toast('Sauvegarde faite ✓');
      }
    } catch {
      informer('La sauvegarde n’a pas marché', 'Réessayez dans un instant.');
    } finally {
      enCours = false;
    }
  }

  async function importer() {
    const f = fichier.files?.[0];
    fichier.value = '';
    if (!f) return;
    const ok = await confirmer(
      'Remplacer votre bibliothèque ?',
      'Tout ce qui est actuellement dans l’application sera remplacé par le contenu de cette sauvegarde.',
      'Remplacer',
      true
    );
    if (!ok) return;
    try {
      const r = await importerDonnees(await f.text());
      await chargerReglages();
      informer('Sauvegarde restaurée', `${r.livres} livre${r.livres > 1 ? 's' : ''} retrouvé${r.livres > 1 ? 's' : ''}.`);
    } catch (e) {
      informer('Impossible de lire ce fichier', e instanceof ErreurSauvegarde ? e.message : 'Le fichier semble abîmé.');
    }
  }
</script>

<EnTete titre="Options" aide="options" />

<main>
  <section>
    <h2>Couleurs</h2>
    <div class="themes" role="radiogroup" aria-label="Thème">
      {#each THEMES as t (t.id)}
        {@const c = sombreEffectif ? t.sombre : t.clair}
        <button role="radio" aria-checked={reglages.theme === t.id} class="theme" class:choisi={reglages.theme === t.id} onclick={() => changerReglage('theme', t.id)}>
          <span class="apercu" style:background={c.bg}>
            <span class="l" style:background={c.bo}></span>
            <span class="l court" style:background={c.se}></span>
            <span class="b" style:background={c.ac}></span>
          </span>
          <span class="nom">{t.nom}</span>
        </button>
      {/each}
    </div>

    <div class="carte ligne-reglage">
      <label for="sombre"><strong>Mode sombre</strong><br /><span class="doux">{reglages.sombre === null ? 'Suit le réglage du téléphone' : 'Choisi par vous'}</span></label>
      <input id="sombre" type="checkbox" role="switch" class="interrupteur" checked={sombreEffectif} onchange={(e) => changerReglage('sombre', e.currentTarget.checked)} />
    </div>
    {#if reglages.sombre !== null}
      <button class="lien" onclick={() => changerReglage('sombre', null)}>Revenir au réglage du téléphone</button>
    {/if}
  </section>

  <section class="section">
    <h2>Sauvegarde</h2>
    <p class="doux">
      {jours === null ? 'Aucune sauvegarde pour l’instant.' : jours === 0 ? 'Dernière sauvegarde : aujourd’hui.' : `Dernière sauvegarde : il y a ${jours} jour${jours > 1 ? 's' : ''}.`}
      {estAndroid
        ? 'La sauvegarde est un fichier : enregistrez-le dans Google Drive ou dans vos Fichiers, par exemple.'
        : 'La sauvegarde est un fichier : choisissez « Enregistrer dans Fichiers », puis iCloud Drive par exemple.'}
    </p>
    <div class="pile">
      <button class="btn large" onclick={exporter} disabled={enCours}>⬆︎ Faire une sauvegarde</button>
      <button class="btn second large" onclick={() => fichier.click()}>⬇︎ Restaurer une sauvegarde</button>
      <input bind:this={fichier} type="file" accept="application/json,.json" class="sr" onchange={importer} tabindex="-1" aria-hidden="true" />
    </div>
    <label class="champ rappel">
      <span>Me rappeler de sauvegarder après</span>
      <select value={reglages.rappelJours} onchange={(e) => changerReglage('rappelJours', Number(e.currentTarget.value))}>
        {#each RAPPELS as r (r)}<option value={r}>{r} jours</option>{/each}
      </select>
    </label>
  </section>

  <section class="section">
    <h2>Aide</h2>
    <div class="pile">
      <a class="btn second large" href="#/tutoriel">Revoir le tutoriel</a>
      <a class="btn second large" href="#/installer">Comment installer l’application</a>
    </div>
  </section>

  <section class="section">
    <h2>Vos données</h2>
    <p class="doux">
      Tout reste sur ce téléphone : pas de compte, pas de serveur. Seul le numéro ISBN d’un livre scanné est envoyé aux bases
      de livres publiques (Open Library, BnF, Google Books) pour retrouver son titre et son auteur.
    </p>
  </section>
</main>

<style>
  .themes {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 12px 0 16px;
  }
  .theme {
    border: 2px solid var(--bo);
    border-radius: var(--rayon);
    background: var(--su);
    padding: 0;
    overflow: hidden;
    cursor: pointer;
    text-align: left;
  }
  .theme.choisi {
    border-color: var(--ac);
    box-shadow: 0 0 0 2px var(--ac);
  }
  .apercu {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 78px;
    padding: 10px;
  }
  .l {
    height: 9px;
    width: 80%;
    border-radius: 5px;
  }
  .l.court {
    width: 55%;
  }
  .b {
    margin-top: auto;
    height: 20px;
    width: 65%;
    border-radius: 10px;
  }
  .nom {
    display: block;
    padding: 8px 10px;
    font-weight: 600;
    font-size: 0.95rem;
  }
  .ligne-reglage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    gap: 12px;
  }
  .interrupteur {
    appearance: none;
    width: 58px;
    height: 34px;
    border-radius: 17px;
    background: var(--bo);
    position: relative;
    flex: none;
    cursor: pointer;
    transition: background 0.2s;
  }
  .interrupteur::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
    transition: transform 0.2s;
  }
  .interrupteur:checked {
    background: var(--ac);
  }
  .interrupteur:checked::after {
    transform: translateX(24px);
  }
  .lien {
    margin-top: 8px;
    min-height: 44px;
    background: none;
    border: none;
    color: var(--ac);
    font-weight: 600;
    padding: 0;
    cursor: pointer;
  }
  .rappel {
    margin-top: 18px;
  }
</style>
