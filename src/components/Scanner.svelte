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
      .then((c) => (arrete ? c.stop() : (controles = c)))
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
