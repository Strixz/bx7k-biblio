# Biblio-Scan

Application iPhone (web app installable, sans App Store) pour savoir où sont rangés ses livres :
lieux › bibliothèques › étagères › livres de gauche à droite. Scan des codes-barres, statuts (rangé, en lecture,
prêté), recherche par titre / auteur / genre, sauvegarde dans un fichier.

**Toutes les données restent sur le téléphone** (IndexedDB). Seul l'ISBN d'un livre scanné est envoyé à
Open Library puis Google Books pour retrouver ses infos. Conception : `docs/superpowers/specs/2026-11-07-biblio-scan-design.md`.

## Développement

```bash
npm install
npm run dev      # serveur local
npm test         # tests unitaires (Vitest)
npm run check    # vérification des types
npm run build    # version de production dans dist/
node scripts/icones.mjs   # régénère les icônes depuis docs/design/logo.svg
```

## Mise en ligne (GitHub Pages)

1. Créer un dépôt **public** sur GitHub avec un nom peu devinable (ex. `bx7k-biblio`) et y pousser ce code sur `main`.
2. Dans le dépôt : *Settings › Pages › Build and deployment › Source* : **GitHub Actions**.
3. Chaque push sur `main` lance les tests puis publie l'app à `https://<pseudo>.github.io/<dépôt>/`.

Le site n'est pas indexé (`robots.txt` + balise `noindex`) et ne contient qu'une application vide.

### ⚠️ Règles à ne jamais enfreindre

Les données de l'app sont liées à son adresse exacte. Changer l'adresse = l'app repart vide (restaurer une sauvegarde).

- **Ne pas renommer** le compte GitHub ni le dépôt.
- **Ne pas ajouter de domaine personnalisé.**
- **Ne publier aucun autre site GitHub Pages sur ce compte** : tous les sites `pseudo.github.io/*` partagent le
  même stockage et pourraient lire ou effacer les données de l'app.
- Laisser le site en ligne : il sert aux mises à jour et à la réinstallation.

## Installer sur l'iPhone

Ouvrir l'adresse dans **Safari** › bouton Partager › **Sur l'écran d'accueil** › Ajouter. Utiliser ensuite
toujours l'icône de l'écran d'accueil. Une mise à jour publiée s'applique au lancement suivant de l'app.
