# Cadrage — les engagements

Document de cadrage de l'objet principal, écrit **avant tout code** (étapes 1 et 2 de la boucle de la fiche).
Il sert aussi de rendu du vendredi : spécification, cycle de vie, maquette des écrans et de leurs états.

---

## 1. Ce qu'on veut, en dix lignes

1. Un **engagement** est un concert proposé par un programmateur, dans un lieu, pour un ou deux musiciens de l'agence,
   à une date précise ou, au stade de la demande, approximative (« mai 2027 », « automne 2027 »).
2. L'agent crée l'engagement dès la première demande, puis le fait avancer d'étape en étape jusqu'au paiement du cachet.
3. Chaque étape est un **statut** ; seules certaines transitions sont permises, et seul l'agent les déclenche.
4. L'agent voit tous les engagements ; un musicien ne voit **que les siens**, en lecture seule — vérifié côté serveur.
5. La liste se filtre par statut, par musicien (agent seulement), par période (à venir / passés) et par texte (lieu, ville).
6. La fiche d'un engagement montre tout ce qu'on sait : titre court, date, horaire, durée, lieu, programmateur, musiciens,
   cachet, programme, notes.
7. **Règle métier** : un engagement ne peut pas être **confirmé** si l'un de ses musiciens a déjà un engagement trop proche,
   compte tenu de la distance entre les lieux (règle détaillée dans `SPEC.md`).
8. Un duo n'est confirmable que si **les deux** musiciens sont libres.
9. Chaque action (création, modification, changement de statut, refus) laisse une ligne dans les journaux.
10. Chaque écran a ses quatre états : vide, chargement, données, erreur ; chaque action donne un retour visible.

**Cas limites retenus**
- Concert qui finit tard (22 h) et suivant le lendemain matin loin (800 km) → conflit, confirmation refusée.
- Engagement sans cachet (encore inconnu à l'étape « demande ») → autorisé jusqu'à « contrat envoyé », obligatoire ensuite.
- Concert **bénévole** (cause, gala de soutien) → cachet de **0**, avec un contrat. « 0 » (décidé) n'est pas « vide »
  (pas encore connu) : seul le vide bloque l'envoi du contrat. Affiché « Bénévole » ; « joué » est alors son étape finale.
- Cachet en devise étrangère (CHF, USD, GBP, JPY) → enregistré tel quel, avec sa devise. Le yen n'a pas de centimes.
- Date approximative (« automne 2027 ») → permise au statut « demande » ; une date et une heure précises sont exigées
  pour poser une option, car la règle de conflit a besoin d'horaires exacts.
- Annulation après confirmation → possible tant que le concert n'est pas joué ; l'engagement reste visible, statut « annulé ».
- Musicien sans aucun engagement → sa liste affiche l'état « vide ».
- Musicien qui tape l'adresse de l'engagement d'un autre → page « introuvable » (on ne confirme pas qu'il existe), refus journalisé.
- Engagement annulé, ou encore non tenu (demande, option, contrat envoyé) → ignoré par la règle de conflit. Un concert
  passé compte : joué hier à 22 h, il peut gêner un concert ce matin (révisé le 12/10/2026, cadrage F).

