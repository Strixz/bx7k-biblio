# Biblio-Scan — Document de conception

*Date : 2026-11-07. Statut : en attente de validation.*

Les éléments marqués **[choix Claude]** sont des décisions prises par l'assistant (non demandées explicitement) ; tout le reste vient de l'utilisatrice/utilisateur.

## 1. Intention

Une application iPhone, installée sans App Store, pour **savoir où se trouve chaque livre de la maison**. On scanne le code-barres d'un livre, on le range virtuellement à la même place que dans la réalité (lieu › meuble › étagère › position de gauche à droite), et on peut ensuite le retrouver en tapant un titre, un auteur ou un genre.

Public : des personnes **peu à l'aise avec l'informatique**. Ambiance : **cocooning, chaleureuse**.

Principe non négociable : **les données de l'utilisateur ne quittent jamais le téléphone.**

## 2. Objectifs

- Scanner un livre (ISBN) et récupérer automatiquement titre, auteur, couverture, genres.
- Organiser en trois niveaux : **Méga-collection** (lieu, ex. « Maison principale ») › **Bibliothèque** (meuble, ex. « Salon gauche ») avec un **nombre d'étagères** › **livres ordonnés de gauche à droite** sur chaque étagère.
- Réordonner les livres par **glisser-déposer**, y compris d'une étagère à l'autre.
- Suivre un **statut** par livre : Rangé, En cours de lecture, Prêté (à qui, depuis quand).
- **Rechercher** dans toutes les collections par titre, auteur ou genre.
- Fonctionner hors ligne, rester simple à utiliser, être agréable à regarder.

## 3. Non-objectifs

Compte utilisateur, synchronisation entre appareils, serveur de données, partage, statistiques/analytics, publicité, langues autres que le français, publication sur l'App Store ou le Play Store.

