# Fiches musiciens (cadrage, à valider)

Amélioration n° 1 de `SUIVI.md`, avec le n° 4 (tuile « Nouvel engagement » retirée du tableau de bord).
Décidé le 16/10/2026 : modifiable par l'agent **et** par le musicien ; un musicien ne voit que **sa** fiche.

## 1. Ce qu'on veut

1. **`/musiciens`** (agent seulement) : liste des musiciens, avec photo, nom, instrument et nombre d'engagements à
   venir. Un clic ouvre la fiche.
2. **`/musiciens/[id]`** : photo, nom, instrument, biographie, répertoire, puis le **récap de ses engagements** :
   - à venir : date, lieu, statut, lien vers la fiche de l'engagement ;
   - passés : les 5 derniers, plus le nombre total ;
   - le nombre d'engagements par statut.
3. **Cachet moyen** du musicien : calculé sur les engagements confirmés, joués, facturés ou payés. Chaque cachet est
   divisé par le nombre de musiciens de l'engagement (÷ 2 pour un duo), avec **une moyenne par devise** (pas de
   conversion). Un concert bénévole compte pour 0 ; un cachet « à définir » ne compte pas.
4. **`/musiciens/[id]/modifier`** : biographie (2 000 caractères au plus), répertoire (une œuvre par ligne, 100 lignes
   au plus) et photo (JPEG, PNG ou WebP, 2 Mo au plus ; la nature du fichier est vérifiée dans son contenu, comme les
   PDF). Ouvert à l'agent et au musicien lui-même.
5. La photo va dans le stockage Vercel Blob **privé**, comme les pièces jointes. Elle passe par une route qui revérifie
   les droits. Remplacer la photo efface l'ancienne. On peut aussi la retirer.
6. **Accès** : un musicien qui ouvre la fiche d'un autre (ou une adresse inventée) obtient « introuvable », et le
   refus est journalisé (« Accès refusé »).
7. **Tableau de bord** : la tuile « Musiciens » pour l'agent, « Ma fiche » pour le musicien ; la tuile « Nouvel
   engagement » est retirée. Sur la fiche d'un engagement, les noms des musiciens deviennent des liens vers leur fiche.

**Cas limites** :
- musicien sans engagement → récap vide et cachet moyen « — » ;
- musicien sans photo → ses initiales ;
- faux JPEG (un fichier renommé) → refusé ;
- biographie vide → autorisée ;
- un duo à 3 000 € → compte 1 500 € pour chacun ;
- des cachets en EUR et en CHF → deux moyennes ;
- l'adresse de la fiche avec l'identifiant de l'agent → « introuvable » (l'agent n'est pas un musicien).

**Hors périmètre** :
- modifier le nom, l'adresse e-mail ou l'instrument ;
- fiches publiques ;
- recadrage de la photo ;
- répertoire en colonnes (compositeur, œuvre) ;
- indicateurs de l'agence (KPI : c'est la branche suivante) ;
- photos dans le jeu de données : jamais le visage d'une vraie personne, donc les musiciens fictifs restent sans photo.

## 2. L'écran et ses états

| Page | Vide | Chargement | Données | Erreur |
|---|---|---|---|---|
| `/musiciens` | « Aucun musicien. Invitez-en un. » + lien vers les invitations | « Chargement… » | Tuiles : photo ou initiales, nom, instrument, « 3 à venir » | Page d'erreur existante |
| `/musiciens/[id]` | Récap : « Aucun engagement pour l'instant. » ; bio vide : « Pas encore de biographie. » | « Chargement… » | Les blocs décrits plus haut | « Introuvable » si l'accès est refusé |
| `/musiciens/[id]/modifier` | Champs vides | Bouton « Enregistrement… » | Champs pré-remplis ; « Fiche modifiée. » au retour | Message sous le champ fautif, saisie conservée |

## 3. Tranches (chacune avec sa preuve)

| Tranche | Contenu | Preuve |
|---|---|---|
| M1 | Colonnes `biographie`, `repertoire`, `photo_chemin` dans `utilisateurs` (migration 0008) ; biographies fictives dans le jeu de données | Migration jouée en prévisualisation (déploiement « Ready ») |
| M2 | `src/lib/musiciens.ts` : `verifierFiche`, `verifierPhoto`, `recapEngagements`, `cachetMoyen` (sans base, testables) | Tests : duo divisé par 2, devises séparées, bénévole à 0, cachet « à définir » exclu, faux JPEG refusé, limites de longueur |
| M3 | Lecture avec contrôle d'accès (`lireMusicien`), pages `/musiciens` et `/musiciens/[id]`, tuiles du tableau de bord, liens depuis la fiche d'un engagement | Gestes : l'agent voit tous les musiciens ; Louis voit sa fiche ; Louis sur la fiche d'Anna → « introuvable » + journal |
| M4 | Modification de la biographie et du répertoire (action `modifierFiche`) | Gestes : Louis modifie sa biographie ; une biographie trop longue est refusée avec la saisie gardée ; l'agent modifie la fiche d'Anna |
| M5 | Photo : envoi, remplacement, retrait, route de lecture | Gestes : envoi d'une photo ; faux JPEG refusé ; Louis ouvre l'adresse de la photo d'Anna → « introuvable » |