**Hors périmètre (pour l'instant)**
- Séries de concerts (plusieurs dates dans un même engagement) : une date = un engagement.
- Répartition du cachet entre les musiciens d'un duo : un cachet global par engagement.
- Comptes pour les programmateurs (ce sont des contacts, sans connexion).
- Facturation réelle, paiement, déclarations sociales.
- Règle 3 du SPEC (durée du programme) : plus tard, si le temps le permet.
- Pièces jointes : étape G, après le reste.
- Défraiements (transport, hôtel) d'un concert bénévole : à traiter plus tard.

---

## 2. Cycle de vie

```
                ┌──────────────────────────── annuler ─────────────────────────────┐
                │                    │                    │                        ▼
  ┌─────────┐  poser   ┌────────┐  envoyer  ┌──────────┐ confirmer ┌──────────┐   ┌─────────┐
  │ demande │ ───────▶ │ option │ ────────▶ │ contrat  │ ────────▶ │ confirmé │──▶│ annulé  │
  └─────────┘          └────────┘  contrat  │ envoyé   │   (règle  └──────────┘   └─────────┘
                                            └──────────┘  conflit)      │ marquer joué
                                                                        ▼
                                  ┌────────┐  encaisser  ┌──────────┐  facturer  ┌──────┐
                                  │  payé  │ ◀────────── │ facturé  │ ◀───────── │ joué │
                                  └────────┘             └──────────┘            └──────┘
```

| Transition | De → vers | Qui | Condition vérifiée par le serveur |
|---|---|---|---|
| Poser une option | demande → option | agent | date **précise** et heure renseignées (plus de date approximative), durée prévue renseignée (la règle de conflit calcule la fin du concert) |
| Envoyer le contrat | option → contrat envoyé | agent | cachet renseigné (0 accepté : concert bénévole) |
| Confirmer | contrat envoyé → confirmé | agent | **règle de conflit** : aucun musicien de l'engagement n'a de concert trop proche |
| Marquer joué | confirmé → joué | agent | la date du concert est passée |
| Facturer | joué → facturé | agent | cachet supérieur à 0 |
| Encaisser | facturé → payé | agent | — |
| Annuler | demande, option, contrat envoyé ou confirmé → annulé | agent | pas encore joué |
| Rétablir | annulé → statut d'avant l'annulation (« contrat envoyé » s'il était confirmé) | agent | la date du concert n'est pas passée |

- Aucun retour en arrière, sauf **rétablir** un engagement annulé par erreur. Un engagement qui était confirmé revient
  à « contrat envoyé » : pendant l'annulation, la date a pu être prise, il faut reconfirmer (règle de conflit rejugée).
- Le musicien ne déclenche aucune transition (décision du SPEC : consultation seule).
- Un statut final (payé, et joué pour un concert bénévole) ne change plus ; « annulé » aussi, une fois la date passée.

---

## 3. Données

```
 programmateurs ──┐
   (contacts)     │ 1 programmateur
                  ▼ pour n engagements
 lieux ────────▶ engagements ◀──────── engagement_musiciens ────────▶ utilisateurs
  (adresse,      (date, statut,          (table de liaison :            (musiciens)
  coordonnées)    cachet…)               1 ou 2 musiciens
                                          par engagement)
```

| Table | Colonnes principales |
|---|---|
| `lieux` | nom, adresse, ville, pays, latitude, longitude (remplies par le géocodage, étape E) |
| `programmateurs` | nom, structure (festival, salle…), e-mail, téléphone — fictifs |
| `engagements` | titre court (facultatif), début, précision de la date (`jour`, `mois` ou `saison`), durée prévue (minutes), lieu, programmateur, statut, statut avant annulation (pour rétablir), cachet (en **plus petite unité de la devise**), devise, programme (texte), notes, dates de création et de modification |
| `engagement_musiciens` | engagement, musicien |

- Le cachet est **rangé** en nombre entier, dans la plus petite unité de la devise : centimes pour EUR, CHF, USD et GBP
  (1 250,10 € → `125010`), yen pour JPY, qui n'a pas de centimes (300 000 ¥ → `300000`). Les nombres à virgule de
  l'ordinateur font des erreurs d'arrondi (1 250,10 + 3 200,20 = 4 450,29999…), inacceptables pour de l'argent.
  **Invisible pour l'utilisateur** : il saisit et lit « 1 250,10 € », le code convertit à l'entrée et à la sortie.
- Devises acceptées : EUR, CHF, USD, GBP, JPY.
- **Date approximative** : `debut` contient le premier jour de la période et `precision_date` dit comment l'afficher :
  `jour` → « samedi 16 novembre 2026, 11 h 00 » ; `mois` → « mai 2027 » ; `saison` → « automne 2027 »
  (printemps = mars–mai, été = juin–août, automne = septembre–novembre, hiver = décembre–février).
  Les listes trient sur `debut` : « automne 2027 » se range au 1er septembre 2027.
- Fin du concert = début + durée prévue : c'est ce qu'utilise la règle de conflit, qui ignore les dates approximatives
  (elles ne peuvent de toute façon pas atteindre l'étape « confirmé »).

---

## 4. Écrans et leurs états

### 4.1 Liste — `/engagements`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Engagements                                          [ + Nouvel engagement ]  │ ← agent seulement
│                                                                              │
│ [Statut ▾ Tous]  [Musicien ▾ Tous]  [● À venir ○ Passés]  [🔍 lieu, ville…]  │ ← « Musicien » : agent seulement
│                                                                              │
│ Date            Lieu / ville              Musiciens         Statut     Cachet │
│ ─────────────────────────────────────────────────────────────────────────── │
│ 14 nov. 20 h    Salle Cortot, Paris       A. Petit (piano)  confirmé  2 000 € │
│ 16 nov. 11 h    Victoria Hall, Genève     A. Petit, L. Roy  option    3 500 CHF│
│ 02 déc. 19 h    Festival de Menton        L. Roy (violon)   demande       —   │
└──────────────────────────────────────────────────────────────────────────────┘
```

| État | Ce qu'on voit |
|---|---|
| Chargement | Le cadre et les filtres, avec des lignes grisées à la place des engagements |
| Vide (aucun engagement) | « Aucun engagement pour l'instant. » + bouton « Nouvel engagement » (agent) |
| Vide (filtres sans résultat) | « Aucun engagement ne correspond à ces filtres. » + bouton « Effacer les filtres » |
| Données | Le tableau, trié par date ; une ligne cliquable ouvre la fiche |
| Erreur | « Impossible de charger les engagements. » + bouton « Réessayer » |

Les filtres sont dans l'adresse (`/engagements?statut=option&periode=passes`) : une liste filtrée peut être rechargée ou partagée.

### 4.2 Fiche — `/engagements/[id]`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Engagements                                                                │
│ Récital piano-violon — Victoria Hall, Genève                    [ option ]    │
│                                                                              │
│ Date        samedi 16 novembre 2026, 11 h 00 (durée 1 h 30)                   │
│ Lieu        Victoria Hall, rue du Général-Dufour 14, Genève (Suisse)          │
│ Programmateur  Claire Fontaine — Saison musicale de Genève                    │
│ Musiciens   Anna Petit (piano), Louis Roy (violon)                            │
│ Cachet      3 500 CHF                                                         │
│ Programme   Fauré, Sonate n° 1 ; Ravel, Sonate n° 2                           │
│ Notes       …                                                                 │
│                                                                              │
│ [ Envoyer le contrat ]  [ Modifier ]  [ Annuler l'engagement ]               │ ← agent seulement,
└──────────────────────────────────────────────────────────────────────────────┘   selon le statut
```

| État | Ce qu'on voit |
|---|---|
| Chargement | Le cadre avec des lignes grisées |
| Données | La fiche ; l'agent voit les seules actions permises par le statut actuel ; le musicien ne voit aucun bouton |
| Introuvable | « Engagement introuvable. » — aussi pour un musicien qui n'en fait pas partie (refus journalisé) |
| Erreur | « Impossible de charger cet engagement. » + « Réessayer » |
| Après une action | Message visible : « Contrat envoyé. » ; ou refus expliqué : « Confirmation impossible : Louis Roy joue à Paris le 15/11 à 22 h, trop peu de temps pour rejoindre Genève (trajet estimé 7 h + 1 h de marge). » |

### 4.3 Formulaire — `/engagements/nouveau` et `/engagements/[id]/modifier` (agent seulement)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Nouvel engagement                                                            │
│ Titre court      [ Récital piano-violon ]                                     │
│ Date             (● précise ○ mois ○ saison)                                  │
│                  [ 16/11/2026 ] [ 11:00 ]     Durée prévue [ 90 ] min         │
│ Lieu             [ Victoria Hall, Genève      ▾ ]  ( + nouveau lieu )         │
│ Programmateur    [ Claire Fontaine            ▾ ]                             │
│ Musiciens        [x] Anna Petit (piano)  [x] Louis Roy (violon)  [ ] …        │
│ Cachet           [ 3500 ] [ CHF ▾ ]   (EUR, CHF, USD, GBP, JPY)               │
│ Programme        [ ………………………………………… ]                                         │
│ Notes            [ ………………………………………… ]                                         │
│                                      [ Annuler ]  [ Enregistrer ]             │
└──────────────────────────────────────────────────────────────────────────────┘
```

| État | Ce qu'on voit |
|---|---|
| Saisie | Les champs ; en modification, pré-remplis |
| Envoi en cours | Bouton « Enregistrement… » désactivé |
| Erreurs | Message sous chaque champ fautif (date manquante, aucun musicien, plus de 2 musiciens, cachet négatif, centimes en yens…) |
| Réussite | Retour à la fiche avec le message « Engagement créé. » / « Engagement modifié. » |

Un nouvel engagement commence toujours au statut « demande ».

---

## 5. Droits, en résumé

| Action | Agent | Musicien |
|---|---|---|
| Voir la liste | tous les engagements | les siens seulement |
| Voir une fiche | toutes | les siennes ; sinon « introuvable » + journal |
| Créer, modifier, changer le statut | oui | non (boutons absents **et** refus côté serveur) |
| Filtrer par musicien | oui | non (filtre absent) |
| Coordonnées du programmateur (e-mail, téléphone) | oui | non : nom et structure seulement (l'agent gère la relation) |

---

## 6. Décisions prises (12/10/2026)

1. Le musicien **voit le cachet de ses propres engagements** seulement (jamais celui des autres, qu'il ne voit pas).
2. Devises : EUR, CHF, USD, GBP **et JPY**.
3. **Au moins un musicien** dès la création. Date approximative (mois ou saison) permise au stade « demande »,
   date précise exigée pour poser une option. Lieu obligatoire dès la création.
4. **Titre court** facultatif.
5. Le musicien voit le **nom et la structure** du programmateur, mais **pas ses coordonnées** : c'est l'agent qui gère
   la relation avec les programmateurs.
6. Concert **bénévole** (décidé le 12/10/2026, étape D) : cachet de 0 accepté pour envoyer le contrat ; « joué » est
   l'étape finale (ni facture ni encaissement). Défraiements : plus tard.
7. **Rétablir** (décidé le 11/10/2026, étape D2b) : un engagement annulé par erreur peut être rétabli tant que sa date
   n'est pas passée ; s'il était confirmé, il revient à « contrat envoyé ». Remplace « annuler et recréer ».

---

## 7. Étape E — géocodage des lieux (cadrage validé le 11/10/2026)

**Constats**
- Le géocodage data.gouv (service de l'IGN, `https://data.geopf.fr/geocodage/search`) ne couvre que la **France** ;
  4 lieux du jeu de données sont à l'étranger (Genève, Zurich, Londres, Tokyo).
- On cherche par **adresse + ville**, jamais par nom de salle : « salle cortot paris » renvoie « Rue Cortot 75018 ».

**Ce qu'on veut**
1. Chaque lieu a une latitude et une longitude (nécessaires à la règle de conflit, étape F).
2. Dans le formulaire d'engagement, « + nouveau lieu » ouvre une fenêtre ; la saisie en cours est conservée.
3. Lieu en **France** : l'agent tape adresse et ville, « Chercher » ; le serveur interroge l'API et propose au plus
   5 résultats ; l'agent en **choisit** un (jamais de prise automatique du premier).
4. Lieu à **l'étranger** : l'agent saisit latitude et longitude (copiées d'une carte).
5. **Pas de lieu sans coordonnées** (colonnes rendues obligatoires). API indisponible → « Service de géocodage
   indisponible, réessayez », rien n'est créé.
6. Même nom (majuscules et espaces en trop ignorés) **et** même ville comparée sans chiffres (« 75013 Paris » =
   « Paris 75013 ») **ou** position à moins de 100 m d'un lieu existant → refusé (« existe déjà »). Deux salles
   de noms différents à la même adresse restent permises (révisé le 12/10/2026 : la ville en texte exact laissait
   passer « Salle Colonne, Paris 75013 » et « salle colonne, 75013 Paris »).
7. Le lieu créé est sélectionné dans la liste déroulante.
8. Appel **côté serveur**, délai limité à 5 s, chaque appel et chaque échec journalisés.
9. Jeu de données : **coordonnées fixes**, obtenues une fois ; le chargement ne dépend d'aucun service extérieur.
10. Créer un lieu : agent seulement (`verifierAdmin()`).
11. Pays choisi dans une **liste fermée** (France, Suisse, Royaume-Uni, Japon) : ceux dont on connaît le fuseau
    horaire. Un pays inconnu recevrait l'heure de Paris sans avertissement (décidé le 12/10/2026).

**Hors périmètre** : page de gestion des lieux (modifier, supprimer) ; géocodage étranger par une autre API ;
calcul de distance (étape F) ; jours fériés et Frankfurter (étape à part).

**Tranches**

| Tranche | Contenu | Preuve |
|---|---|---|
| E1 | `src/lib/geocodage.ts` : appel à l'API, réponse vérifiée par zod | Tests avec réponses simulées (normal, aucun résultat, mal formé, délai dépassé) |
| E2 | Coordonnées fixes des 12 lieux ; migration `latitude`/`longitude` obligatoires | Prévisualisation verte, coordonnées présentes dans la base |
| E3 | Action `creerLieu` + fenêtre « + nouveau lieu » | Gestes sur la prévisualisation : lieu français choisi, lieu étranger saisi, doublon refusé, Louis refusé |

---

## 8. Étape F — règle de conflit d’agenda (cadrage validé le 12/10/2026 ; marge ramenée de 4 h à 1 h)

**Ce qu'on veut**
1. Au moment de **confirmer**, le serveur relit en base les autres engagements de chaque musicien concerné.
2. Un autre engagement **compte** s'il est confirmé, joué, facturé ou payé (un engagement tenu). Demande, option et
   contrat envoyé ne comptent **pas** : deux options sur la même date sont la vie normale d'une agence, la première
   confirmée l'emporte. Annulé : ignoré.
3. Les deux sens sont vérifiés : le concert **d'avant** doit laisser le temps de venir, et le concert **d'après**
   le temps de repartir. Délai exigé = fin du premier → début du second ≥ trajet estimé + 1 h.
4. Trajet estimé = distance à vol d'oiseau (formule de haversine, sur les coordonnées des lieux) × 1,3 ÷ 80 km/h.
   Même lieu → trajet 0, mais 1 h exigée quand même. Concerts qui se chevauchent → conflit.
5. Égalité exacte (délai disponible = délai exigé) → **permis**.
6. Duo : chaque musicien est vérifié ; il suffit d'un conflit pour refuser. Le message cite **tous** les conflits trouvés.
7. Message de refus (maquette 4.2) : « Confirmation impossible : Louis Roy joue à Paris le 15/11 à 22 h, trop peu de
   temps pour rejoindre Genève (trajet estimé 7 h + 1 h de marge). » Heures affichées à l'heure locale du lieu,
   trajet arrondi au quart d'heure supérieur.
8. Les trois valeurs (1,3 ; 80 km/h ; 1 h) sont des constantes nommées dans un seul fichier, `src/lib/conflit.ts`.
9. Chaque refus est journalisé (déjà fait par `changerStatut`).
10. Le jeu de données reçoit les cas du SPEC : le cas piégé (22 h, puis 11 h le lendemain à 800 km) et un duo dont un
    musicien est pris, tous deux au statut « contrat envoyé », prêts à être confirmés en démonstration.

**Limite connue (constatée le 12/10/2026)** : la formule (× 1,3 ÷ 80 km/h) suppose la voiture. Juste en dessous
de 150 km environ, elle est trop pessimiste au-delà : Paris–Lyon estimé 6 h 20 contre environ 3 h 30 en TGV ;
Londres–Genève 12 h 10 contre environ 5 h en avion. Gardée volontairement : elle se trompe dans le sens sûr, et le
vrai obstacle du cas piégé est la nuit (aucun train ni avion entre 23 h et 6 h), qu'une vitesse plus haute ferait
disparaître. **Décidé** : plus tard, « confirmer quand même » — l'agent passe outre un refus en écrivant une raison
(ex. « TGV de 7 h 04 »), conservée sur l'engagement et journalisée. Après G si le temps le permet, sinon semaine 2.

**Pas de contournement** : la modification est verrouillée dès « confirmé » (D4a) et rétablir ramène à
« contrat envoyé » (D2b) ; la seule porte vers « confirmé » est donc la transition « confirmer ».

**Hors périmètre**
- Deux confirmations lancées **à la même seconde** pour le même musicien (une seule personne confirme : l'agent).
- Avertir dès la pose d'une option (seule la confirmation est contrôlée).
- Vrai temps de trajet par la route ou le train, fuseaux du voyage, décalage horaire du musicien.
- Règle 3 du SPEC (durée du programme).

**Tranches**

| Tranche | Contenu | Preuve |
|---|---|---|
| F1 | `src/lib/conflit.ts` : distance, trajet, recherche des conflits (fonction pure, sans base) | Tests : cas normal (une semaine), vide, piégé (13 h + 1 h > 13 h), même lieu, chevauchement, égalité exacte, concert d'après, annulé et option ignorés, duo |
| F2 | Branchement dans `changerStatut` (lecture des engagements tenus des musiciens) et message de refus | Build, lint, tests verts |
| F3 | Cas de conflit ajoutés au jeu de données | Gestes sur la prévisualisation : cas piégé refusé avec le bon message, duo refusé, cas normal confirmé, Louis toujours sans bouton |

---

## 9. Étape F4 — avertir dès l'option (cadrage validé le 12/10/2026)

**Ce qu'on veut**
1. Sur la fiche d'un engagement en **option** ou **contrat envoyé**, l'agent voit un **avertissement** si la confirmation
   serait refusée aujourd'hui : « Attention : Louis Roy joue à Londres le 20/11 à 19 h 30, trop peu de temps pour
   rejoindre Genève (trajet estimé 12 h 15 + 1 h de marge). La confirmation sera refusée. »
2. Même calcul que la confirmation (`trouverConflits`, engagements tenus seulement) : l'avertissement et le refus ne
   peuvent pas se contredire.
3. Rien n'est bloqué : poser l'option et envoyer le contrat restent permis.
4. Calculé à chaque affichage de la fiche : si l'autre concert est annulé, l'avertissement disparaît.
5. Agent seulement : le musicien ne le voit pas (il ne gère pas l'agenda).
6. Pas d'avertissement en « demande » (la date peut être approximative) ni à partir de « confirmé ».

**Hors périmètre** : avertissement dans la liste ; signaler les **autres options** concurrentes (non tenues) du
musicien (à revoir plus tard, décidé le 12/10/2026) ; avertir dans le formulaire de création ou de modification.

**Tranche unique** : lecture de l'agenda (déjà écrite pour F2) appelée par la fiche ; texte d'avertissement tiré du
message de refus. Preuve : tests du texte ; gestes sur la prévisualisation (duo Genève 21/11 et Menton 05/12 avertis,
Lyon 12/12 sans avertissement, Louis ne voit rien, option posée sur un engagement trop proche → averti).

---

## 10. Étape G — pièces jointes (cadrage validé le 12/10/2026)

**Ce qu'on veut**
1. L'agent joint un fichier à un **engagement**, avec un type : contrat, fiche technique ou autre. Les fiches
   techniques des salles sont jointes à l'engagement, pas au lieu (décidé : une seule règle de droits).
2. **PDF seulement**, **4 Mo** au plus (une requête vers le serveur Vercel ne dépasse pas 4,5 Mo). Le PDF est aussi
   le format que la recherche de la semaine 3 saura citer à la page.
3. Fichiers rangés dans un stockage **Vercel Blob privé** (`access: 'private'`) : aucune adresse publique. On les
   ouvre par `/engagements/[id]/pieces/[pieceId]`, qui revérifie les droits à chaque ouverture : l'agent, ou un
   musicien de l'engagement. Sinon page « introuvable » et refus journalisé (comme la fiche).
4. Ajout permis **à tout statut** (le contrat signé arrive après « confirmé »).
5. Table `pieces_jointes` : engagement, type, nom du fichier, taille, chemin dans le stockage, ajoutée par, date.
6. Le musicien voit et télécharge les pièces de ses engagements ; il n'ajoute ni ne supprime rien.
7. L'agent peut **supprimer** une pièce, à tout statut, après confirmation ; le fichier est effacé du stockage ;
   journalisé.
8. Refus expliqués sous le champ : pas un PDF (contenu vérifié, pas seulement l'extension), trop lourd, vide,
   type absent.
9. États : vide (« Aucune pièce jointe »), chargement (« Envoi en cours… »), données (type, nom, taille, date),
   erreur (message).
10. Chaque ajout, suppression et refus laisse une ligne dans les journaux.

**Hors périmètre** : glisser-déposer, aperçu dans la page, plusieurs fichiers d'un coup, versions successives d'un
contrat, fiches techniques rattachées au lieu.

**Tranches**

| Tranche | Contenu | Preuve |
|---|---|---|
| G1 | Règle de vérification (type, taille, signature PDF `%PDF-`, fichier vide), fonction pure | Tests |
| G2 | Stockage privé créé par l'humain dans Vercel (guidé) ; table `pieces_jointes` et migration | Migration jouée en prévisualisation |
| G3 | Ajout d'une pièce et liste sur la fiche | Gestes : PDF ajouté, faux PDF et fichier trop lourd refusés, Louis voit sans bouton |
| G4 | Ouverture protégée et suppression | Gestes : Louis ouvre sa pièce, pas celle d'Anna (« introuvable ») ; suppression confirmée |
