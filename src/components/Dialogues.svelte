<script lang="ts">
  import { dialogues } from '../lib/dialogues.svelte';

  let dialog: HTMLDialogElement | undefined = $state();
  let saisie = $state('');
  let resultat: string | boolean | null = null;

  $effect(() => {
    const d = dialogues.courant;
    if (d && dialog && !dialog.open) {
      saisie = d.saisie ?? '';
      resultat = null;
      dialog.showModal();
    }
  });

  function fermer(v: string | boolean | null) {
    resultat = v;
    dialog?.close();
  }

  function surFermeture() {
    const d = dialogues.courant;
    dialogues.courant = null;
    d?.resoudre(resultat);
  }
</script>

<dialog bind:this={dialog} onclose={surFermeture}>
  {#if dialogues.courant}
    {@const d = dialogues.courant}
    <form method="dialog" onsubmit={(e) => { e.preventDefault(); fermer(d.saisie !== undefined ? saisie : true); }}>
      <h2>{d.titre}</h2>
      {#if d.message}<p>{d.message}</p>{/if}
      {#if d.saisie !== undefined}
        <!-- svelte-ignore a11y_autofocus -->
        <input type="text" bind:value={saisie} placeholder={d.placeholder} autofocus enterkeyhint="done" />
      {/if}
      <div class="actions">
        {#if d.annuler}
          <button type="button" class="btn second" onclick={() => fermer(null)}>{d.annuler}</button>
        {/if}
        <button type="submit" class="btn" class:rouge={d.danger}>{d.ok}</button>
      </div>
    </form>
  {/if}
</dialog>

{#if dialogues.toast}
  <div class="toast" role="status">{dialogues.toast}</div>
{/if}

<style>
  dialog {
    border: none;
    border-radius: 20px;
    padding: 22px 20px 18px;
    width: min(92vw, 420px);
    background: var(--bg);
    color: var(--tx);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.45);
  }
  p {
    margin: 12px 0 0;
    font-size: 1.05rem;
  }
  input {
    margin-top: 14px;
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 22px;
  }
  .actions .btn {
    flex: 1;
    padding: 12px;
  }
  .rouge {
    background: var(--danger);
    color: #fff;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(var(--nav) + 16px);
    transform: translateX(-50%);
    background: var(--tx);
    color: var(--bg);
    padding: 12px 20px;
    border-radius: 24px;
    font-weight: 600;
    z-index: 50;
    max-width: 90vw;
    text-align: center;
  }
</style>
