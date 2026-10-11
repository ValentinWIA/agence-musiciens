# Cadrage — les engagements

Document de cadrage de l'objet principal, écrit **avant tout code** (étapes 1 et 2 de la boucle de la fiche).
Il sert aussi de rendu du vendredi : spécification, cycle de vie, maquette des écrans et de leurs états.

---

## 1. Ce qu'on veut, en dix lignes

1. Un **engagement** est un concert proposé par un programmateur, à une date et dans un lieu, pour un ou deux musiciens de l'agence.
2. L'agent crée l'engagement dès la première demande, puis le fait avancer d'étape en étape jusqu'au paiement du cachet.
3. Chaque étape est un **statut** ; seules certaines transitions sont permises, et seul l'agent les déclenche.
4. L'agent voit tous les engagements ; un musicien ne voit **que les siens**, en lecture seule — vérifié côté serveur.
5. La liste se filtre par statut, par musicien (agent seulement), par période (à venir / passés) et par texte (lieu, ville).
6. La fiche d'un engagement montre tout ce qu'on sait : date, horaire, durée, lieu, programmateur, musiciens, cachet, programme, notes.
7. **Règle métier** : un engagement ne peut pas être **confirmé** si l'un de ses musiciens a déjà un engagement trop proche,
   compte tenu de la distance entre les lieux (règle détaillée dans `SPEC.md`).
8. Un duo n'est confirmable que si **les deux** musiciens sont libres.
9. Chaque action (création, modification, changement de statut, refus) laisse une ligne dans les journaux.
10. Chaque écran a ses quatre états : vide, chargement, données, erreur ; chaque action donne un retour visible.

**Cas limites retenus**
- Concert qui finit tard (22 h) et suivant le lendemain matin loin (800 km) → conflit, confirmation refusée.
- Engagement sans cachet (encore inconnu à l'étape « demande ») → autorisé jusqu'à « contrat envoyé », obligatoire ensuite.
- Cachet en devise étrangère (CHF, USD) → enregistré tel quel, avec sa devise.
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
| Poser une option | demande → option | agent | date, lieu et au moins un musicien renseignés |
| Envoyer le contrat | option → contrat envoyé | agent | cachet renseigné |
| Confirmer | contrat envoyé → confirmé | agent | **règle de conflit** : aucun musicien de l'engagement n'a de concert trop proche |
| Marquer joué | confirmé → joué | agent | la date du concert est passée |
| Facturer | joué → facturé | agent | — |
| Encaisser | facturé → payé | agent | — |
| Annuler | demande, option, contrat envoyé ou confirmé → annulé | agent | pas encore joué |

- Aucun retour en arrière (sauf annulation) : une erreur de statut se corrige en annulant et en recréant.
- Le musicien ne déclenche aucune transition (décision du SPEC : consultation seule).
- Un statut final (payé, annulé) ne change plus.

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
| `engagements` | date et heure de début, durée prévue (minutes), lieu, programmateur, statut, cachet (en **centimes**), devise, programme (texte), notes, dates de création et de modification |
| `engagement_musiciens` | engagement, musicien |

- Le cachet est stocké en **centimes entiers** (2 000,00 € → `200000`) : les nombres à virgule de l'ordinateur font des
  erreurs d'arrondi, inacceptables pour de l'argent.
- Devises acceptées : EUR, CHF, USD, GBP.
- Fin du concert = début + durée prévue : c'est ce qu'utilise la règle de conflit.

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
│ Date et heure    [ 16/11/2026 ] [ 11:00 ]     Durée prévue [ 90 ] min         │
│ Lieu             [ Victoria Hall, Genève      ▾ ]  ( + nouveau lieu )         │
│ Programmateur    [ Claire Fontaine            ▾ ]                             │
│ Musiciens        [x] Anna Petit (piano)  [x] Louis Roy (violon)  [ ] …        │
│ Cachet           [ 3500 ] [ CHF ▾ ]                                           │
│ Programme        [ ………………………………………… ]                                         │
│ Notes            [ ………………………………………… ]                                         │
│                                      [ Annuler ]  [ Enregistrer ]             │
└──────────────────────────────────────────────────────────────────────────────┘
```

| État | Ce qu'on voit |
|---|---|
| Saisie | Les champs ; en modification, pré-remplis |
| Envoi en cours | Bouton « Enregistrement… » désactivé |
| Erreurs | Message sous chaque champ fautif (date manquante, aucun musicien, plus de 2 musiciens, cachet négatif…) |
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

---

## 6. Questions à trancher avant de coder

1. **Le musicien voit-il le cachet** de ses propres engagements ? *(Proposition : oui.)*
2. **Devises** : EUR, CHF, USD, GBP suffisent-elles ?
3. **Un engagement « demande » peut-il n'avoir ni date ni musicien** (simple prise de contact) ?
   *(Proposition : date et lieu obligatoires dès la création, musiciens obligatoires pour poser une option.)*
4. **Faut-il un titre** à l'engagement (« Récital piano-violon ») en plus du lieu ? *(Proposition : oui, court et facultatif.)*
