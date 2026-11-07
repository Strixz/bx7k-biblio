// Génère les icônes PNG de l'app à partir de docs/design/logo.svg.
import sharp from 'sharp';
import { copyFileSync } from 'node:fs';

const src = 'docs/design/logo.svg';
for (const [nom, taille] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(src, { density: 300 }).resize(taille, taille).png().toFile(`public/${nom}`);
}
copyFileSync(src, 'public/favicon.svg');
console.log('Icônes générées');
