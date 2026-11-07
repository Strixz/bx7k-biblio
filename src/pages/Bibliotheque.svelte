<script lang="ts">
  import { liveQuery } from 'dexie';
  import Sortable from 'sortablejs';
  import { db } from '../lib/db';
  import { compterLivresBiblio, deplacerLivre, deplacerVersEtagere, listerEtageres, livresEtagere, renommerBibliotheque, reordonnerEtageres, supprimerBibliotheque } from '../lib/depot';
  import { nomEtagere } from '../lib/etageres';
  import { confirmer, demander, toast } from '../lib/dialogues.svelte';
  import { aller } from '../lib/routeur.svelte';
  import EnTete from '../components/EnTete.svelte';
  import Badges from '../components/Badges.svelte';

  let { id }: { id: number } = $props();

  const donnees = $derived(
    liveQuery(async () => {
      const biblio = await db.biblios.get(id);
      if (!biblio) return null;
      const mega = await db.megas.get(biblio.megaId);
      const etageres = await Promise.all((await listerEtageres(id)).map(async (e) => ({ ...e, livres: await livresEtagere(e.id!) })));
      return { biblio, mega, etageres };
    })
  );

  /** Étagères regroupées : les deux rangées d'une double rangée se déplacent ensemble. */
  const groupes = $derived.by(() => {
    const res: { ordre: number; etageres: NonNullable<typeof $donnees>['etageres'] }[] = [];
    for (const e of $donnees?.etageres ?? []) {
      if (res.at(-1)?.ordre === e.ordre) res.at(-1)!.etageres.push(e);
      else res.push({ ordre: e.ordre, etageres: [e] });
    }
    return res;
  });

  /** Glisser-déposer des étagères par leur poignée, même principe que pour les livres. */
  function triableEtageres(node: HTMLElement) {
    const s = Sortable.create(node, {
      group: 'etageres',
      handle: '.poignee-etagere',
      draggable: '.groupe',
      animation: 150,
      forceFallback: true,
      // Le fantôme qui suit le doigt va dans <body> : dans la liste, il fausserait la position d'arrivée.
      fallbackOnBody: true,
      fallbackTolerance: 4,
      scroll: true,
      bubbleScroll: true,
      scrollSensitivity: 90,
      ghostClass: 'fantome',
      chosenClass: 'choisi',
      dragClass: 'glisse',
      async onEnd(evt) {
        const de = evt.from as HTMLElement;
        const blocs = [...de.querySelectorAll(':scope > .groupe')].filter((x) => x !== evt.item);
        const prec = blocs[evt.oldDraggableIndex! - 1];
        de.insertBefore(evt.item, prec ? prec.nextSibling : (blocs[0] ?? null));
        if (evt.oldDraggableIndex === evt.newDraggableIndex) return;
        const ordres = groupes.map((g) => g.ordre);
        const [deplace] = ordres.splice(evt.oldDraggableIndex!, 1);
        ordres.splice(evt.newDraggableIndex!, 0, deplace);
        await reordonnerEtageres(id, ordres);
      }
    });
    return { destroy: () => s.destroy() };
  }

  /** Étagères ouvertes. Par défaut, la première. */
  let ouvertes = $state(new Set<number>());
  let initialise = false;
  $effect(() => {
    if (!initialise && $donnees?.etageres.length) {
      initialise = true;
      ouvertes = new Set([$donnees.etageres[0].id!]);
    }
  });

  function basculer(eid: number) {
    const s = new Set(ouvertes);
    if (s.has(eid)) s.delete(eid);
    else s.add(eid);
    ouvertes = s;
  }

  /** Glisser-déposer : SortableJS déplace l'élément, on le remet en place et on laisse les données redessiner. */
  function triable(node: HTMLElement, opts: { etagereId: number; enTete?: boolean }) {
    const s = Sortable.create(node, {
      // Seuls les livres peuvent être lâchés ici (pas une étagère qu'on déplace).
      group: { name: 'livres', pull: !opts.enTete, put: ['livres'] },
      sort: !opts.enTete,
      handle: '.poignee',
      draggable: '.ligne',
      animation: 150,
      forceFallback: true,
      fallbackTolerance: 4,
      scroll: true,
      bubbleScroll: true,
      scrollSensitivity: 90,
      ghostClass: 'fantome',
      chosenClass: 'choisi',
      dragClass: 'glisse',
      async onEnd(evt) {
        const livreId = Number(evt.item.dataset.id);
        const de = evt.from as HTMLElement;
        const vers = evt.to as HTMLElement;
        const lignes = [...de.querySelectorAll(':scope > .ligne')].filter((x) => x !== evt.item);
        const prec = lignes[evt.oldDraggableIndex! - 1];
        de.insertBefore(evt.item, prec ? prec.nextSibling : (lignes[0] ?? null));

        const versEtagere = Number(vers.dataset.etagere);
        if (vers.dataset.entete === 'oui') {
          await deplacerVersEtagere(livreId, versEtagere);
          const e = $donnees?.etageres.find((x) => x.id === versEtagere);
          toast(`Livre déplacé sur « ${e ? nomEtagere(e) : ''} »`);
        } else if (de !== vers || evt.oldDraggableIndex !== evt.newDraggableIndex) {
          await deplacerLivre(livreId, versEtagere, evt.newDraggableIndex!);
        }
      }
    });
    return { destroy: () => s.destroy() };
  }

  async function renommer() {
    const n = await demander('Renommer la bibliothèque', $donnees?.biblio.nom ?? '', 'Par exemple : Salon gauche', 'Renommer');
    if (n) await renommerBibliotheque(id, n);
  }

  async function supprimer() {
    const n = await compterLivresBiblio(id);
    const ok = await confirmer(
      `Supprimer « ${$donnees?.biblio.nom} » ?`,
      n ? `Ses ${n} livre${n > 1 ? 's' : ''} seront effacés de l’application. Cette action est définitive.` : 'Cette bibliothèque est vide.',
      'Supprimer',
      true
    );
    if (ok) {
      const megaId = $donnees?.biblio.megaId;
      await supprimerBibliotheque(id);
      aller(megaId ? { page: 'mega', id: megaId } : { page: 'accueil' }, true);
    }
  }
