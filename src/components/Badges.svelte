<script lang="ts">
  import type { Livre } from '../lib/types';

  let { livre }: { livre: Pick<Livre, 'statut' | 'pret' | 'infos'> } = $props();
</script>

<span class="badges">
  {#if livre.infos === 'en-attente-reseau'}
    <span class="b attente" title="Infos en attente de réseau">⏳ Attend le réseau</span>
  {:else if livre.infos === 'introuvable'}
    <span class="b attente">À compléter</span>
  {/if}
  {#if livre.statut === 'prete'}
    <span class="b prete">Prêté{livre.pret?.nom ? ` · ${livre.pret.nom}` : ''}</span>
  {:else if livre.statut === 'lecture'}
    <span class="b lecture">En lecture</span>
  {:else}
    <span class="b range">Rangé</span>
  {/if}
</span>

<style>
  .badges {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-end;
  }
  .b {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 10px;
    white-space: nowrap;
  }
  .range {
    background: var(--range-bg);
    color: var(--range-tx);
  }
  .lecture {
    background: var(--lecture-bg);
    color: var(--lecture-tx);
  }
  .prete {
    background: var(--prete-bg);
    color: var(--prete-tx);
  }
  .attente {
    background: var(--attente-bg);
    color: var(--attente-tx);
  }
</style>
