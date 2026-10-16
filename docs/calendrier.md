# Calendrier (cadrage validé le 16/10/2026)

Amélioration n° 5 de `SUIVI.md`. Branche `calendrier`, partie de `main` le 16/10.

## 1. Ce qu'on veut

1. **7 prochains jours** (aujourd'hui à J+6) : liste par jour (heure, titre, musiciens, lieu, statut en couleur ;
   clic → fiche). En haut du tableau de bord pour l'agent ; en haut de sa fiche pour le musicien (les siens seulement).
2. **Page `/calendrier`** : un mois en grille, semaines du lundi au dimanche ; chaque engagement à sa date, coloré
   par statut (mêmes couleurs que les badges) ; clic → fiche.
3. **Navigation** : « ← mois précédent », « Aujourd'hui », « mois suivant → ». Le mois est dans l'adresse
   (`?mois=2026-11`) ; une adresse fausse affiche le mois en cours.
4. **Lien « Calendrier »** dans le menu latéral, pour les deux rôles.
5. **Droits côté serveur** : le musicien ne reçoit que ses engagements, même en tapant l'adresse à la main.
6. **Jour à l'heure du lieu**, comme les indicateurs : un concert à Tokyo le 3 à 1 h reste le 3.

**Cas limites (décidés le 16/10)** :
- **Dates approximatives** (mois, saison) : jamais placées sur un jour ; bandeau « Date à préciser » au-dessus de la
  grille, dans chaque mois de leur période. Absentes des 7 prochains jours.
- **Annulés** : cachés (le calendrier dit ce qui va se passer) ; on les retrouve dans « Tous » sur `/engagements`.
- **Plusieurs concerts le même jour** : tous affichés, la case s'allonge.
- **Concert qui finit après minuit** : affiché à son jour de début seulement.

**Hors périmètre** : vue semaine, glisser-déposer pour changer une date, export iCal / Google Agenda, filtre par
musicien sur le mois.

## 2. L'écran et ses états

- **Vide** : « Aucun engagement dans les 7 prochains jours. » ; mois sans engagement → grille affichée et
  « Aucun engagement en novembre 2026. »
- **Chargement** : « Chargement… », comme ailleurs.
- **Données** : grille sur ordinateur ; **sur téléphone**, le même mois en liste, jour par jour, seulement les jours
  qui ont un engagement.
- **Erreur** : page d'erreur existante ; mois inventé dans l'adresse → mois en cours.

## 3. Plan en tranches

- **L1** règles pures `src/lib/calendrier.ts` + tests : jour local d'un engagement, cases du mois, lecture de
  `?mois=`, fenêtre des 7 jours, rangement (jour précis / date à préciser, annulés écartés).
- **L2** page `/calendrier` : requête filtrée par rôle, grille, navigation, bandeau, lien dans le menu.
- **L3** bloc « 7 prochains jours » : tableau de bord (agent) et fiche (musicien).
- **L4** liste sur téléphone ; test garantissant des engagements dans les semaines à venir dans le jeu de données
  (ses dates sont fixes : la vue des 7 jours pourrait être vide le jour de la démo), et un jour avec **deux concerts**
  (ajouté le 17/10 : montrer que la case s'allonge).

## 4. Écarts au plan, validés pendant la construction

- **17/10, tableau de bord de l'agent** (demandé par l'humain après les gestes de L2) : il ne garde que la frise des
  indicateurs, **le calendrier du mois** et la grille des musiciens. Les tuiles Engagements / Musiciens / Inviter
  disparaissent (elles sont dans le menu). Le mois y change sur place (`/tableau-de-bord?mois=2026-12`), même bloc
  que `/calendrier`. La liste des **7 prochains jours n'y est plus** (le mois montre la semaine, aujourd'hui entouré) ;
  elle reste prévue en haut de la fiche du musicien (L3).
