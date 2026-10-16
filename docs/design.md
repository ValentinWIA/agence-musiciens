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
