<script lang="ts">
  import type { IScannerControls } from '@zxing/browser';
  import { estAndroid } from '../lib/appareil.svelte';

  interface Props {
    /** Appelé à chaque code-barres lu (le même code peut revenir plusieurs fois). */
    oncode: (code: string) => void;
  }

  let { oncode }: Props = $props();
  let video: HTMLVideoElement;
  let erreur = $state('');
  let controlesActifs: IScannerControls | undefined = $state();
  let lampe = $state(false);

  // On retient le choix de la lampe pour le prochain scan (réglage gardé sur l'appareil).
  const CLE_LAMPE = 'biblio-lampe';
  function lampeRetenue() {
    try {
      return localStorage.getItem(CLE_LAMPE) === '1';
    } catch {
      return false;
    }
  }

  async function allumerLampe(allumee: boolean) {
    try {
      await controlesActifs?.switchTorch?.(allumee);
      lampe = allumee;
    } catch {
      lampe = false;
    }
  }

  async function basculerLampe() {
    await allumerLampe(!lampe);
    try {
      localStorage.setItem(CLE_LAMPE, lampe ? '1' : '0');
    } catch {
      /* rien : le choix ne sera simplement pas retenu */
    }
  }

  $effect(() => {
    let controles: IScannerControls | undefined;
    let arrete = false;
    // Le lecteur de codes-barres est lourd : on ne le charge qu'à l'ouverture de la caméra.
    Promise.all([import('@zxing/browser'), import('@zxing/library')])
      .then(([{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }]) => {
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]);
        const lecteur = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        return lecteur.decodeFromConstraints({ video: { facingMode: 'environment' }, audio: false }, video, (r) => {
          if (r) oncode(r.getText());
        });
      })
      .then((c) => {
        if (arrete) return c.stop();
        controles = controlesActifs = c;
        if (c.switchTorch && lampeRetenue()) allumerLampe(true);
      })
      .catch((e: Error) => {
        erreur =
          e.name === 'NotAllowedError'
            ? estAndroid
              ? 'L’application n’a pas le droit d’utiliser l’appareil photo. Ouvrez Paramètres › Applications › Chrome › Autorisations › Appareil photo et choisissez « Autoriser », puis revenez ici.'
              : 'L’application n’a pas le droit d’utiliser l’appareil photo. Ouvrez Réglages › Safari › Appareil photo et choisissez « Autoriser », puis revenez ici.'
            : 'Impossible d’allumer l’appareil photo. Vous pouvez saisir le livre à la main.';
      });
    return () => {
      arrete = true;
      controlesActifs = undefined;
      controles?.stop();
    };
  });
</script>

<div class="cadre">
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={video} playsinline muted autoplay></video>
  {#if erreur}
    <p class="erreur">{erreur}</p>
  {:else}
    <div class="viseur" aria-hidden="true"></div>
    <p class="consigne">Visez le code-barres au dos du livre</p>
    {#if controlesActifs?.switchTorch}
      <button
        type="button"
        class="lampe"
        class:allumee={lampe}
        aria-pressed={lampe}
        aria-label={lampe ? 'Éteindre la lampe' : 'Allumer la lampe'}
        onclick={basculerLampe}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path
            d="M7 2h10v4l-3 4v11a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V10L7 6z"
            fill={lampe ? 'currentColor' : 'none'}
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path d="M12 13v3" stroke={lampe ? '#1d1713' : 'currentColor'} stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <span>{lampe ? 'Lampe allumée' : 'Lampe'}</span>
      </button>
    {/if}
  {/if}
</div>

<style>
  .cadre {
    position: relative;
    border-radius: var(--rayon);
    overflow: hidden;
    background: #1d1713;
    aspect-ratio: 4 / 3;
  }
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .viseur {
    position: absolute;
    inset: 30% 12%;
    border: 3px solid rgb(255 255 255 / 0.9);
    border-radius: 12px;
    box-shadow: 0 0 0 999px rgb(0 0 0 / 0.25);
  }
  .consigne {
    position: absolute;
    bottom: 8px;
    left: 0;
    right: 0;
    margin: 0;
    text-align: center;
    color: #fff;
    font-weight: 600;
    text-shadow: 0 1px 3px #000;
  }
  .lampe {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 48px;
    padding: 8px 14px;
    border: 2px solid rgb(255 255 255 / 0.9);
    border-radius: 999px;
    background: rgb(0 0 0 / 0.55);
    color: #fff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .lampe.allumee {
    background: #ffd54a;
    border-color: #ffd54a;
    color: #1d1713;
  }
  .erreur {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 20px;
    display: flex;
    align-items: center;
    color: #fff;
    font-size: 1.05rem;
  }
</style>
