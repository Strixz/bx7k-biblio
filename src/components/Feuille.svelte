<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    titre: string;
    onfermer: () => void;
    children: Snippet;
  }

  let { titre, onfermer, children }: Props = $props();
  let dialog: HTMLDialogElement;

  $effect(() => {
    dialog.showModal();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} onclose={onfermer} onclick={(e) => e.target === dialog && dialog.close()}>
  <div class="contenu">
    <div class="tete">
      <h2>{titre}</h2>
      <button class="fermer" onclick={() => dialog.close()} aria-label="Fermer">✕</button>
    </div>
    {@render children()}
  </div>
</dialog>

<style>
  dialog {
    border: none;
    padding: 0;
    margin: auto auto 0;
    width: 100%;
    max-width: 640px;
    max-height: 88dvh;
    border-radius: 22px 22px 0 0;
    background: var(--bg);
    color: var(--tx);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.45);
  }
  .contenu {
    padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
  }
  .tete {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .fermer {
    width: 44px;
    height: 44px;
    flex: none;
    border-radius: 50%;
    border: none;
    background: var(--se);
    font-size: 1.1rem;
    cursor: pointer;
  }
</style>