</script>

{#if $donnees}
  {@const { biblio, mega, etageres } = $donnees}
  <EnTete titre={biblio.nom} chemin={mega ? [{ nom: mega.nom, href: `#/mega/${mega.id}` }] : []} aide="biblio" retour={`#/mega/${biblio.megaId}`} />

  <main>
    {#if !etageres.length}
      <div class="vide">
        <span class="grand" aria-hidden="true">📚</span>
        Ce meuble n’a pas encore d’étagère.<br />Ajoutez-les une par une.
      </div>
    {/if}
    <div class="etageres" use:triableEtageres>
      {#each groupes as g (g.ordre)}
        <div class="groupe">
          {#each g.etageres as e (e.id)}
            {@const ouverte = ouvertes.has(e.id!)}
            <section class="carte etagere">
              <div class="entete" data-etagere={e.id} data-entete="oui" use:triable={{ etagereId: e.id!, enTete: true }}>
                {#if etageres.length > 1}
                  <span class="poignee poignee-etagere" aria-label="Déplacer cette étagère" role="img">⋮⋮</span>
                {/if}
                <button class="titre" onclick={() => basculer(e.id!)} aria-expanded={ouverte}>
                  <span class="nom">{nomEtagere(e)}</span>
                  <span class="doux">{e.livres.length} livre{e.livres.length > 1 ? 's' : ''} {ouverte ? '▾' : '▸'}</span>
                </button>
              </div>
    
              {#if ouverte}
                {#if e.sens === 'haut-bas' && e.livres.length}
                  <p class="sens doux">Du haut de la pile vers le bas</p>
                {/if}
                <ol class="livres" data-etagere={e.id} use:triable={{ etagereId: e.id! }}>
                  {#each e.livres as l, i (l.id)}
                    <li class="ligne" data-id={l.id}>
                      <span class="poignee" aria-label="Déplacer ce livre" role="img">⋮⋮</span>
                      <span class="pos" aria-hidden="true">{i + 1}</span>
                      <a class="infos" href={`#/livre/${l.id}`}>
                        <span class="t">{l.titre}</span>
                        {#if l.auteur}<span class="doux">{l.auteur}</span>{/if}
                      </a>
                      <Badges livre={l} />
                    </li>
                  {/each}
                </ol>
                {#if !e.livres.length}
                  <p class="vide-etagere doux">Étagère vide. Faites glisser un livre ici ou scannez-en.</p>
                {/if}
                <div class="actions">
                  <a class="lien" href={`#/serie/${e.id}`}>📷 Scanner des livres ici</a>
                  <a class="lien" href={`#/ajouter/${e.id}`}>＋ Un livre</a>
                  <a class="lien" href={`#/etagere/${e.id}`}>✎ Modifier</a>
                </div>
              {/if}
            </section>
          {/each}
        </div>
      {/each}
    </div>

    <a class="btn large ajout" href={`#/nouvelle-etagere/${id}`}>＋ Ajouter une étagère</a>

    <div class="section pile">
      <button class="btn second large" onclick={renommer}>Renommer cette bibliothèque</button>
      <button class="btn danger large" onclick={supprimer}>Supprimer cette bibliothèque</button>
    </div>
  </main>
{:else if $donnees === null}
  <EnTete titre="Bibliothèque introuvable" aide="biblio" retour="#/" />
{/if}

<style>
  .ajout {
    margin-top: 16px;
  }
  .etageres {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .etagere {
    overflow: hidden;
  }
  .groupe {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .entete {
    position: relative;
    display: flex;
    align-items: center;
  }
  /* Même colonne à gauche que la poignée des livres. */
  .poignee-etagere {
    margin-right: -16px;
  }
  .titre {
    width: 100%;
    min-height: 60px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .titre .nom {
    font-family: var(--titre);
    font-weight: 700;
    font-size: 1.1rem;
  }
  /* L'en-tête accepte aussi un livre : il est alors mis en fin d'étagère. */
  .entete > :global(.ligne) {
    display: none !important;
  }
  .entete:has(> :global(.fantome)) {
    background: color-mix(in srgb, var(--ac) 18%, var(--su));
    outline: 3px dashed var(--ac);
    outline-offset: -3px;
  }
  .sens {
    margin: 0 16px 6px;
  }
  .livres {
    list-style: none;
    margin: 0;
    padding: 0;
    min-height: 12px;
  }
  .ligne {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px 6px 0;
    border-top: 1px solid var(--bo);
    background: var(--su);
    min-height: 64px;
  }
  .pos {
    width: 1.6em;
    flex: none;
    margin-left: -10px;
    text-align: right;
    color: var(--doux);
    font-size: 0.9rem;
  }
  .infos {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    color: inherit;
    text-decoration: none;
    padding: 4px 0;
  }
  .t {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .poignee {
    flex: none;
    width: 48px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--doux);
    font-size: 1.3rem;
    letter-spacing: -3px;
    touch-action: none;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
  }
  :global(.fantome) {
    opacity: 0.35;
  }
  :global(.glisse) {
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
    border: 2px solid var(--ac) !important;
    border-radius: 10px;
    opacity: 1 !important;
  }
  .vide-etagere {
    margin: 0;
    padding: 8px 16px 4px;
    border-top: 1px solid var(--bo);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    padding: 10px 16px 14px;
    border-top: 1px solid var(--bo);
  }
  .lien {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    background: none;
    border: none;
    padding: 0;
    color: var(--ac);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }
</style>
