# Fiches musiciens (cadrage validé le 16/10/2026, ajouts validés le même jour)

Amélioration n° 1 de `SUIVI.md`, avec le n° 4 (tuile « Nouvel engagement » retirée du tableau de bord).
Décidé le 16/10/2026 : modifiable par l'agent **et** par le musicien ; un musicien ne voit que **sa** fiche.

## 1. Ce qu'on veut

1. **`/musiciens`** (agent seulement) : liste des musiciens, avec photo, nom, instrument et nombre d'engagements à
   venir. Un clic ouvre la fiche.
2. **`/musiciens/[id]`** : photo, nom, instrument, biographie, répertoire, puis le **récap de ses engagements** :
   - à venir : date, lieu, statut, lien vers la fiche de l'engagement ;
   - passés : les 5 derniers, plus le nombre total ; *(16/10)* « Afficher plus » déplie tout l'historique ;
   - le nombre d'engagements par statut.
3. **Cachet moyen** du musicien : calculé sur les engagements confirmés, joués, facturés ou payés. Chaque cachet est
   divisé par le nombre de musiciens de l'engagement (÷ 2 pour un duo). Un concert bénévole compte pour 0 ; un
   cachet « à définir » ne compte pas. *(Changé le 16/10)* : **une seule moyenne, en euros**, avec la conversion
   indicative de la fiche d'un engagement (taux BCE du jour, « ≈ », date du taux). Si le service de taux est en
   panne, repli sur une moyenne par devise (jamais des francs comptés comme des euros).
4. **`/musiciens/[id]/modifier`** : biographie (2 000 caractères au plus), répertoire (une œuvre par ligne, 100 lignes
   au plus) et photo (JPEG, PNG ou WebP, 2 Mo au plus ; la nature du fichier est vérifiée dans son contenu, comme les
   PDF). Ouvert à l'agent et au musicien lui-même.
5. La photo va dans le stockage Vercel Blob **privé**, comme les pièces jointes. Elle passe par une route qui revérifie
   les droits. Remplacer la photo efface l'ancienne. On peut aussi la retirer.
6. **Accès** : un musicien qui ouvre la fiche d'un autre (ou une adresse inventée) obtient « introuvable », et le
   refus est journalisé (« Accès refusé »).
7. **Tableau de bord** : la tuile « Musiciens » pour l'agent, « Ma fiche » pour le musicien ; la tuile « Nouvel
   engagement » est retirée. Sur la fiche d'un engagement, les noms des musiciens deviennent des liens vers leur fiche.
   *(Ajouté le 16/10, M3b)* : la grille des musiciens est affichée sur le tableau de bord de l'agent ; « Nouvel
   engagement » sur la fiche d'un musicien (musicien déjà coché) ; « Inviter un musicien » sur `/musiciens`.
8. **Notes de l'agent** *(ajouté le 16/10)* : texte libre sur la situation du musicien et les points à surveiller
   (2 000 caractères au plus, vide permis). **Vues et modifiées par l'agent seulement** : pour un musicien, la colonne
   n'est même pas lue en base (rien ne peut atteindre son navigateur), et l'action de modification refuse le champ
   s'il vient d'un musicien, avec une ligne dans les journaux. Privé ne veut pas dire secret : dans un vrai produit,
   le RGPD donne au musicien le droit de demander toutes ses données, notes comprises ; on n'y écrit donc rien qu'on
   ne pourrait lui montrer (et pas de données de santé).
9. **Portraits de démonstration** *(décidé le 16/10, remplace « pas de photo fictive »)* : 4 portraits réalistes
   **générés par IA** (personnes qui n'existent pas ; jamais une photo de banque d'images, qui montre une vraie
   personne), choisis par l'humain, rangés dans `scripts/portraits/`. Le jeu de données les envoie dans le stockage
   privé à des chemins fixes (remplacés à chaque rechargement, pas d'orphelins) ; ils passent par la même route
   protégée que les vraies photos. Le README le signale.

**Cas limites** :
- musicien sans engagement → récap vide et cachet moyen « — » ;
- musicien sans photo → ses initiales ;
- faux JPEG (un fichier renommé) → refusé ;
- biographie vide → autorisée ;
- un duo à 3 000 € → compte 1 500 € pour chacun ;
- des cachets en EUR et en CHF → une moyenne en euros (≈) ; sans taux disponible → deux moyennes ;
- l'adresse de la fiche avec l'identifiant de l'agent → « introuvable » (l'agent n'est pas un musicien) ;
- un musicien qui envoie le champ « notes de l'agent » en trafiquant le formulaire → refusé, notes inchangées ;
- `/engagements/nouveau?musicien=` suivi d'un identifiant inventé → formulaire vide, sans erreur.

**Hors périmètre** :
- modifier le nom, l'adresse e-mail ou l'instrument ;
- fiches publiques ;
- recadrage de la photo ;
- répertoire en colonnes (compositeur, œuvre) ;
- indicateurs de l'agence (KPI : c'est la branche suivante) ;
- historique des notes de l'agent (qui a écrit quoi, quand) : une seule note, remplacée à chaque modification.

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
| M3b ✅ | Grille sur le tableau de bord de l'agent, « Nouvel engagement » depuis une fiche, « Inviter » sur `/musiciens` | Gestes : grille visible dès l'arrivée ; musicien pré-coché ; Louis ne voit ni grille ni bouton |
| M3c | « Afficher plus » pour les passés ; cachet moyen en euros (`cachetMoyenEnEuros`) | Tests : conversion puis partage, repli sans taux. Gestes : historique déplié ; cachet de Louis en un seul montant « ≈ … € » |
| M4 | Colonne `notes_agent` (migration 0009, notes fictives dans le jeu) ; `verifierFiche` étendue aux notes ; page `/musiciens/[id]/modifier` et action `modifierFiche` (biographie, répertoire ; notes pour l'agent seulement) ; bloc « Notes de l'agent » sur la fiche | Tests : limites des notes. Gestes : Louis modifie sa biographie et ne voit pas les notes ; biographie trop longue refusée, saisie gardée ; l'agent écrit une note sur Anna ; Louis qui envoie le champ notes → refusé et journalisé |
| M5 | Photo : envoi, remplacement, retrait, route de lecture ; 4 portraits générés (Canva, choisis par l'humain) dans le jeu de données | Gestes : envoi d'une photo ; faux JPEG refusé ; portraits affichés ; Louis ouvre l'adresse de la photo d'Anna → « introuvable » |
