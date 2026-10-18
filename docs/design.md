# Choix de design — CM Management

Passe de présentation du 12/10/2026, avant la démo (pull request n° 6). Aucune logique modifiée : seulement
l'apparence. Décisions prises par l'humain au vu des prévisualisations.

## Intention

Une agence de musiciens classiques : sobre, chaleureux, « papier et encre » plutôt qu'application de bureau.
Le blanc pur et la police par défaut donnaient un air « bâclé ».

## Identité

- **Nom affiché** : « CM Management » (logo **fictif**, renommé le 17/10 : initiales de Claire Morel), sous-titre « Agence de musiciens ». Titre de l'onglet identique.
- **Logo** (`src/components/logo.tsx`) : monogramme « CM » dans un carré à trait fin + nom ; en tête de chaque page
  (bandeau dans `src/app/layout.tsx`), lien vers le tableau de bord.

## Polices

- **Texte** : Geist (sans serif). Elle était chargée mais jamais utilisée : dans `globals.css`,
  `--font-sans: var(--font-sans)` renvoyait à elle-même → le navigateur prenait sa police à empattements par défaut.
  Corrigé en `var(--font-geist-sans)`.
- **Logo et grands titres** : Cormorant Garamond (classe `font-logo`). Le contraste serif / sans serif fait
  « maison de concerts ». À réserver au logo et aux titres, jamais au texte courant.

## Couleurs (`src/app/globals.css`, variables `:root`)

| Rôle | Choix | Raison |
| --- | --- | --- |
| Fond | blanc cassé chaud | le blanc pur faisait inachevé ; les cartes blanches ressortent dessus |
| Boutons principaux | encre brun très foncé | le bleu a été refusé par l'humain ; sobre, accordé au fond |
| Contour des champs actifs, halo | doré pâle | rappel discret, sans bleu |
| Bordures, textes secondaires | gris chauds | cohérence avec le fond |

Le mode sombre (`.dark`) n'a pas été retouché : l'application ne l'active pas.

## Fond

Grain de papier très fin (SVG `feTurbulence` intégré, opacité 14 %) et halo doré en haut de page, fixes au
défilement. Première version à 5 % : invisible, jugée trop lisse.

## Composants

- **Boutons** (`src/components/ui/button.tsx`) : plus hauts (36 px), plus larges, coins moins arrondis, lettres
  légèrement espacées, ombre légère. Les anciens paraissaient tassés.
- **Tableaux** (`src/components/ui/table.tsx`, valable partout) : encadré arrondi avec ombre, en-tête teinté en
  petites capitales grises, une ligne sur deux teintée, cellules aérées.
- **Liste des engagements** : page élargie (`max-w-6xl`) ; Lieu et Musiciens peuvent passer à la ligne pour que le
  cachet reste visible sans défilement horizontal (sur ordinateur).
- **Tableau de bord** : rôle en petites capitales (« Agent » / « Musicien », plus `admin`), « Bonjour … » en grand,
  déconnexion à droite, liens remplacés par des tuiles (titre, phrase, flèche). Agent : Engagements, Nouvel engagement,
  Inviter un musicien. Musicien : Mes engagements. Le raccourci « Nouvel engagement » n'est qu'un lien : la page
  refuse toujours un musicien côté serveur.
- **Pages centrées** (connexion, mot de passe oublié, invitation…) : `min-h-screen` remplacé par `flex-1` pour que le
  bandeau du logo ne crée pas de défilement.

## Pistes non faites

