<script lang="ts">
  let { blob, titre, petite = false }: { blob?: Blob; titre: string; petite?: boolean } = $props();

  const url = $derived(blob ? URL.createObjectURL(blob) : undefined);
  $effect(() => {
    const u = url;
    return () => u && URL.revokeObjectURL(u);
  });
</script>

{#if url}
  <img src={url} alt={`Couverture de ${titre}`} class:petite />
{:else}
  <div class="sans" class:petite aria-hidden="true"><span>{titre.slice(0, 40)}</span></div>
{/if}

<style>
  img,
  .sans {
    width: 110px;
    height: 160px;
    flex: none;
    border-radius: 6px;
    object-fit: cover;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.18);
  }
  .sans {
    background: linear-gradient(160deg, var(--ac), color-mix(in srgb, var(--ac) 60%, #000));
    color: var(--sur-ac);
    font-family: var(--titre);
    font-weight: 700;
    font-size: 0.85rem;
    padding: 12px 10px;
    display: flex;
    align-items: center;
    text-align: center;
    overflow: hidden;
  }
  .petite {
    width: 70px;
    height: 100px;
  }
</style>
