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
- Engagement annulé ou passé → ignoré par la règle de conflit.

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
| Poser une option | demande → option | agent | date **précise** et heure renseignées (plus de date approximative) |
| Envoyer le contrat | option → contrat envoyé | agent | cachet renseigné (0 accepté : concert bénévole) |
| Confirmer | contrat envoyé → confirmé | agent | **règle de conflit** : aucun musicien de l'engagement n'a de concert trop proche |
| Marquer joué | confirmé → joué | agent | la date du concert est passée |
| Facturer | joué → facturé | agent | cachet supérieur à 0 |
| Encaisser | facturé → payé | agent | — |
| Annuler | demande, option, contrat envoyé ou confirmé → annulé | agent | pas encore joué |

- Aucun retour en arrière (sauf annulation) : une erreur de statut se corrige en annulant et en recréant.
- Le musicien ne déclenche aucune transition (décision du SPEC : consultation seule).
- Un statut final (payé, annulé, et joué pour un concert bénévole) ne change plus.

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
| `engagements` | titre court (facultatif), début, précision de la date (`jour`, `mois` ou `saison`), durée prévue (minutes), lieu, programmateur, statut, cachet (en **plus petite unité de la devise**), devise, programme (texte), notes, dates de création et de modification |
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
| Après une action | Message visible : « Contrat envoyé. » ; ou refus expliqué : « Confirmation impossible : Louis Roy joue à Paris le 15/11 à 22 h, trop peu de temps pour rejoindre Genève (trajet estimé 7 h + 4 h de marge). » |

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
