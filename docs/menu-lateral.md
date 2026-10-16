# Menu latéral (cadrage validé le 16/10/2026)

Amélioration n° 7 de `SUIVI.md`. Branche `menu-lateral`, partie de `main` le 16/10.

## 1. Ce qu'on veut

1. Un menu à gauche, présent sur toutes les pages accessibles après connexion, pour aller d'une page à l'autre et se
   déconnecter de n'importe où.
2. **Agent** : Tableau de bord · Engagements · Musiciens · Invitations.
3. **Musicien** : Ma fiche · Mes engagements. Sa fiche devient sa page d'accueil : `/tableau-de-bord` le renvoie vers
   `/musiciens/<son id>` (son tableau de bord n'avait qu'une tuile, « Ma fiche »).
4. En haut du menu, le logo, qui remplace la bande d'en-tête actuelle. En bas, le nom et le rôle de la personne
   connectée, puis « Se déconnecter ».
5. Lien actif : la page en cours est surlignée, sous-pages comprises (une fiche d'engagement allume « Engagements »).
6. Sur téléphone, le menu est replié derrière un bouton ☰ en haut. Il s'ouvre par-dessus la page et se ferme quand on
   choisit un lien, qu'on touche ailleurs ou qu'on appuie sur Échap.
7. Pas de menu sur les pages sans session : connexion, installation, invitation, mot de passe oublié,
   réinitialisation.
8. Le bouton « Se déconnecter » du tableau de bord disparaît, puisqu'il est dans le menu.
9. Sécurité inchangée : le menu ne fait que montrer des liens. Chaque page revérifie les droits côté serveur, et un
   musicien qui tape `/invitations` reste refusé.
10. Hors périmètre : le lien « Calendrier » (ajouté avec le calendrier), les compteurs (avec les KPI), le menu qu'on
    replie sur ordinateur et le reste du design. Plus tard, au moment du calendrier, il faudra choisir où le musicien
    voit ses 7 prochains jours (probablement en haut de sa fiche).

## 2. L'écran et ses états

**Ordinateur** (à partir de 768 px de large) : une colonne fixe de 240 px, sur toute la hauteur. Elle ne défile pas
avec la page.

```
┌──────────────────┬──────────────────────────────────────┐
│  CM Management   │                                      │
│                  │   (contenu de la page)               │
│ ▌Tableau de bord │                                      │
│  Engagements     │                                      │
│  Musiciens       │                                      │
│  Invitations     │                                      │
│                  │                                      │
│                  │                                      │
│ ──────────────── │                                      │
│  Samuel Martin   │                                      │
│  Agent           │                                      │
│  Se déconnecter  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

**Téléphone** (moins de 768 px) : une barre en haut avec ☰ et le logo. ☰ fait glisser le même menu depuis la gauche,
par-dessus un voile sombre. La page derrière ne défile plus tant que le menu est ouvert.

```
┌────────────────────────┐      ┌───────────────┬────────┐
│ ☰  CM Management       │      │ CM Management │ ░░░░░░ │
├────────────────────────┤      │               │ ░░░░░░ │
│                        │  ☰   │ ▌Ma fiche     │ ░voile░│
│  (contenu de la page)  │ ──▶  │  Mes engag.   │ ░░░░░░ │
│                        │      │ ───────────── │ ░░░░░░ │
│                        │      │  Anna Petit   │ ░░░░░░ │
│                        │      │  Musicienne   │ ░░░░░░ │
│                        │      │  Se déconn.   │ ░░░░░░ │
└────────────────────────┘      └───────────────┴────────┘
```

**États**

- **Vide (pas de session)** : aucun menu, aucune colonne. Les pages publiques restent centrées comme aujourd'hui.
  Le logo seul reste en haut.
- **Chargement** (le temps de lire la session) : la colonne est déjà là, à sa largeur, avec le logo et des lignes
  grises à la place des liens. La page ne saute donc pas quand le menu arrive.
- **Données** :
  - agent → 4 liens ; musicien → 2 liens ;
  - lien actif : barre de couleur à gauche, fond légèrement teinté, et `aria-current="page"` pour les lecteurs
    d'écran ;
  - nom trop long → coupé avec « … », nom complet au survol.
- **Erreur** :
  - session expirée pendant la visite → le clic sur un lien mène à une page qui renvoie vers la connexion (comme
    aujourd'hui) ;
  - échec de la déconnexion (réseau coupé) → page d'erreur habituelle de Next.js, la session reste ouverte ;
    réessayer suffit ;
  - JavaScript désactivé ou pas encore chargé : sur ordinateur tout marche (simples liens, formulaire de
    déconnexion) ; sur téléphone, ☰ ne s'ouvre qu'une fois la page chargée.

**Accessibilité** : `<nav aria-label="Menu principal">` ; ☰ est un vrai bouton avec `aria-expanded` ; à l'ouverture,
le clavier entre dans le menu ; Échap le ferme et rend la main au bouton ☰.

## 3. Plan en tranches

Organisation choisie : un **groupe de routes** `src/app/(connecte)/`. Les parenthèses disent à Next.js que ce dossier
range des pages sans changer leur adresse (`/engagements` reste `/engagements`). Les pages après connexion y entrent
et partagent son `layout.tsx`, qui porte le menu. Les pages publiques restent dehors, sans menu. Le menu de téléphone
utilise l'élément HTML `<dialog>`, qui gère déjà Échap, le voile et le clavier : pas de nouveau paquet.

- **T1 — Logique pure, avec tests** : `src/lib/menu.ts` donne les liens selon le rôle et dit si un lien est actif
  pour une adresse donnée (sous-pages comprises, sans confondre `/musiciens` et `/musiciens-x`).
  Preuve : tests verts en local et sur GitHub.
- **T2 — Menu sur ordinateur** : les dossiers `engagements`, `invitations`, `musiciens`, `tableau-de-bord` passent dans
  `(connecte)/` ; son `layout.tsx` affiche la colonne (squelette pendant le chargement), le lien actif, le nom, le rôle
  et « Se déconnecter ». La bande d'en-tête avec le logo ne reste que sur les pages publiques.
  Preuve (prévisualisation) : agent et musicien naviguent par le menu ; lien actif juste sur une fiche d'engagement ;
  déconnexion depuis une fiche d'engagement ; page de connexion inchangée.
- **T3 — Le musicien arrive sur sa fiche** : `/tableau-de-bord` le renvoie vers sa fiche ; le bouton « Se déconnecter »
  et le code de la tuile « Ma fiche » quittent le tableau de bord ; les liens « ← Tableau de bord » en haut des pages
  sont retirés (le menu les remplace ; sur la fiche du musicien, ce lien le ramènerait à la même page).
  Preuve : connexion de Louis → sa fiche ; Louis tape `/invitations` → refusé, renvoyé sur sa fiche, refus dans les
  journaux.
- **T4 — Téléphone** : barre ☰ + logo, menu qui glisse, voile, fermeture (lien, voile, Échap), page bloquée derrière.
  Preuve : gestes faits sur un vrai téléphone, ou une fenêtre étroite, en prévisualisation.
- **T5 — Livraison** : build et lint, pull request, fusion après accord, vérification en production, `SUIVI.md`.

## 4. Écarts au plan, validés pendant la construction

- **Deux groupes au lieu d'un** (T2) : `(public)/` porte la bande du logo, sinon le logo serait apparu deux fois sur
  les pages connectées (en haut de la page et en haut du menu).
- **Bouton ✕** dans le menu du téléphone (T4) : un téléphone n'a pas de touche Échap ; gardé par l'humain le 16/10.
- **« ← Tableau de bord » gardé** sur la page « Musicien introuvable » : c'est un lien pour sortir d'une erreur.