- Pages de fiche et de formulaire : seulement retouchées par les réglages communs.
- Liste des engagements sur téléphone : défilement horizontal encore nécessaire. *(16/10 : « Musiciens » passe avant
  « Lieu » ; à terme, une carte par engagement, voir l'amélioration n° 8 de `SUIVI.md`.)*
- Logo en image (SVG) et icône d'onglet (favicon) assortie.

---

## Passe « envoi » (cadrage validé le 18/10/2026)

Branche `design-envoi`, depuis `main`. Une session (≈ demi-journée), **ordinateur d'abord** : le projet doit avoir
l'air fini à l'envoi ; la suite (semaine 3) viendra après. Retours de l'humain au tour des écrans en production.

### 1. Ce qu'on veut

1. **Couleur d'ensemble « black tie »** : plus sombre, moins beige, élégante et formelle (décision B, section 2).
2. **Logo plus travaillé**, en SVG, et **icône d'onglet** (favicon) assortie.
3. **Page de connexion accueillante** : « Bienvenue dans l'espace de CM Management », une phrase sur l'agence, le
   formulaire, un **contact fictif** en cas de problème (`assistance@cm-management.test`, adresse `.test` : rien n'y
   part), des **crédits** en pied de page (« © CM Management 2026 »).
4. **Tableau de bord de l'agent : panneau « À faire »** en tête, une liste par geste à faire, chaque ligne mène à la
   fiche, 5 lignes au plus et « voir les N → » vers la liste filtrée :
   - **Factures à relancer** : cachets impayés (joué ou facturé, concert passé depuis plus de 30 jours) — **même
     règle que le récap** (`cachetsImpayes`, `src/lib/recap.ts`) ;
   - **Contrats à envoyer** : engagements en « option » (le geste suivant du cycle de vie), concert le plus proche
     d'abord ;
   - **Options qui expirent** sous 7 jours (`optionsQuiExpirent`, même règle que le récap) ;
   - **Demandes reçues à traiter** (nombre seulement, lien vers `/demandes`).
5. **Frise des statuts à la verticale**, dans une colonne à droite du panneau « À faire » (elle prend moins de
   place) ; le calendrier du mois et les musiciens restent dessous.
6. **Bouton « Nouvel engagement »** sur `/engagements`, au niveau des filtres (reporté le 18/10).

**Aucune règle nouvelle** : « À faire » ne fait que relire des règles existantes (récap, cycle de vie). Droits
inchangés (le tableau de bord reste réservé à l'agent, le musicien est renvoyé vers sa fiche).

**Hors périmètre (après l'envoi)** : cartes d'engagements sur téléphone (amélioration n° 8), mode sombre au choix,
refonte des fiches et formulaires (ils suivent seulement les couleurs communes), autres pages publiques que la
connexion (elles reçoivent le pied de page, pas de nouveau contenu).

### 2. Décisions (prises par l'humain le 18/10)

- **Couleur : B — smoking et chemise.** Le **cadre en noir profond** (menu latéral, bandeau du logo, boutons,
  panneau gauche de la connexion), le **contenu sur blanc froid** (fond gris très pâle, cartes blanches), filet
  **or** discret, titres en Cormorant. Plus de beige ni de grain de papier. Écartée : A — sombre partout (tableaux,
  formulaires et pastilles à reprendre pour le contraste : trop long pour une session).
- **Crédits** : « © CM Management 2026 », sans nom.
- **« À faire »** : les **quatre listes** (les deux demandées et les deux proposées).

### 3. Les écrans et leurs états

- **Connexion** — ordinateur : deux colonnes (gauche noire : logo, bienvenue, phrase ; droite : formulaire, mot de
  passe oublié, contact) ; téléphone : une colonne, le panneau noir réduit au logo. Erreur : messages actuels.
- **« À faire »** — vide : « Rien à faire pour l'instant. » (par liste vide : la liste disparaît) ; chargement :
  « Chargement… » comme ailleurs ; données : listes ; erreur : page d'erreur existante.
- **Frise verticale** — vide : « Aucun engagement cette saison. » (inchangé).

### 4. Plan en tranches (chacune vérifiable)

- **V1 Planche de choix** (hors du site) : une page HTML locale avec la palette B appliquée à un extrait d'écran
  et **trois logos** au choix. Preuve : l'humain choisit.
- **V2 Couleurs, logo, favicon** dans le site (`globals.css`, `logo.tsx`, menu latéral, `src/app/icon.svg`).
  Preuve : tour de la prévisualisation (agent et Louis), aucune page illisible.
- **V3 Connexion** + pied de page des pages publiques. Preuve : geste sur la prévisualisation, connexion et refus.
- **V4 Tableau de bord** : `src/lib/a-faire.ts` (pur : contrats à envoyer, tri, limite de 5) + tests ; panneau
  « À faire » et frise verticale. Preuve : tests, puis geste (chaque ligne ouvre la bonne fiche, « voir les N »).
- **V5 Bouton « Nouvel engagement »** au niveau des filtres. Preuve : geste.

Pushs groupés : V2 + V3, puis V4 + V5. Si le temps manque, V5 attend l'envoi (V2 à V4 sont ce que tu as demandé).

### 5. Écarts au plan, validés pendant la construction (18/10)

- **Logo « la maison »** (C | M, filet or) choisi sur la planche ; intitulés des listes « À faire » à mettre en valeur.
- **Retours au geste de V2-V3** : couleurs de la page sans rapport avec le menu → en-têtes de tableau en noir et
  ivoire, fond un peu moins blanc ; titres de polices différentes → une seule règle (titres de page, de section et
  de carte en police de titre) ; tableau de bord trop aéré → plus dense.
- **Retours au geste de V4-V5 (V6)** : Cormorant jugée pâle → **Playfair Display** (choisie sur une planche de cinq
  polices) ; « À faire » sur deux colonnes (vide au milieu des lignes) ; saison centrée ; tableau de bord en deux
  colonnes qui s'empilent (trou sous la saison) ; petite photo décorative (texte de remplacement qui débordait) ;
  tuile « + Inviter un musicien » en fin de grille sur `/musiciens` (à la place du bouton) ; **liste dépliable des
  musiciens sous « Musiciens »** dans le menu de l'agent.
- **Retours au geste de V6 (V7)** : lien « Invitations » retiré du menu (on invite par la tuile « + » de `/musiciens`,
  la page `/invitations` reste) ; « À faire » montre jusqu'à **10 lignes** par liste (« Voir les 6 » sur un cadre à
  moitié vide) ; photos de la liste des musiciens agrandies (56 px de large, format portrait).
- **Filtre des engagements par programmateur** : rappelé par l'humain ; fonctionnalité, pas design → sa propre
  branche après la fusion de celle-ci.