**Mise à jour 2026-11-07 (demande utilisateur)** : l'app doit aussi fonctionner sur **Android (Chrome)**, pour que l'utilisateur la teste sur son propre téléphone. Même PWA ; textes d'aide, d'installation (bouton « Installer » natif via `beforeinstallprompt`, sinon menu ⋮ › Installer l'application) et d'autorisation caméra adaptés à la plateforme.

## 4. Anti-objectifs (échec même si « ça marche »)

- Une donnée personnelle (liste de livres, lieux, noms des emprunteurs, notes) envoyée hors du téléphone, ou un traceur/analytics/police externe chargé depuis un tiers.
- Une interface intimidante : petits textes, jargon, gestes cachés sans explication, suppression sans confirmation.
- Perdre la bibliothèque de quelqu'un sans qu'il ait été prévenu de sauvegarder.

## 5. Contraintes techniques

### 5.1 Distribution — PWA sur GitHub Pages
- Application web progressive (PWA), installée via Safari › Partager › « Sur l'écran d'accueil ». Pas de Mac disponible → pas d'app native.
- Hébergée sur **GitHub Pages** (dépôt public, compte gratuit). L'utilisateur accepte que le **code** soit public : le site ne contient qu'une application vide.
- Adresse **peu devinable** (nom de dépôt non évident) et **non indexée** (`robots.txt` Disallow + `<meta name="robots" content="noindex">`).
- Le site reste en ligne (nécessaire pour mises à jour et réinstallation). **L'adresse ne doit jamais changer** : les données sont liées à l'origine.
- Compte : le **compte GitHub principal** de l'utilisateur (quasi vide, aucun autre site Pages actif). Tous les sites Pages d'un compte partagent la même origine `pseudo.github.io` : **ne jamais publier d'autre site Pages sur ce compte, ne pas renommer le compte, ne pas ajouter de domaine personnalisé** — cela exposerait ou effacerait les données. À rappeler dans le README du dépôt.
- **Cible : iOS 16.4 et plus récent** (Safari) **[choix Claude]**.
- Fonctionne entièrement hors ligne une fois installée (service worker, tout le code et les polices en cache local). Aucune ressource chargée depuis un CDN tiers à l'exécution.

### 5.2 Ce qui sort du téléphone — uniquement l'ISBN
- Seule exception autorisée : **l'ISBN** est envoyé aux bases publiques pour récupérer les informations du livre. Rien d'autre (ni lieu, ni note, ni liste).
- **[choix Claude]** Source principale : **Open Library** (`/api/books?bibkeys=ISBN:…&jscmd=data&format=json` ou `/isbn/{isbn}.json`), repli sur **Google Books** (`/books/v1/volumes?q=isbn:…`, sans clé API).
- **[choix Claude]** La **couverture est téléchargée une fois et stockée localement** (Blob dans IndexedDB). Elle n'est jamais rechargée depuis Internet ensuite, pour ne pas révéler aux serveurs d'images quels livres on consulte. Elle est **réduite en miniature** (~200 px de large, JPEG, ~10 Ko) pour que la sauvegarde reste légère même avec plusieurs milliers de livres.

### 5.3 Stockage local
- Toutes les données dans **IndexedDB** sur le téléphone.
- Appeler `navigator.storage.persist()` au démarrage.
- iOS peut effacer les données d'une web-app : d'où la sauvegarde manuelle (§ 7.9) et le rappel.

## 6. Modèle de données

**[choix Claude]** sur les noms et détails ; la structure découle des besoins.

- **MegaCollection** : id, nom, ordre d'affichage.
- **Bibliotheque** : id, megaCollectionId, nom, ordre, **forme** (voir ci-dessous).
- **Etagere** (= un emplacement où l'on aligne des livres) : id, bibliothequeId, ordre d'affichage, nom généré selon la forme et renommable **[choix Claude]**, sens de lecture (`gauche-droite` ou `haut-bas` pour une pile).

**Formes de bibliothèque** (choisies à la création ; demande utilisateur, interprétation **[choix Claude]**) :

| Forme | Paramètres | Étagères générées |
|---|---|---|
| Étagères classiques | nombre d'étagères N | « Étagère 1 » … « Étagère N » (1 = la plus haute) |
| Meuble à cases (type Kallax) | lignes L × colonnes C | « Ligne 1 · Case 1 » … (une étagère par case, ordre ligne par ligne) |
| Double rangée | nombre d'étagères N | « Étagère 1 · devant », « Étagère 1 · derrière »… |
| Pile(s) de livres couchés | nombre de piles P | « Pile 1 »… sens `haut-bas` (1 = le livre du dessus) |

Sous le choix de forme, un petit texte : *« Votre meuble ne ressemble à aucune de ces formes ? Créez une bibliothèque pour chaque partie du meuble (par exemple « Salon gauche – partie haute ») »*.
L'écran d'une bibliothèque (§ 7.2) reste le même pour toutes les formes : une section repliable par étagère générée. Modifier la forme après coup : seulement les paramètres (N, L×C, P), avec la même règle de redistribution des livres que ci-dessous.
- **Livre** : id, etagereId, position (ordre gauche→droite), isbn (optionnel), titre, auteur(s), couverture (Blob optionnel), genres (liste de libellés français), statut (`range` | `lecture` | `prete`), pret {nom, date} si prêté, note (texte libre), dateAjout.
- **Reglages** : thème, mode sombre, dernière sauvegarde, tutoriel vu, aides de page vues, dernier emplacement utilisé.

Règles :
- Un livre prêté **garde son emplacement** (pour savoir où le remettre) **[choix Claude]**.
- Réduire le nombre d'étagères d'une bibliothèque : si une étagère supprimée contient des livres, l'app demande sur quelle étagère les déplacer **[choix Claude]**.
- Supprimer une bibliothèque ou une méga-collection non vide : confirmation explicite indiquant le nombre de livres supprimés **[choix Claude]**.

## 7. Fonctionnalités

### 7.1 Navigation
Accueil = liste des méga-collections › liste de leurs bibliothèques › écran d'une bibliothèque › fiche d'un livre. Fil d'Ariane en haut (« Maison principale › Salon gauche »). Accès permanent à **Rechercher**, **Ajouter un livre** et **Options**. **Chaque page a un bouton « ? » en haut à droite** ouvrant une aide courte propre à cette page.

### 7.2 Écran d'une bibliothèque (maquette « B1 » validée)
- Une **section repliable par étagère** : en-tête « Étagère 1 · 7 livres ▾ ».
- Dans une section ouverte, les livres **dans l'ordre gauche→droite**, une ligne par livre : position, titre, auteur, pastille de statut (Rangé / En lecture / Prêté · Paul), **poignée ⋮⋮** à droite.
- **Glisser-déposer** via la poignée : réordonner dans l'étagère ; déposer sur l'en-tête d'une autre étagère (ou dans sa liste ouverte) pour l'y déplacer. Un livre déposé sur un en-tête se place en **dernière position** **[choix Claude]**.
- Toucher un livre (hors poignée) ouvre sa fiche.
- **Pas de bouton « Déplacer »** : décision explicite, on reste sur le glisser-déposer. Le glisser doit fonctionner au doigt sur iOS Safari et ne pas gêner le défilement (le glisser ne démarre que depuis la poignée).

### 7.3 Ajouter un livre
1. « Ajouter » ouvre la caméra arrière ; détection du code-barres EAN-13 / ISBN.
2. Recherche de l'ISBN (§ 5.2) → titre, auteur, couverture, genres.
3. Écran de vérification, tout est modifiable.
4. Choix de l'emplacement méga-collection › bibliothèque › étagère ; **pré-rempli avec le dernier emplacement utilisé** **[choix Claude]**.
5. Le livre est ajouté **en dernière position (à droite)**, statut « Rangé ».

Cas particuliers :
- **Pas de code-barres / ISBN introuvable** → **saisie manuelle** titre + auteur (+ genres, note).
- **Pas de réseau** (demande utilisateur) → le livre est enregistré avec son ISBN dans un **état spécifique « Infos en attente de réseau »**, distinct de « ISBN introuvable ». Cet état est **visible** : badge dédié (ex. icône nuage barré + « En attente ») sur la ligne du livre dans la bibliothèque, dans les résultats de recherche et sur la fiche ; titre provisoire « Livre ISBN 978… ». **[choix Claude]** Dès que le réseau revient (événement `online` ou ouverture de l'app), les livres en attente sont complétés automatiquement ; un bouton « Réessayer » reste disponible sur la fiche. Les livres sans réseau sont filtrables dans la recherche.
- Champ du modèle : `infos` = `completes` | `en-attente-reseau` | `introuvable` | `manuel`.
- **Doublon** (même ISBN ou même titre+auteur) → message « Vous avez déjà ce livre : Maison principale › Salon gauche › Étagère 3 » et choix « Ajouter un 2ᵉ exemplaire » / « Annuler » **[choix Claude]**.
- Caméra refusée → message simple expliquant comment l'autoriser, et accès à la saisie manuelle.

### 7.3 bis Scanner une étagère d'un coup (demande utilisateur)
Pour le premier remplissage. Depuis l'écran d'une bibliothèque (bouton sur chaque en-tête d'étagère) ou depuis « Ajouter » :
1. On choisit l'étagère ; la caméra reste ouverte.
2. On scanne les livres **l'un après l'autre, de gauche à droite** (ou de haut en bas pour une pile). Chaque scan ajoute immédiatement le livre **à la suite**, avec un signal clair (vibration/son doux + « ✓ Dune ajouté — 12 livres »).
3. Pas d'écran de vérification pendant la série ; la recherche des infos se fait en arrière-plan. Les ISBN non trouvés ou scannés hors réseau sont marqués « à compléter ».
4. Bouton « Annuler le dernier » et bouton « J'ai fini » ; un livre sans code-barres peut être ajouté à la main sans quitter la série **[choix Claude]**.
5. **[choix Claude]** Un même ISBN scanné deux fois de suite (en moins de 3 s) est ignoré, pour éviter les doublons involontaires ; un doublon déjà présent ailleurs est ajouté mais signalé dans le récapitulatif de fin.
6. En fin de série : récapitulatif avec les livres « à compléter » à vérifier.

### 7.4 Fiche d'un livre
Couverture, titre, auteur, ISBN, emplacement complet avec position, statut (si prêté : nom + date du prêt), genres, **note libre**. Tout est modifiable ; supprimer le livre (avec confirmation). Changer d'emplacement se fait depuis l'écran de la bibliothèque par glisser-déposer ; **[choix Claude]** changer de bibliothèque/méga-collection se fait en modifiant l'emplacement dans la fiche (sélecteurs), car le glisser-déposer ne traverse pas les bibliothèques.

### 7.5 Statuts
Rangé, En cours de lecture, Prêté. Passer en « Prêté » demande le nom de la personne ; la date est enregistrée automatiquement (modifiable).

### 7.6 Genres
- Champ **Genres** multi-valeurs, **libellés en français**.
- Au scan, les catégories anglaises des API (Google Books `categories`, Open Library `subjects`) sont **traduites via une table de correspondance** (ex. « Science fiction » → « Science-fiction », « Juvenile fiction » → « Jeunesse », « Detective and mystery stories » → « Policier ») ; les catégories non reconnues sont ignorées **[choix Claude]**.
- Ajout/retrait manuel à partir d'une liste de base (Roman, Policier, Science-fiction, Fantasy, Jeunesse, BD, Histoire, Biographie, Cuisine, Art, Voyage, Essai, Poésie, Théâtre…) ou création d'un genre libre.

### 7.7 Recherche
- Un seul champ ; cherche dans **titre, auteur et genres**, sur **toutes** les méga-collections.
- Insensible à la casse et aux accents (« miserables » trouve « Les Misérables ») **[choix Claude]**.
- Chaque résultat affiche l'**emplacement complet** et ouvre la fiche.
- **[choix Claude]** Filtre par statut (ex. tous les livres prêtés).

### 7.8 Tutoriel et aides
- **Tutoriel global** au premier lancement, **4 à 5 écrans très simples** (une phrase + une illustration chacun) : créer un lieu, ajouter une bibliothèque et ses étagères, scanner un livre, ranger en glissant, sauvegarder. Revisitable dans les Options.
- **[choix Claude]** Si l'app est ouverte dans Safari sans être installée, un écran explique pas à pas « Partager › Sur l'écran d'accueil » (nécessaire pour que les données restent bien conservées).
- **Bouton « ? » sur chaque page** → aide courte spécifique à la page (ex. sur une bibliothèque : « Pour déplacer un livre, appuyez sur ⋮⋮ et faites-le glisser »).

### 7.9 Sauvegarde
- **Exporter** : génère un fichier (JSON, couvertures incluses) et ouvre la **feuille de partage iOS** (`navigator.share` avec fichier) → « Enregistrer dans Fichiers » → iCloud Drive au choix de l'utilisateur. Repli : téléchargement du fichier.
- **Importer** : choisir un fichier de sauvegarde ; confirmation « Ceci remplacera toute votre bibliothèque actuelle » ; restauration complète **[choix Claude : remplacement, pas fusion]**.
 Le fichier peut venir de n’importe où (stockage interne, Google Drive, Proton Drive…) : quand le navigateur le permet, on passe par `showOpenFilePicker`, qui laisse relire un fichier de Drive encore en cours d’arrivée (Chrome Android refuse sinon de le lire : NotReadableError) ; sinon, sélecteur de fichiers classique.
- **Rappel** : « Dernière sauvegarde : il y a N jours », et invitation à sauvegarder au-delà de **30 jours** (délai réglable).
- Aucune sauvegarde automatique (impossible pour une PWA) ; pas de « Protection avancée des données » à mentionner.

### 7.10 Options
Thème (8 choix), interrupteur **Mode sombre**, délai du rappel de sauvegarde, Exporter / Importer, revoir le tutoriel.
**[choix Claude]** Par défaut, le mode sombre suit le réglage de l'iPhone tant que l'utilisateur n'a pas touché l'interrupteur.

## 8. Apparence

### 8.1 Principes
- Cocooning, chaleureux. Titres en police à empattements (style livre), texte courant sans empattement.
- **Accessibilité pour non-initiés [choix Claude sur les valeurs]** : texte de base ≥ 17 px, zones tactiles ≥ 48 px, contrastes WCAG AA, mots simples, pas d'icône sans libellé pour les actions principales, confirmation avant toute suppression.
- Polices embarquées dans l'app (pas de Google Fonts au chargement).

### 8.2 Thèmes — tous validés, chacun en clair et sombre
Jetons : `bg` fond, `su` surfaces/cartes, `bo` bordures, `ac` accent (boutons, liens), `tx` texte, `se` champ de recherche / fonds secondaires.

| Thème | Clair (bg / su / bo / ac / tx / se) | Sombre (bg / su / bo / ac / tx / se) |
|---|---|---|
| **Crème & terracotta** (défaut) | #fbf5ea / #ffffff / #eadcc6 / #c0643b / #3b2a1e / #f1e6d3 | #241c17 / #30251e / #42342a / #d9774a / #f1e4d0 / #33281f |
| Sauge & lin | #f4f1e8 / #fffdf7 / #dfe3d2 / #6f8a5e / #2f3a2f / #e6e9da | #1c221c / #263026 / #354235 / #8fae7b / #e6ecdc / #232b23 |
| Plaid bordeaux | #faf3ef / #ffffff / #ecd9d2 / #8c2f39 / #3a1f22 / #f2e3dd | #221517 / #2e1d20 / #44292d / #c4596a / #f3e2e0 / #2a1a1d |
| Bleu myrtille | #f3f4f8 / #ffffff / #d9deea / #3f5a8a / #1f2a3d / #e3e7f0 | #161b26 / #1f2634 / #2f3a4f / #7f9ed6 / #e3e8f3 / #1c2230 |
| Bord de mer | #f1f6f6 / #ffffff / #d3e4e3 / #2f7c7a / #1d3534 / #e0ecec | #132020 / #1b2c2c / #284040 / #5fb3ae / #dcefed / #182828 |
| Rose thé | #fdf2f3 / #ffffff / #f3d6da / #c45a74 / #3d2229 / #f7e1e4 | #231719 / #302024 / #4a2f35 / #e58ca2 / #f6e3e6 / #2b1d20 |
| Lavande | #f6f3fa / #ffffff / #e1d9ee / #7a5ca8 / #2e2540 / #ebe5f4 | #1b1724 / #262032 / #3a3049 / #ad93d8 / #ebe4f5 / #221d2d |
| Miel | #fdf8ea / #ffffff / #f1e3b8 / #c88a12 / #3a2e14 / #f6ebc9 | #1f1a10 / #2b2416 / #433820 / #e7b04a / #f5ecd4 / #262014 |

Pastilles de statut : Rangé (vert doux), En lecture (bleu doux), Prêté (orangé). Les valeurs peuvent être ajustées par le builder pour atteindre le contraste AA.

### 8.3 Logo
Validé : **« Le meuble »** — bibliothèque en bois à 3 étagères sur fond dégradé terracotta, livres colorés **debout, penchés et couchés**, petite plante. Source : `docs/design/logo.svg`. À décliner en icône d'écran d'accueil iOS (`apple-touch-icon` 180×180) et icônes du manifeste ; le builder peut affiner le dessin sans changer le concept.

## 9. Pile technique — [choix Claude]

- **Vite + TypeScript + Svelte 5** : léger, rapide sur mobile, bon pour une petite app.
- **Dexie** (IndexedDB).
- **SortableJS** pour le glisser-déposer tactile (fonctionne sur iOS, gère le déplacement entre listes et une poignée dédiée).
- **ZXing (`@zxing/browser`)** pour la lecture de codes-barres (Safari iOS n'a pas l'API `BarcodeDetector`).
- **vite-plugin-pwa** (manifest + service worker, mode hors ligne complet).
- **Vitest** pour les tests (logique : modèle, ordre des livres, recherche normalisée, table des genres, export/import).
- **GitHub Actions** pour publier sur GitHub Pages à chaque push sur `main`.

## 10. Laissé au builder

Découpage en composants, structure du code, détail des animations, illustrations du tutoriel, rédaction exacte des textes d'aide (en français simple), contenu complet de la table de traduction des genres, format précis du fichier de sauvegarde (versionné), gestion des erreurs réseau.

## 11. Avant le premier déploiement (à faire par l'utilisateur)

- Avoir un compte GitHub ; l'assistant préparera le dépôt et le workflow de publication.
- Installer l'app depuis Safari sur l'iPhone, puis faire une première sauvegarde de test.

## Évolutions après les premiers essais (2026-11-07)

- **Recherche ISBN** : Google Books sans clé renvoie toujours 429 (quota anonyme partagé épuisé). Open Library et le catalogue de la BnF (SRU, UNIMARC, CORS `*`) sont interrogés en parallèle avec l'ISBN-13 et l'ISBN-10. La BnF est prioritaire pour les ISBN français (titres « Série — tome N : titre »). Genres pris dans la source la plus fiable qui en donne (3 au plus) ; nouveau genre « Manga ». Couverture de secours : `covers.openlibrary.org/b/isbn/…?default=false`. Google Books seulement si `VITE_GOOGLE_BOOKS_CLE` est fournie au build (secret GitHub `GOOGLE_BOOKS_CLE`, clé limitée au site), requête envoyée avec `referrerPolicy: strict-origin`.
- **Emplacements retirés** : `Forme.retirees` liste les clés d'emplacements absents du vrai meuble ; `genererEtageres` les omet (au moins un emplacement gardé). Écran « Modifier la bibliothèque » › « Retirer des emplacements ».
- **Mises à jour** : bandeau « Une nouvelle version est prête · Mettre à jour » ; vérification à chaque retour sur l'application.
- **Meuble construit étagère par étagère** (remplace les formes de meuble et les emplacements retirés) : une bibliothèque se crée avec un simple nom, puis on ajoute ses étagères une par une (simple, double rangée, pile). Après chaque création : scanner l'étagère (chaque rangée pour une double), créer la suivante ou terminer. Les étagères se réordonnent par glisser-déposer (poignée ⋮⋮ à gauche du nom ; les deux rangées d’Ne double bougent ensemble). Chaque étagère a un bouton « Modifier » (nom, forme) et « Supprimer » avec double confirmation (ses livres sont supprimés). Une double rangée = deux fiches `Etagere` (même `biblioId` et `ordre`, `rangee` devant/derrière) ; repasser en simple met les livres de derrière à la suite de ceux de devant. Base v2 et sauvegardes v2 ; les anciennes étagères deviennent des étagères simples (ou piles).
- **Scan d'une étagère = même parcours que le scan d'un livre, en boucle** : scan → fiche à vérifier (titre, auteur, genres ; composant `VerifLivre` partagé avec l'ajout individuel) → « Valider et scanner le suivant » → scanner. Doublon signalé comme pour l'ajout individuel. Le livre qu'on vient de ranger est ignoré tant qu'il reste devant la caméra (4 s sans le relire). « Retirer le dernier », « Sans code-barres », « Ne pas ajouter ce livre ».
